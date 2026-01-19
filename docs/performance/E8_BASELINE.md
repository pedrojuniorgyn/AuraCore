# E8 - Performance Baseline

**Data:** 19/01/2026  
**Épico:** E8 - Performance & Observability  
**Status:** ✅ Baseline Documentado

---

## 📊 RESUMO EXECUTIVO

| Métrica | Valor | Status |
|---------|-------|--------|
| Query Store | ⏳ Pendente habilitação | AÇÃO NECESSÁRIA |
| Helper de Paginação | ✅ Existe e em uso | OK |
| Problemas `.slice()` | 6 arquivos | CORRIGIR em E8.3 |
| LIKE '%x%' problemático | 0 | OK |
| SQL interpolado | 5 arquivos (admin) | BAIXA PRIORIDADE |
| Índices tenant | ✅ Migrations criadas | EXECUTAR NO SQL |

---

## 🔧 QUERY STORE - CONFIGURAÇÃO

### Status Atual
**⏳ Pendente verificação no SQL Server**

### Comandos para Habilitar

Execute no container SQL Server (Coolify):

```sql
-- 1. Verificar se Query Store está habilitado
SELECT 
  name, 
  is_query_store_on,
  query_store_state_desc
FROM sys.databases 
WHERE name = 'AuraCore';

-- 2. Habilitar Query Store (se não estiver)
ALTER DATABASE AuraCore SET QUERY_STORE = ON;
ALTER DATABASE AuraCore SET QUERY_STORE (
  OPERATION_MODE = READ_WRITE,
  CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
  DATA_FLUSH_INTERVAL_SECONDS = 900,
  INTERVAL_LENGTH_MINUTES = 60,
  MAX_STORAGE_SIZE_MB = 1000,
  QUERY_CAPTURE_MODE = AUTO,
  SIZE_BASED_CLEANUP_MODE = AUTO
);

-- 3. Verificar configuração
SELECT * FROM sys.database_query_store_options;
```

### Queries de Análise (Executar após 24-48h de uso)

```sql
-- Top 20 queries por duração total (últimos 7 dias)
SELECT TOP 20
  q.query_id,
  SUBSTRING(qt.query_sql_text, 1, 200) AS query_text,
  SUM(rs.count_executions) AS total_executions,
  SUM(rs.avg_duration * rs.count_executions) / 1000 AS total_duration_ms,
  AVG(rs.avg_duration) / 1000 AS avg_duration_ms,
  MAX(rs.max_duration) / 1000 AS max_duration_ms
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE rs.last_execution_time > DATEADD(DAY, -7, GETUTCDATE())
GROUP BY q.query_id, qt.query_sql_text
ORDER BY total_duration_ms DESC;

-- Top 20 queries por CPU
SELECT TOP 20
  q.query_id,
  SUBSTRING(qt.query_sql_text, 1, 200) AS query_text,
  SUM(rs.avg_cpu_time * rs.count_executions) / 1000 AS total_cpu_ms,
  AVG(rs.avg_cpu_time) / 1000 AS avg_cpu_ms
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE rs.last_execution_time > DATEADD(DAY, -7, GETUTCDATE())
GROUP BY q.query_id, qt.query_sql_text
ORDER BY total_cpu_ms DESC;

-- Top 20 queries por leituras lógicas (I/O)
SELECT TOP 20
  q.query_id,
  SUBSTRING(qt.query_sql_text, 1, 200) AS query_text,
  SUM(rs.avg_logical_io_reads * rs.count_executions) AS total_reads,
  AVG(rs.avg_logical_io_reads) AS avg_reads
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE rs.last_execution_time > DATEADD(DAY, -7, GETUTCDATE())
GROUP BY q.query_id, qt.query_sql_text
ORDER BY total_reads DESC;
```

---

## ✅ HELPER DE PAGINAÇÃO

### Status: EXISTE E EM USO

**Localização:** `src/lib/db/query-helpers.ts`

### Helpers Disponíveis

| Função | Descrição | Uso |
|--------|-----------|-----|
| `queryPaginated<T>()` | Paginação SQL (OFFSET/FETCH) | Repositórios DDD |
| `queryWithLimit<T>()` | Limitar resultados | Queries simples |
| `queryFirst<T>()` | Primeiro resultado ou null | Busca única |

### Repositórios Utilizando queryPaginated (10)

1. `DrizzleActionPlanFollowUpRepository.ts`
2. `DrizzleActionPlanRepository.ts`
3. `DrizzleMovementRepository.ts`
4. `DrizzleLocationRepository.ts`
5. `DrizzleStockRepository.ts`
6. `DrizzleStrategicGoalRepository.ts`
7. `DrizzleIdeaBoxRepository.ts`
8. `DrizzleKPIRepository.ts`
9. `DrizzleStrategyRepository.ts`
10. `DrizzlePayableRepository.ts`

### Helpers de DB Auxiliares

**Localização:** `src/lib/db/helpers.ts`

| Função | Descrição |
|--------|-----------|
| `getDbRows<T>()` | Normaliza resultado de db.execute() |
| `getFirstRow<T>()` | Primeira row ou undefined |
| `getFirstRowOrThrow<T>()` | Primeira row ou throw |

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. `.slice()` para Paginação (VIOLA ADR-0006)

**Severidade:** ALTA  
**Quantidade:** 6 ocorrências problemáticas  
**Ação:** Corrigir em E8.3

