-- Migration: 0038_add_deleted_at_soft_delete.sql
-- Numeração: 0038 (após 0037_add_branch_id_to_tables.sql)
-- Data: 2026-01-19
-- Épico: E9.2 - Soft Delete Compliance
-- Autor: Claude Agent
-- Descrição: Adiciona deleted_at em 6 tabelas para suportar soft delete (SCHEMA-006)
--
-- Tabelas afetadas:
-- 1. bank_transactions     (Financeiro)
-- 2. fiscal_settings       (Fiscal)
-- 3. fuel_transactions     (Frota)
-- 4. warehouse_movements   (WMS)
-- 5. warehouse_locations   (WMS)
-- 6. trip_checkpoints      (TMS)
--
-- NOTA: trip_stops e trip_documents já possuem deleted_at
--
-- IMPORTANTE: 
-- 1. Executar em horário de baixo uso
-- 2. deleted_at é NULLABLE (NULL = não deletado)
-- 3. Atualizar queries para filtrar WHERE deleted_at IS NULL
--
-- Rollback: 
--   ALTER TABLE [bank_transactions] DROP COLUMN [deleted_at];
--   ALTER TABLE [fiscal_settings] DROP COLUMN [deleted_at];
--   ALTER TABLE [fuel_transactions] DROP COLUMN [deleted_at];
--   ALTER TABLE [warehouse_movements] DROP COLUMN [deleted_at];
--   ALTER TABLE [warehouse_locations] DROP COLUMN [deleted_at];
--   ALTER TABLE [trip_checkpoints] DROP COLUMN [deleted_at];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================
-- TABELAS FINANCEIRAS
-- ============================================

-- 1. bank_transactions
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'bank_transactions' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [bank_transactions] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em bank_transactions';
END
GO

-- ============================================
-- TABELAS FISCAIS
-- ============================================

-- 2. fiscal_settings
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'fiscal_settings' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [fiscal_settings] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em fiscal_settings';
END
GO

-- ============================================
-- TABELAS FROTA
-- ============================================

-- 3. fuel_transactions
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'fuel_transactions' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [fuel_transactions] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em fuel_transactions';
END
GO

-- ============================================
-- TABELAS WMS
-- ============================================

-- 4. warehouse_movements
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouse_movements' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [warehouse_movements] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em warehouse_movements';
END
GO

-- 5. warehouse_locations
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouse_locations' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [warehouse_locations] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em warehouse_locations';
END
GO

-- ============================================
-- TABELAS TMS
-- ============================================

-- 6. trip_checkpoints
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'trip_checkpoints' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [trip_checkpoints] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em trip_checkpoints';
END
GO

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
PRINT '=== VERIFICAÇÃO FINAL ==='
SELECT 
    t.name AS Tabela,
    c.name AS Coluna,
    ty.name AS Tipo,
    CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS Nullable
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE c.name = 'deleted_at'
AND t.name IN (
    'bank_transactions', 
    'fiscal_settings', 
    'fuel_transactions', 
    'warehouse_movements', 
    'warehouse_locations', 
    'trip_checkpoints',
    'trip_stops',      -- já existia
    'trip_documents'   -- já existia
)
ORDER BY t.name;
GO

PRINT '=== MIGRATION 0038 CONCLUÍDA COM SUCESSO ===';
GO
