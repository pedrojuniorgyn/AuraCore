# Runbook: Performance Monitoring - Notifications Table

**Criado:** 2026-01-23  
**Autor:** Claude Agent  
**Épico:** P1.B.1 - Performance Improvements  
**Migration:** 0039_notifications_performance_indexes.sql

---

## 📊 Métricas de Baseline (Pós-Índices)

| Métrica | Valor Esperado | Threshold Alerta | Threshold Crítico |
|---------|----------------|------------------|-------------------|
| **Logical Reads** | < 50 | > 100 | > 500 |
| **CPU Time** | < 10ms | > 50ms | > 200ms |
| **Elapsed Time** | < 10ms | > 50ms | > 200ms |
| **Index Fragmentation** | < 10% | > 30% | > 50% |
| **Missing Indexes** | 0 | > 0 | > 2 |
| **Table Scans/sec** | 0 | > 1 | > 10 |

---

## 🔍 Queries de Monitoramento

### 1. Verificar Uso de Índices

```sql
-- Executar no SSMS ou Azure Data Studio
SELECT 
    i.name AS IndexName,
    us.user_seeks AS Seeks,
    us.user_scans AS Scans,
    us.user_lookups AS Lookups,
    us.user_updates AS Updates,
    us.last_user_seek AS LastSeek,
    us.last_user_scan AS LastScan,
    CASE 
        WHEN us.user_seeks = 0 AND us.user_scans = 0 THEN '❌ UNUSED'
        WHEN us.user_seeks > us.user_scans THEN '✅ OPTIMAL (Seeks > Scans)'
        ELSE '⚠️ WARNING (Scans > Seeks)'
    END AS Status
FROM sys.dm_db_index_usage_stats us
INNER JOIN sys.indexes i 
    ON us.object_id = i.object_id 
    AND us.index_id = i.index_id
WHERE us.database_id = DB_ID()
  AND us.object_id = OBJECT_ID('notifications')
  AND i.name LIKE 'idx_notifications_%'
ORDER BY us.user_seeks DESC;
```

**Interpretação:**
- ✅ **Seeks > Scans**: Índice eficiente (Index Seek)
- ⚠️ **Scans > Seeks**: Índice pode não estar sendo usado corretamente
- ❌ **Seeks = 0 AND Scans = 0**: Índice não usado (pode remover)

---

### 2. Detectar Missing Indexes

```sql
-- SQL Server sugere índices faltantes
SELECT TOP 10
    CAST(migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) AS DECIMAL(10,2)) AS ImprovementMeasure,
    migs.last_user_seek AS LastSeek,
    'CREATE INDEX idx_missing_' + CAST(NEWID() AS VARCHAR(36)) + ' ON ' + 
    OBJECT_NAME(mid.object_id) + 
    ' (' + ISNULL(mid.equality_columns, '') + 
    CASE WHEN mid.inequality_columns IS NOT NULL THEN ',' + mid.inequality_columns ELSE '' END + ')' +
    CASE WHEN mid.included_columns IS NOT NULL THEN ' INCLUDE (' + mid.included_columns + ')' ELSE '' END AS CreateIndexStatement
FROM sys.dm_db_missing_index_groups mig
INNER JOIN sys.dm_db_missing_index_group_stats migs 
    ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details mid 
    ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID()
  AND OBJECT_NAME(mid.object_id) = 'notifications'
ORDER BY ImprovementMeasure DESC;
```

**Interpretação:**
- **ImprovementMeasure > 100**: Considerar criar índice
- **ImprovementMeasure > 1000**: Criar índice URGENTE
- **0 resultados**: ✅ Todos índices necessários criados

---

### 3. Monitorar Fragmentação

```sql
-- Fragmentação de índices
SELECT 
    i.name AS IndexName,
    ips.avg_fragmentation_in_percent AS FragmentationPercent,
    ips.page_count AS PageCount,
    CAST(ips.page_count * 8 / 1024.0 AS DECIMAL(10,2)) AS SizeInMB,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 THEN '🔴 REBUILD (ALTER INDEX ' + i.name + ' ON notifications REBUILD)'
        WHEN ips.avg_fragmentation_in_percent > 10 THEN '🟡 REORGANIZE (ALTER INDEX ' + i.name + ' ON notifications REORGANIZE)'
        ELSE '✅ OK'
    END AS ActionNeeded
FROM sys.dm_db_index_physical_stats(
    DB_ID(), 
    OBJECT_ID('notifications'), 
    NULL, 
    NULL, 
    'DETAILED'
) AS ips
INNER JOIN sys.indexes AS i 
    ON ips.object_id = i.object_id 
    AND ips.index_id = i.index_id
WHERE i.name LIKE 'idx_notifications_%'
ORDER BY ips.avg_fragmentation_in_percent DESC;
```