| # | Arquivo | Linha | Descrição |
|---|---------|-------|-----------|
| 1 | `src/app/api/strategic/war-room/dashboard/route.ts` | 39 | `.filter().slice(0, 5)` - KPIs críticos |
| 2 | `src/app/api/strategic/war-room/dashboard/route.ts` | 52 | `.filter().slice(0, 5)` - KPIs alerta |
| 3 | `src/app/api/strategic/war-room/dashboard/route.ts` | 77 | `.filter().slice(0, 5)` - Planos atrasados |
| 4 | `src/app/api/admin/test-classification/route.ts` | 104 | `.slice(0, 10)` - Amostra NFes |
| 5 | `src/app/api/comercial/proposals/route.ts` | 44 | `.slice(0, 1)` - Última proposta |
| 6 | `src/app/api/tms/control-tower/route.ts` | 60 | `.slice(0, 10)` - Checkpoints |

### 2. LIKE '%x%' (Aceitáveis)

**Severidade:** BAIXA  
**Quantidade:** 5 ocorrências (todas em INFORMATION_SCHEMA)  
**Ação:** Nenhuma necessária

| # | Arquivo | Contexto |
|---|---------|----------|
| 1-4 | `admin/test-import-nfe/route.ts` | Query em sys.tables (metadata) |
| 5 | `financial/chart-accounts/suggest-code/route.ts` | `NOT LIKE '%.%'` (negação, usa índice) |

### 3. SQL Interpolado (Template Strings)

**Severidade:** MÉDIA  
**Quantidade:** 5 arquivos  
**Ação:** Baixa prioridade (rotas admin/dev)

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `src/app/api/admin/clean-fiscal-complete/route.ts` | Admin cleanup |
| 2 | `src/app/api/admin/clean-fiscal-tables/route.ts` | Admin cleanup |
| 3 | `src/app/api/admin/migrate-fiscal-data-v2/route.ts` | Migration script |
| 4 | `src/lib/db/helpers.ts` | Helper (usa sql``) |
| 5 | `src/app/api/reports/export/route.ts` | Export (usa sql``) |

**Nota:** Arquivos 4 e 5 usam `sql` tag template do Drizzle (parametrizado) - OK.

### 4. Índices Tenant

**Severidade:** CRÍTICA  
**Status:** ✅ Migrations criadas (0034, 0035, 0036, 0037)  
**Quantidade:** 35+ índices definidos  
**Ação:** Executar migrations no SQL Server  
**Documentação:** `docs/performance/E8.1_INDEX_AUDIT.md`

**Migrations de índices existentes:**
| Migration | Descrição | Índices |
|-----------|-----------|---------|
| `0034_add_tenant_indexes.sql` | Índices tenant principais | 23 tenant + 9 org + 3 status |
| `0035_strategic_module.sql` | Tabelas strategic_* | 10 índices |
| `0036_fix_tenant_indexes.sql` | Correções de índices | Fixes |
| `0037_add_branch_id_to_tables.sql` | branch_id + índices | 9 índices |

---

## 📈 MÉTRICAS DE REFERÊNCIA (BASELINE)

### Performance Esperada (Pós-Otimização)

| Operação | Atual (estimado) | Meta E8 |
|----------|------------------|---------|
| findMany com tenant | ~500ms | <50ms |
| Dashboard financeiro | ~2s | <500ms |
| Listagem paginada | ~800ms | <100ms |
| Busca por ID | ~50ms | <10ms |

### Contrato de Performance (SQLSERVER_PERFORMANCE_CONTRACT)

1. ✅ Paginação no banco (OFFSET/FETCH) - Helper existe
2. ⚠️ Evitar "select tudo + slice" - 6 violações identificadas
3. ✅ Evitar LIKE '%x%' sem estratégia - OK
4. ⏳ Usar Query Store - Pendente habilitação
5. ✅ Evitar SQL interpolado - Usa Drizzle sql``

---

## 📋 PRÓXIMOS PASSOS

### E8.2 - Índices ✅ MIGRATIONS CRIADAS
- [x] Migrations criadas: 0034, 0035, 0036, 0037
- [ ] **PENDENTE:** Executar migrations no SQL Server (Coolify)
- [ ] Validar com Query Store após execução
- [ ] Monitorar performance após criação

**Para executar no Coolify:**
```bash
# Conectar ao SQL Server container
sqlcmd -S localhost -U sa -P [password] -d AuraCore

# Executar migrations em ordem
:r drizzle/migrations/0034_add_tenant_indexes.sql
:r drizzle/migrations/0035_strategic_module.sql
:r drizzle/migrations/0036_fix_tenant_indexes.sql
:r drizzle/migrations/0037_add_branch_id_to_tables.sql
:r drizzle/migrations/0038_add_deleted_at_soft_delete.sql
```

### E8.3 - Corrigir Paginação
- [ ] Refatorar 6 arquivos com `.slice()`
- [ ] Usar `queryPaginated()` ou TOP/OFFSET no SQL

### E8.4 - SSRM (AG Grid)
- [ ] Implementar Server-Side Row Model em telas críticas
- [ ] Configurar paginação server-side

### E8.5 - Observabilidade
- [ ] Configurar métricas p95/p99 por endpoint
- [ ] Monitorar deadlocks/waits
- [ ] Dashboard de pool de conexões

---

## 🔗 REFERÊNCIAS

- **ADR-0006:** `docs/architecture/adr/0006-pagination-and-search-sqlserver.md`
- **Contrato Performance:** `docs/architecture/contracts/SQLSERVER_PERFORMANCE_CONTRACT.md`
- **Audit de Índices:** `docs/performance/E8.1_INDEX_AUDIT.md`
- **Helper Paginação:** `src/lib/db/query-helpers.ts`
- **Helper DB:** `src/lib/db/helpers.ts`

---

## 📊 HISTÓRICO

| Data | Ação | Responsável |
|------|------|-------------|
| 19/01/2026 | E8.2: Confirmado migrations existentes, atualizada documentação | E8.2 |
| 19/01/2026 | E8.1: Baseline documentado | E8.1 |
| 18/01/2026 | Audit de índices | E8.1 |

