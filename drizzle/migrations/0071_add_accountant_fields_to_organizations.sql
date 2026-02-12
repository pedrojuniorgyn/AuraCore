-- Migration: 0071_add_accountant_fields_to_organizations.sql
-- Data: 2026-02-08
-- Épico: F3.4
-- Autor: AuraCore Agent
--
-- Adiciona campos do contabilista e dados fiscais à tabela organizations.
-- Necessário para geração de SPED com dados reais (não hardcoded).
-- Rollback: ALTER TABLE organizations DROP COLUMN ie, im, accountant_name, accountant_document, accountant_crc_state, accountant_crc;

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- IE (Inscrição Estadual)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'ie')
BEGIN
  ALTER TABLE [organizations] ADD [ie] NVARCHAR(20) NULL;
  PRINT 'Adicionado: organizations.ie';
END
GO

-- IM (Inscrição Municipal)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'im')
BEGIN
  ALTER TABLE [organizations] ADD [im] NVARCHAR(20) NULL;
  PRINT 'Adicionado: organizations.im';
END
GO

-- Dados do Contabilista (obrigatório para SPED)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'accountant_name')
BEGIN
  ALTER TABLE [organizations] ADD [accountant_name] NVARCHAR(100) NULL;
  PRINT 'Adicionado: organizations.accountant_name';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'accountant_document')
BEGIN
  ALTER TABLE [organizations] ADD [accountant_document] NVARCHAR(14) NULL;
  PRINT 'Adicionado: organizations.accountant_document';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'accountant_crc_state')
BEGIN
  ALTER TABLE [organizations] ADD [accountant_crc_state] NVARCHAR(2) NULL;
  PRINT 'Adicionado: organizations.accountant_crc_state';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'accountant_crc')
BEGIN
  ALTER TABLE [organizations] ADD [accountant_crc] NVARCHAR(20) NULL;
  PRINT 'Adicionado: organizations.accountant_crc';
END
GO