**Interpretação:**
- **< 10%**: ✅ OK, nenhuma ação
- **10-30%**: 🟡 REORGANIZE (online, sem lock)
- **> 30%**: 🔴 REBUILD (offline breve ou online com ONLINE=ON)

---

### 4. Performance da Query Principal

```sql
-- Testar query da API com STATISTICS
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

DECLARE @userId NVARCHAR(255) = 'user-example'; -- Substituir por userId real
DECLARE @organizationId INT = 1;                -- Substituir por orgId real

SELECT TOP 10
    id, type, event, title, message, data, 
    action_url, is_read, read_at, created_at
FROM notifications
WHERE user_id = @userId
  AND organization_id = @organizationId
  AND deleted_at IS NULL
ORDER BY created_at DESC;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
```

**Métricas esperadas (com índices):**
```
Table 'notifications'. Scan count 1, logical reads 5-20, ...
Index Seek (idx_notifications_user_coverage) ✅
CPU time = 1-10 ms, elapsed time = 1-10 ms
```

**⚠️ Alerta se:**
- **logical reads > 100**: Índice não está sendo usado
- **Table Scan** no execution plan: Índice ignorado
- **CPU time > 50ms**: Performance degradada

---

## 🛠️ Manutenção Regular

### Diária (Automática via SQL Agent Job)

```sql
-- Job: Update Statistics - Notifications
USE [AuraCore];
GO

UPDATE STATISTICS [notifications] 
    [idx_notifications_user_coverage] 
    WITH FULLSCAN;

UPDATE STATISTICS [notifications] 
    [idx_notifications_unread] 
    WITH FULLSCAN;

PRINT 'Estatísticas atualizadas: notifications';
```

### Semanal (Manual ou Automática)

