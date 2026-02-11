-- Migration: 0067_fix_wms_updated_at_type.sql
-- Date: 2026-02-11
-- Epic: E18 (LC-PR88-BUGBOT)
--
-- Description: Fix wms_stock_movements.updated_at from DATETIME to DATETIME2
-- for consistency with all other timestamp columns in the project.
-- Ref: Migration 0065 incorrectly used DATETIME instead of DATETIME2.
--
-- Rollback: ALTER TABLE [wms_stock_movements] ALTER COLUMN [updated_at] DATETIME NULL;
--
-- IMPORTANT: Test in local environment before running in homolog/prod

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Fix: DATETIME -> DATETIME2 for consistency (SCHEMA-005)
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'wms_stock_movements'
    AND COLUMN_NAME = 'updated_at'
    AND DATA_TYPE = 'datetime'
)
BEGIN
  ALTER TABLE [wms_stock_movements] ALTER COLUMN [updated_at] DATETIME2 NULL;
  PRINT 'Fixed: wms_stock_movements.updated_at DATETIME -> DATETIME2';
END
ELSE
BEGIN
  PRINT 'Skip: wms_stock_movements.updated_at already DATETIME2 or does not exist';
END
GO
