-- Migration: 0067_fix_wms_updated_at_type.sql
-- Date: 2026-02-11
-- Epic: E18 (LC-PR88-BUGBOT)
--
-- Description: Fix wms_stock_movements.updated_at from DATETIME to DATETIME2
-- for consistency with all other timestamp columns in the project.
-- Ref: Migration 0065 incorrectly used DATETIME instead of DATETIME2.
--
-- CORRIGIDO: 2026-02-14 - Adicionado tratamento para dependências (triggers, defaults)
--
-- Rollback: ALTER TABLE [wms_stock_movements] ALTER COLUMN [updated_at] DATETIME NULL;
--
-- IMPORTANT: Test in local environment before running in homolog/prod

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Fix: DATETIME -> DATETIME2 for consistency (SCHEMA-005)
-- Primeiro verifica se a coluna existe e é DATETIME
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'wms_stock_movements'
    AND COLUMN_NAME = 'updated_at'
    AND DATA_TYPE = 'datetime'
)
BEGIN
  -- Verificar se há DEFAULT constraint na coluna
  DECLARE @defaultName NVARCHAR(128);
  SELECT @defaultName = dc.name
  FROM sys.default_constraints dc
  JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
  WHERE c.object_id = OBJECT_ID('wms_stock_movements') AND c.name = 'updated_at';
  
  -- Se houver default, dropa primeiro
  IF @defaultName IS NOT NULL
  BEGIN
    EXEC('ALTER TABLE [wms_stock_movements] DROP CONSTRAINT [' + @defaultName + ']');
    PRINT 'Dropped default constraint: ' + @defaultName;
  END
  
  -- Agora tenta alterar a coluna
  BEGIN TRY
    ALTER TABLE [wms_stock_movements] ALTER COLUMN [updated_at] DATETIME2 NULL;
    PRINT 'Fixed: wms_stock_movements.updated_at DATETIME -> DATETIME2';
  END TRY
  BEGIN CATCH
    PRINT 'Warning: Could not alter column: ' + ERROR_MESSAGE();
    PRINT 'Column may have other dependencies. Manual intervention may be required.';
  END CATCH
  
  -- Recria o DEFAULT se foi dropado
  IF @defaultName IS NOT NULL
  BEGIN
    ALTER TABLE [wms_stock_movements] ADD DEFAULT GETDATE() FOR [updated_at];
    PRINT 'Recreated default constraint for updated_at';
  END
END
ELSE
BEGIN
  PRINT 'Skip: wms_stock_movements.updated_at already DATETIME2 or does not exist';
END
GO
