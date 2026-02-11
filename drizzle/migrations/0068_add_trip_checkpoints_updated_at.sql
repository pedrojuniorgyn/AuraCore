-- Migration: 0068_add_trip_checkpoints_updated_at.sql
-- Data: 2026-02-11
-- Épico: E13.2
-- Autor: AuraCore Team
--
-- IMPORTANTE: Testar em ambiente local antes de executar em homolog/prod
-- Referência: docs/technical-debt/SCHEMA_GAPS_E8.4.md (Seção 4)
--
-- Gap corrigido:
--   trip_checkpoints: adicionar updated_at (SCHEMA-005)
--
-- Rollback:
--   ALTER TABLE [trip_checkpoints] DROP COLUMN [updated_at];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- =====================================================
-- 1. trip_checkpoints: adicionar updated_at (SCHEMA-005)
-- =====================================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'trip_checkpoints' AND COLUMN_NAME = 'updated_at'
)
BEGIN
  ALTER TABLE [trip_checkpoints] ADD [updated_at] DATETIME2 NULL DEFAULT GETDATE();
  PRINT 'Adicionado: trip_checkpoints.updated_at';

  -- Popular updated_at com created_at para registros existentes
  UPDATE [trip_checkpoints] SET [updated_at] = COALESCE([created_at], GETDATE()) WHERE [updated_at] IS NULL;
  PRINT 'Populado: trip_checkpoints.updated_at com valores existentes';
END
ELSE
BEGIN
  PRINT 'Já existe: trip_checkpoints.updated_at';
END
GO

PRINT '=== Migration 0068 concluída com sucesso ===';
GO
