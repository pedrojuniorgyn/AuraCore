-- ============================================
-- E13 - Habilitar Query Store para Baseline
-- ============================================
-- Data: 23/01/2026
-- Épico: E13 - Performance Optimization
-- Objetivo: Capturar estatísticas de queries para otimização
--
-- IMPORTANTE: Executar no SQL Server Management Studio ou Azure Data Studio
-- Requer permissão ALTER DATABASE

USE [auracore_db]; -- Substituir pelo nome do banco
GO

-- 1. Verificar status atual
PRINT '=== STATUS ATUAL DO QUERY STORE ===';
SELECT 
  DB_NAME() AS database_name,
  is_query_store_on AS enabled,
  query_capture_mode_desc AS capture_mode,
  size_based_cleanup_mode_desc AS cleanup_mode,
  max_storage_size_mb,
  current_storage_size_mb
FROM sys.database_query_store_options;
GO

-- 2. Habilitar Query Store (se não estiver habilitado)
PRINT '';
PRINT '=== HABILITANDO QUERY STORE ===';

ALTER DATABASE [auracore_db] 
SET QUERY_STORE = ON 
(
  OPERATION_MODE = READ_WRITE,
  CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
  DATA_FLUSH_INTERVAL_SECONDS = 900,       -- 15 minutos
  INTERVAL_LENGTH_MINUTES = 60,             -- Agregação por hora
  MAX_STORAGE_SIZE_MB = 1000,               -- 1GB máximo
  QUERY_CAPTURE_MODE = AUTO,                -- Captura automática
  SIZE_BASED_CLEANUP_MODE = AUTO,           -- Limpeza automática
  MAX_PLANS_PER_QUERY = 200                 -- Máximo de planos por query
);
GO

-- 3. Verificar que foi aplicado
PRINT '';
PRINT '=== VERIFICAÇÃO PÓS-HABILITAÇÃO ===';
SELECT 
  DB_NAME() AS database_name,
  CASE is_query_store_on 
    WHEN 1 THEN '✅ HABILITADO' 
    ELSE '❌ DESABILITADO' 
  END AS status,
  query_capture_mode_desc AS capture_mode,
  max_storage_size_mb,
  current_storage_size_mb
FROM sys.database_query_store_options;
GO

PRINT '';
PRINT '✅ Query Store habilitado com sucesso!';
PRINT '⏳ Aguardar 24-48h para coletar estatísticas antes de otimizar.';
PRINT '';
PRINT 'Próximos passos:';
PRINT '1. Executar e13-top-queries.sql após 24-48h';
PRINT '2. Analisar top 20 queries mais lentas';
PRINT '3. Criar índices baseados em workload real';
GO

-- ============================================
-- ROLLBACK (se necessário desabilitar)
-- ============================================
/*
ALTER DATABASE [auracore_db] SET QUERY_STORE = OFF;
GO

-- Limpar dados do Query Store
ALTER DATABASE [auracore_db] SET QUERY_STORE CLEAR;
GO
*/
