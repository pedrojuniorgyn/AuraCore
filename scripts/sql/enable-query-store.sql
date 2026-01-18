/**
 * Script SQL para habilitar Query Store no SQL Server
 * 
 * Query Store é um recurso do SQL Server que captura automaticamente
 * histórico de queries, planos de execução e estatísticas de performance.
 * 
 * @see E8.1 - Performance & Observability
 * @see https://docs.microsoft.com/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store
 */

-- ============================================
-- 1. HABILITAR QUERY STORE
-- ============================================

-- Verificar status atual
SELECT 
  name as DatabaseName,
  is_query_store_on as QueryStoreEnabled,
  actual_state_desc as ActualState
FROM sys.databases
WHERE name = DB_NAME();

-- Habilitar Query Store com configurações otimizadas
ALTER DATABASE CURRENT
SET QUERY_STORE = ON (
  -- Modo de operação (READ_WRITE permite captura + consulta)
  OPERATION_MODE = READ_WRITE,
  
  -- Limpeza automática de queries antigas (30 dias)
  CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
  
  -- Intervalo de flush para disco (15 minutos)
  DATA_FLUSH_INTERVAL_SECONDS = 900,
  
  -- Tamanho máximo de armazenamento (1GB)
  MAX_STORAGE_SIZE_MB = 1000,
  
  -- Intervalo de agregação de estatísticas (60 minutos)
  INTERVAL_LENGTH_MINUTES = 60,
  
  -- Limpeza baseada em tamanho automática
  SIZE_BASED_CLEANUP_MODE = AUTO,
  
  -- Captura automática de queries
  QUERY_CAPTURE_MODE = AUTO,
  
  -- Máximo de planos por query
  MAX_PLANS_PER_QUERY = 200,
  
  -- Threshold de tempo de execução para captura (ms)
  -- Apenas queries > 30ms serão capturadas
  QUERY_CAPTURE_POLICY = (
    STALE_CAPTURE_POLICY_THRESHOLD = 24 HOURS,
    EXECUTION_COUNT = 30,
    TOTAL_COMPILE_CPU_TIME_MS = 1000,
    TOTAL_EXECUTION_CPU_TIME_MS = 100
  )
);
GO

-- ============================================
-- 2. VERIFICAR CONFIGURAÇÃO
-- ============================================

SELECT * FROM sys.database_query_store_options;
GO

-- ============================================
-- 3. QUERIES DE ANÁLISE
-- ============================================

-- Top 10 queries mais lentas (por duração média)
SELECT TOP 10
  q.query_id,
  qt.query_sql_text,
  CAST(rs.avg_duration / 1000.0 AS DECIMAL(18,2)) as avg_duration_ms,
  rs.count_executions,
  CAST(rs.avg_cpu_time / 1000.0 AS DECIMAL(18,2)) as avg_cpu_ms,
  rs.avg_logical_io_reads,
  p.plan_id,
  p.is_forced_plan
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
ORDER BY rs.avg_duration DESC;
GO

-- Top 10 queries por consumo de CPU
SELECT TOP 10
  q.query_id,
  qt.query_sql_text,
  SUM(rs.count_executions) as total_executions,
  SUM(CAST(rs.avg_cpu_time * rs.count_executions / 1000.0 AS DECIMAL(18,2))) as total_cpu_ms,
  AVG(CAST(rs.avg_cpu_time / 1000.0 AS DECIMAL(18,2))) as avg_cpu_ms
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
GROUP BY q.query_id, qt.query_sql_text
ORDER BY total_cpu_ms DESC;
GO

-- Queries com regressão de plano (plano piorou)
SELECT 
  q.query_id,
  qt.query_sql_text,
  p.plan_id,
  rs.avg_duration / 1000.0 as avg_duration_ms,
  p.last_compile_start_time
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE p.is_forced_plan = 0
  AND EXISTS (
    SELECT 1 FROM sys.query_store_plan p2
    JOIN sys.query_store_runtime_stats rs2 ON p2.plan_id = rs2.plan_id
    WHERE p2.query_id = q.query_id 
      AND p2.plan_id <> p.plan_id
      AND rs2.avg_duration < rs.avg_duration * 0.5  -- Plano anterior era 2x mais rápido
  )
ORDER BY rs.avg_duration DESC;
GO

-- ============================================
-- 4. FORÇAR PLANO ESPECÍFICO (SE NECESSÁRIO)
-- ============================================

-- Exemplo: forçar um plano específico para uma query problemática
-- EXEC sp_query_store_force_plan @query_id = 123, @plan_id = 456;

-- Para remover o plano forçado:
-- EXEC sp_query_store_unforce_plan @query_id = 123, @plan_id = 456;

-- ============================================
-- 5. LIMPEZA MANUAL (SE NECESSÁRIO)
-- ============================================

-- Limpar todos os dados do Query Store (CUIDADO!)
-- ALTER DATABASE CURRENT SET QUERY_STORE CLEAR;

-- Remover query específica
-- EXEC sp_query_store_remove_query @query_id = 123;

-- ============================================
-- 6. MONITORAMENTO DE ESPAÇO
-- ============================================

SELECT 
  current_storage_size_mb,
  max_storage_size_mb,
  CAST(100.0 * current_storage_size_mb / max_storage_size_mb AS DECIMAL(5,2)) as percent_used,
  readonly_reason
FROM sys.database_query_store_options;
GO

-- ============================================
-- 7. INTEGRAÇÃO COM AURACORE
-- ============================================

-- View customizada para dashboard de performance
CREATE OR ALTER VIEW [dbo].[vw_auracore_slow_queries] AS
SELECT 
  q.query_id,
  SUBSTRING(qt.query_sql_text, 1, 500) as query_text_preview,
  CAST(rs.avg_duration / 1000.0 AS DECIMAL(18,2)) as avg_duration_ms,
  rs.count_executions,
  CAST(rs.avg_cpu_time / 1000.0 AS DECIMAL(18,2)) as avg_cpu_ms,
  rs.avg_logical_io_reads,
  rs.avg_logical_io_writes,
  p.last_execution_time,
  CASE 
    WHEN rs.avg_duration / 1000.0 > 1000 THEN 'CRITICAL'
    WHEN rs.avg_duration / 1000.0 > 500 THEN 'WARNING'
    ELSE 'OK'
  END as severity
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
WHERE rs.avg_duration / 1000.0 > 100  -- Queries > 100ms
  AND p.last_execution_time > DATEADD(day, -7, GETUTCDATE());  -- Últimos 7 dias
GO

-- Consultar a view
-- SELECT * FROM vw_auracore_slow_queries ORDER BY avg_duration_ms DESC;
