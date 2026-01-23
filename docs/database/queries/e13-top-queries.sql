-- ============================================
-- E13 - Análise Query Store - Top Queries
-- ============================================
-- Data: 23/01/2026
-- Épico: E13 - Performance Optimization
-- Objetivo: Identificar queries lentas para otimização
--
-- IMPORTANTE: Executar APÓS 24-48h do Query Store habilitado

USE [auracore_db];
GO

-- ============================================
-- 1. TOP 20 POR DURAÇÃO MÉDIA
-- ============================================
PRINT '=== TOP 20 QUERIES POR DURAÇÃO MÉDIA ===';
PRINT '';

SELECT TOP 20
  q.query_id,
  SUBSTRING(qt.query_sql_text, 1, 200) AS query_preview,
  rs.avg_duration / 1000.0 AS avg_duration_ms,
  rs.max_duration / 1000.0 AS max_duration_ms,
  rs.avg_cpu_time / 1000.0 AS avg_cpu_ms,
  rs.avg_logical_io_reads AS avg_reads,
  rs.count_executions AS exec_count,
  rs.last_execution_time
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE rs.last_execution_time > DATEADD(DAY, -7, GETUTCDATE())
ORDER BY rs.avg_duration DESC;
GO

-- ============================================
-- 2. TOP 20 POR CPU
-- ============================================
PRINT '';
PRINT '=== TOP 20 QUERIES POR CPU ===';
PRINT '';

SELECT TOP 20
  q.query_id,
  SUBSTRING(qt.query_sql_text, 1, 200) AS query_preview,
  rs.avg_cpu_time / 1000.0 AS avg_cpu_ms,
  rs.total_cpu_time / 1000.0 AS total_cpu_ms,
  rs.count_executions AS exec_count
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE rs.last_execution_time > DATEADD(DAY, -7, GETUTCDATE())
ORDER BY rs.avg_cpu_time DESC;
GO

-- ============================================
-- 3. TOP 20 POR I/O (LOGICAL READS)
-- ============================================
PRINT '';
PRINT '=== TOP 20 QUERIES POR I/O ===';
PRINT '';

SELECT TOP 20
  q.query_id,
  SUBSTRING(qt.query_sql_text, 1, 200) AS query_preview,
  rs.avg_logical_io_reads AS avg_reads,
  rs.max_logical_io_reads AS max_reads,
  rs.count_executions AS exec_count
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE rs.last_execution_time > DATEADD(DAY, -7, GETUTCDATE())
ORDER BY rs.avg_logical_io_reads DESC;
GO

-- ============================================
-- 4. MISSING INDEXES (RECOMENDAÇÕES)
-- ============================================
PRINT '';
PRINT '=== MISSING INDEXES (RECOMENDAÇÕES DO SQL SERVER) ===';
PRINT '';

SELECT 
  ROUND(
    migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans),
    2
  ) AS improvement_score,
  OBJECT_NAME(mid.object_id) AS table_name,
  mid.equality_columns,
  mid.inequality_columns,
  mid.included_columns,
  migs.user_seeks,
  migs.user_scans,
  ROUND(migs.avg_total_user_cost, 2) AS avg_cost,
  ROUND(migs.avg_user_impact, 2) AS avg_impact_pct
FROM sys.dm_db_missing_index_group_stats AS migs
INNER JOIN sys.dm_db_missing_index_groups AS mig 
  ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details AS mid 
  ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY improvement_score DESC;
GO

-- ============================================
-- 5. ÍNDICES EXISTENTES (VERIFICAÇÃO)
-- ============================================
PRINT '';
PRINT '=== ÍNDICES EXISTENTES ===';
PRINT '';

SELECT 
  t.name AS table_name,
  i.name AS index_name,
  i.type_desc AS index_type,
  STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.index_column_id) AS columns
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.type > 0  -- Exclui heaps
  AND t.name NOT LIKE 'sys%'
GROUP BY t.name, i.name, i.type_desc
ORDER BY t.name, i.name;
GO

-- ============================================
-- 6. ESTATÍSTICAS DE USO DE ÍNDICES
-- ============================================
PRINT '';
PRINT '=== USO DE ÍNDICES (ÚLTIMOS 7 DIAS) ===';
PRINT '';

SELECT 
  OBJECT_NAME(ius.object_id) AS table_name,
  i.name AS index_name,
  ius.user_seeks,
  ius.user_scans,
  ius.user_lookups,
  ius.user_updates,
  CASE 
    WHEN (ius.user_seeks + ius.user_scans + ius.user_lookups) = 0 THEN 'UNUSED'
    WHEN ius.user_updates > (ius.user_seeks + ius.user_scans) * 10 THEN 'HIGH_WRITE_LOW_READ'
    ELSE 'ACTIVE'
  END AS status
FROM sys.dm_db_index_usage_stats ius
JOIN sys.indexes i ON ius.object_id = i.object_id AND ius.index_id = i.index_id
WHERE ius.database_id = DB_ID()
  AND OBJECTPROPERTY(ius.object_id, 'IsUserTable') = 1
ORDER BY (ius.user_seeks + ius.user_scans + ius.user_lookups) DESC;
GO

PRINT '';
PRINT '=== ANÁLISE CONCLUÍDA ===';
PRINT 'Use os resultados acima para:';
PRINT '1. Identificar queries candidatas a otimização';
PRINT '2. Criar índices recomendados';
PRINT '3. Verificar índices não utilizados (candidatos a remoção)';
GO
