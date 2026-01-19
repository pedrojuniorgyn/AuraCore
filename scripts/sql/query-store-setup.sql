-- ============================================================================
-- QUERY STORE SETUP - AURACORE
-- ============================================================================
-- Épico: E8.1 - Query Store Baseline
-- Data: 2026-01-19
-- Autor: AuraCore Team
-- 
-- OBJETIVO: Habilitar e configurar Query Store para análise de performance
-- 
-- IMPORTANTE: 
--   - Executar como DBA com permissão ALTER DATABASE
--   - Testar em ambiente local antes de produção
--   - Query Store consome ~1-5% CPU adicional
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR STATUS ATUAL
-- ============================================================================

-- Verificar se Query Store está habilitado
SELECT 
    DB_NAME() AS database_name,
    is_query_store_on,
    actual_state_desc,
    desired_state_desc,
    current_storage_size_mb,
    max_storage_size_mb,
    flush_interval_seconds,
    stale_query_threshold_days,
    size_based_cleanup_mode_desc,
    query_capture_mode_desc
FROM sys.database_query_store_options;
GO

-- ============================================================================
-- 2. HABILITAR QUERY STORE (SE NÃO ESTIVER)
-- ============================================================================

-- Substituir [AuraCore] pelo nome do seu banco de dados
-- ALTER DATABASE [AuraCore] SET QUERY_STORE = ON;

-- Ou usar CURRENT para o banco atual:
ALTER DATABASE CURRENT SET QUERY_STORE = ON;
GO

-- ============================================================================
-- 3. CONFIGURAR QUERY STORE (RECOMENDADO)
-- ============================================================================

ALTER DATABASE CURRENT SET QUERY_STORE (
    -- Modo de operação: READ_WRITE (captura queries)
    OPERATION_MODE = READ_WRITE,
    
    -- Política de limpeza: manter queries por 30 dias
    CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
    
    -- Intervalo de flush para disco: 15 minutos
    DATA_FLUSH_INTERVAL_SECONDS = 900,
    
    -- Tamanho máximo: 1GB (ajustar conforme volume)
    MAX_STORAGE_SIZE_MB = 1000,
    
    -- Intervalo de agregação: 1 hora
    INTERVAL_LENGTH_MINUTES = 60,
    
    -- Limpeza automática quando atingir 90% do limite
    SIZE_BASED_CLEANUP_MODE = AUTO,
    
    -- Capturar todas as queries (ou AUTO para otimizar)
    QUERY_CAPTURE_MODE = ALL,
    
    -- Wait stats (SQL Server 2017+)
    WAIT_STATS_CAPTURE_MODE = ON
);
GO

PRINT 'Query Store habilitado e configurado com sucesso!';
GO

-- ============================================================================
-- 4. QUERIES DE ANÁLISE (USAR APÓS ACUMULAR DADOS)
-- ============================================================================

-- Top 20 queries por duração média (p95/p99)
/*
SELECT TOP 20
    q.query_id,
    LEFT(qt.query_sql_text, 500) AS query_text_preview,
    CAST(rs.avg_duration / 1000.0 AS DECIMAL(18,2)) AS avg_duration_ms,
    CAST(rs.max_duration / 1000.0 AS DECIMAL(18,2)) AS max_duration_ms,
    rs.count_executions,
    CAST(rs.avg_cpu_time / 1000.0 AS DECIMAL(18,2)) AS avg_cpu_ms,
    rs.avg_logical_io_reads,
    rs.last_execution_time
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
ORDER BY rs.avg_duration DESC;
*/

-- Queries com múltiplos planos de execução (regressão de plano)
/*
SELECT 
    q.query_id,
    LEFT(qt.query_sql_text, 300) AS query_text_preview,
    COUNT(DISTINCT p.plan_id) AS plan_count,
    MIN(rs.avg_duration) / 1000.0 AS min_avg_duration_ms,
    MAX(rs.avg_duration) / 1000.0 AS max_avg_duration_ms
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
GROUP BY q.query_id, qt.query_sql_text
HAVING COUNT(DISTINCT p.plan_id) > 1
ORDER BY plan_count DESC;
*/

-- ============================================================================
-- 5. MISSING INDEXES (NÃO DEPENDE DO QUERY STORE)
-- ============================================================================

/*
SELECT TOP 20
    OBJECT_NAME(mid.object_id, mid.database_id) AS table_name,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns,
    CAST(migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans) AS DECIMAL(18,2)) AS improvement_measure,
    migs.user_seeks,
    migs.user_scans,
    CONCAT(
        'CREATE NONCLUSTERED INDEX [IX_', 
        OBJECT_NAME(mid.object_id, mid.database_id), 
        '_Auto_', 
        CAST(mig.index_group_handle AS VARCHAR(10)),
        '] ON ', mid.statement, ' (',
        ISNULL(mid.equality_columns, ''),
        CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ', ' ELSE '' END,
        ISNULL(mid.inequality_columns, ''),
        ')',
        CASE WHEN mid.included_columns IS NOT NULL THEN ' INCLUDE (' + mid.included_columns + ')' ELSE '' END,
        ';'
    ) AS create_index_statement
FROM sys.dm_db_missing_index_groups mig
JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY improvement_measure DESC;
*/

-- ============================================================================
-- 6. ROLLBACK (DESABILITAR QUERY STORE)
-- ============================================================================

-- CUIDADO: Isso remove TODOS os dados de Query Store!
-- ALTER DATABASE CURRENT SET QUERY_STORE = OFF;
-- ALTER DATABASE CURRENT SET QUERY_STORE CLEAR;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
