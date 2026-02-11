-- Migration: 0066_expand_totp_secret_column.sql
-- Date: 2026-02-08
-- Epic: E18 (LC-PR88-001)
--
-- Description: Expand totp_secret to NVARCHAR(500) for AES-256-GCM encrypted format
-- (iv:encrypted:authTag can exceed 255 chars)
-- Rollback: ALTER TABLE [users] ALTER COLUMN [totp_secret] NVARCHAR(255) NULL;
--
-- IMPORTANT: Test in local environment before running in homolog/prod

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Expand totp_secret for encrypted format (255 -> 500)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_secret')
BEGIN
  ALTER TABLE [users] ALTER COLUMN [totp_secret] NVARCHAR(500) NULL;
  PRINT 'Expanded: totp_secret to NVARCHAR(500)';
END
GO