1. **Verificar fragmentação** (query #3 acima)
2. **REORGANIZE** se fragmentação > 10%

```sql
-- Executar apenas se fragmentação > 10%
ALTER INDEX [idx_notifications_user_coverage] 
ON [notifications] 
REORGANIZE WITH (LOB_COMPACTION = ON);

ALTER INDEX [idx_notifications_unread] 
ON [notifications] 
REORGANIZE WITH (LOB_COMPACTION = ON);
```

### Mensal (Manual)

1. **REBUILD** se fragmentação > 30%

```sql
-- Executar apenas se fragmentação > 30%
-- CUIDADO: REBUILD causa lock breve (usar ONLINE = ON em Enterprise Edition)
ALTER INDEX [idx_notifications_user_coverage] 
ON [notifications] 
REBUILD WITH (ONLINE = ON, FILLFACTOR = 90);

ALTER INDEX [idx_notifications_unread] 
ON [notifications] 
REBUILD WITH (ONLINE = ON, FILLFACTOR = 95);
```

2. **Revisar missing indexes** (query #2 acima)

---

## 🚨 Troubleshooting

### Problema: Performance Degradada

**Sintomas:**
- Query time > 50ms
- Logical reads > 100
- CPU time alto

**Diagnóstico:**
1. Verificar uso de índices (query #1)
   - ✅ Se `user_seeks > 0`: Índice usado
   - ❌ Se `user_seeks = 0`: Índice ignorado

2. Verificar fragmentação (query #3)
   - Se > 30%: REBUILD índice

3. Verificar execution plan (CTRL+M no SSMS)
   - ✅ Esperado: `Index Seek (idx_notifications_user_coverage)`
   - ❌ Problema: `Table Scan` ou `Index Scan`

**Soluções:**
```sql
-- Solução 1: Atualizar estatísticas
UPDATE STATISTICS [notifications] WITH FULLSCAN;

-- Solução 2: Limpar cache (força recompilação)
DBCC FREEPROCCACHE;

-- Solução 3: REBUILD índice fragmentado
ALTER INDEX [idx_notifications_user_coverage] 
ON [notifications] 
REBUILD WITH (ONLINE = ON);
```

---

### Problema: Índice Não Usado

**Sintomas:**
- Execution plan mostra `Table Scan`
- `user_seeks = 0` no sys.dm_db_index_usage_stats

**Diagnóstico:**
1. Query usa exatamente as colunas do índice?
   - ✅ WHERE userId = X AND organizationId = Y
   - ❌ WHERE userId = X OR organizationId = Y (OR quebra índice)

2. Estatísticas desatualizadas?
   ```sql
   DBCC SHOW_STATISTICS ('notifications', 'idx_notifications_user_coverage');
   ```

3. Parameter sniffing?
   - Query plan compilado com parâmetros diferentes

**Soluções:**
```sql
-- Solução 1: Forçar uso do índice (hint)
SELECT TOP 10 * 
FROM notifications WITH (INDEX(idx_notifications_user_coverage))
WHERE user_id = @userId AND organization_id = @organizationId
ORDER BY created_at DESC;

-- Solução 2: OPTION (RECOMPILE) - força novo plano
SELECT TOP 10 * 
FROM notifications
WHERE user_id = @userId AND organization_id = @organizationId
ORDER BY created_at DESC
OPTION (RECOMPILE);

-- Solução 3: Atualizar estatísticas
UPDATE STATISTICS [notifications] WITH FULLSCAN;
```

---

### Problema: Tabela Cresceu Muito (> 1M registros)

**Sintomas:**
- Índices > 100MB
- Logical reads aumentando progressivamente
- Fragmentação alta (> 30%)

**Diagnóstico:**
```sql
-- Tamanho da tabela e índices
SELECT 
    i.name AS IndexName,
    CAST(SUM(ps.used_page_count) * 8 / 1024.0 AS DECIMAL(10,2)) AS SizeInMB,
    SUM(ps.row_count) AS RowCount
FROM sys.dm_db_partition_stats ps
INNER JOIN sys.indexes i ON ps.object_id = i.object_id AND ps.index_id = i.index_id
WHERE ps.object_id = OBJECT_ID('notifications')
GROUP BY i.name
ORDER BY SizeInMB DESC;
```

**Soluções:**
1. **Purge de dados antigos** (se aplicável)
   ```sql
   -- Deletar notifications > 90 dias (soft delete)
   UPDATE notifications
   SET deleted_at = GETDATE()
   WHERE created_at < DATEADD(DAY, -90, GETDATE())
     AND deleted_at IS NULL;
   ```

2. **Purge físico** (executar fora do horário de pico)
   ```sql
   -- Deletar fisicamente notifications deletadas > 1 ano
   DELETE FROM notifications
   WHERE deleted_at < DATEADD(YEAR, -1, GETDATE());
   ```

3. **Particionamento** (se > 10M registros)
   - Particionar por `created_at` (mensal ou anual)
   - Requer SQL Server Enterprise Edition

---

## 📈 Alertas e Monitoramento

### Alertas Recomendados

| Alerta | Condição | Severidade | Ação |
|--------|----------|------------|------|
| High Query Time | Avg query > 50ms por 5min | WARNING | Verificar execution plan |
| High Logical Reads | Avg reads > 100 por 5min | WARNING | Atualizar estatísticas |
| Index Not Used | user_seeks = 0 por 1 dia | WARNING | Revisar query ou remover índice |
| High Fragmentation | Fragmentation > 30% | INFO | REBUILD índice |
| Missing Index | improvement_measure > 1000 | WARNING | Analisar índice sugerido |
| Table Scan Detected | Table Scan no plan | CRITICAL | Forçar índice ou corrigir query |

### Integração com Monitoramento

**New Relic / Datadog:**
```sql
-- Query customizada para APM
SELECT 
    'notifications_performance' AS metric_name,
    AVG(CAST(qs.total_elapsed_time / qs.execution_count AS FLOAT)) / 1000.0 AS avg_duration_ms,
    SUM(qs.execution_count) AS total_executions,
    MAX(qs.last_elapsed_time) / 1000.0 AS last_duration_ms
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
WHERE st.text LIKE '%FROM notifications%'
  AND st.text LIKE '%user_id%'
  AND st.text LIKE '%organization_id%';
```

**Azure Monitor:**
- **Metric:** `sqlserver_performance_counters.index_searches_per_sec`
- **Resource:** `notifications table`
- **Alert:** `< 1 searches/sec` (índice não usado)

---

## 📝 Changelog

| Data | Versão | Mudança | Autor |
|------|--------|---------|-------|
| 2026-01-23 | 1.0.0 | Criação inicial com índices de performance | Claude Agent |

---

## 🔗 Referências

- **Migration:** `drizzle/migrations/0039_notifications_performance_indexes.sql`
- **Rollback:** `drizzle/migrations/0039_notifications_performance_indexes_down.sql`
- **Contrato:** `mcp-server/knowledge/contracts/sqlserver-performance-contract`
- **Épico:** P1.B.1 - Performance Improvements
- **ADR:** ADR-0006 (SQL Server Performance Optimization)
