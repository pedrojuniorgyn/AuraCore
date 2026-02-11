-- Migration: 0065_fix_schema_gaps_e13_2.sql
-- Data: 2026-02-08
-- Épico: E13.2
-- Autor: AuraCore Team
--
-- IMPORTANTE: Testar em ambiente local antes de executar em homolog/prod
-- Referência: docs/technical-debt/SCHEMA_GAPS_E8.4.md
--
-- Gaps corrigidos:
--   1. fuel_transactions: adicionar updated_at
--   2. fiscal_settings: adicionar índice composto tenant (SCHEMA-003)
--   3. wms_stock_movements: adicionar updated_at + índice composto tenant
--   4. wms_inventory_counts: adicionar índice composto tenant
--
-- Rollback:
--   ALTER TABLE [fuel_transactions] DROP COLUMN [updated_at];
--   DROP INDEX IF EXISTS [idx_fiscal_settings_tenant] ON [fiscal_settings];
--   ALTER TABLE [wms_stock_movements] DROP COLUMN [updated_at];
--   DROP INDEX IF EXISTS [idx_wms_stock_movements_tenant] ON [wms_stock_movements];
--   DROP INDEX IF EXISTS [idx_wms_inventory_counts_tenant] ON [wms_inventory_counts];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- =====================================================
-- 1. fuel_transactions: adicionar updated_at (SCHEMA-005)
-- =====================================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'fuel_transactions' AND COLUMN_NAME = 'updated_at'
)
BEGIN
  ALTER TABLE [fuel_transactions] ADD [updated_at] DATETIME2 NULL DEFAULT GETDATE();
  PRINT 'Adicionado: fuel_transactions.updated_at';

  -- Popular updated_at com created_at para registros existentes
  UPDATE [fuel_transactions] SET [updated_at] = COALESCE([created_at], GETDATE()) WHERE [updated_at] IS NULL;
  PRINT 'Populado: fuel_transactions.updated_at com valores existentes';
END
ELSE
BEGIN
  PRINT 'Já existe: fuel_transactions.updated_at';
END
GO

-- =====================================================
-- 2. fiscal_settings: índice composto tenant (SCHEMA-003)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_settings_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_fiscal_settings_tenant]
  ON [fiscal_settings] ([organization_id], [branch_id])
  WHERE [deleted_at] IS NULL;
  PRINT 'Criado: idx_fiscal_settings_tenant';
END
ELSE
BEGIN
  PRINT 'Já existe: idx_fiscal_settings_tenant';
END
GO

-- =====================================================
-- 3. wms_stock_movements: adicionar updated_at (SCHEMA-005)
-- =====================================================
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'wms_stock_movements'
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'wms_stock_movements' AND COLUMN_NAME = 'updated_at'
  )
  BEGIN
    ALTER TABLE [wms_stock_movements] ADD [updated_at] DATETIME NULL DEFAULT GETDATE();
    PRINT 'Adicionado: wms_stock_movements.updated_at';

    -- Popular updated_at com created_at para registros existentes
    UPDATE [wms_stock_movements] SET [updated_at] = COALESCE([created_at], GETDATE()) WHERE [updated_at] IS NULL;
    PRINT 'Populado: wms_stock_movements.updated_at com valores existentes';
  END
  ELSE
  BEGIN
    PRINT 'Já existe: wms_stock_movements.updated_at';
  END
END
ELSE
BEGIN
  PRINT 'Tabela wms_stock_movements não existe (skip)';
END
GO

-- =====================================================
-- 3b. wms_stock_movements: índice composto tenant (SCHEMA-003)
-- =====================================================
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'wms_stock_movements'
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wms_stock_movements_tenant')
  BEGIN
    CREATE NONCLUSTERED INDEX [idx_wms_stock_movements_tenant]
    ON [wms_stock_movements] ([organization_id], [branch_id])
    WHERE [deleted_at] IS NULL;
    PRINT 'Criado: idx_wms_stock_movements_tenant';
  END
  ELSE
  BEGIN
    PRINT 'Já existe: idx_wms_stock_movements_tenant';
  END
END
GO

-- =====================================================
-- 4. wms_inventory_counts: índice composto tenant (SCHEMA-003)
-- =====================================================
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'wms_inventory_counts'
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wms_inventory_counts_tenant')
  BEGIN
    CREATE NONCLUSTERED INDEX [idx_wms_inventory_counts_tenant]
    ON [wms_inventory_counts] ([organization_id], [branch_id])
    WHERE [deleted_at] IS NULL;
    PRINT 'Criado: idx_wms_inventory_counts_tenant';
  END
  ELSE
  BEGIN
    PRINT 'Já existe: idx_wms_inventory_counts_tenant';
  END
END
GO

PRINT '=== Migration 0065 concluída com sucesso ===';
GO
