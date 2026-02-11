-- Migration: 0064_add_2fa_totp_fields.sql
-- Date: 2026-02-11
-- Epic: E11.1
-- Author: AuraCore
--
-- Description: Add 2FA/TOTP fields to users table for admin authentication
-- Rollback: ALTER TABLE [users] DROP COLUMN [totp_secret], [totp_enabled], [totp_backup_codes], [totp_verified_at];
--
-- IMPORTANT: Test in local environment before running in homolog/prod

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Add TOTP secret (AES-256-GCM encrypted; format: iv:encrypted:authTag in hex).
-- Run 0066 after to expand to 500 chars if needed.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_secret')
BEGIN
  ALTER TABLE [users] ADD [totp_secret] NVARCHAR(255) NULL;
  PRINT 'Added: totp_secret column';
END
GO

-- Add TOTP enabled flag
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_enabled')
BEGIN
  ALTER TABLE [users] ADD [totp_enabled] BIT NOT NULL DEFAULT 0;
  PRINT 'Added: totp_enabled column';
END
GO

-- Add backup codes (JSON array of hashed codes)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_backup_codes')
BEGIN
  ALTER TABLE [users] ADD [totp_backup_codes] VARCHAR(MAX) NULL;
  PRINT 'Added: totp_backup_codes column';
END
GO

-- Add 2FA verified-at timestamp (when user successfully set up 2FA)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_verified_at')
BEGIN
  ALTER TABLE [users] ADD [totp_verified_at] DATETIME2 NULL;
  PRINT 'Added: totp_verified_at column';
END
GO
