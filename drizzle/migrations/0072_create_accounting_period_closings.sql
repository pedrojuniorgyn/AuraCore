-- Migration: 0072_create_accounting_period_closings.sql
-- Data: 2026-02-08
-- Épico: F3.5
-- Autor: AuraCore Agent
--
-- Cria tabela de fechamentos de períodos contábeis.
-- Rollback: DROP TABLE [accounting_period_closings];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'accounting_period_closings')
BEGIN
  CREATE TABLE [accounting_period_closings] (
    [id] VARCHAR(36) NOT NULL PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [period_year] INT NOT NULL,
    [period_month] INT NOT NULL,
    [total_entries] INT NOT NULL DEFAULT 0,
    [total_debit] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    [total_credit] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    [closed_by] VARCHAR(255) NOT NULL,
    [closed_at] DATETIME2 NOT NULL,
    [reopened_at] DATETIME2 NULL,
    [reopened_by] VARCHAR(255) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2 NULL
  );
  PRINT 'Criada: tabela accounting_period_closings';
END
GO

-- Índice multi-tenancy
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_acct_period_closing_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_acct_period_closing_tenant] 
    ON [accounting_period_closings] ([organization_id], [branch_id])
  WHERE [deleted_at] IS NULL;
  PRINT 'Criado: idx_acct_period_closing_tenant';
END
GO

-- Índice único de período (um fechamento por mês/org/branch)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_acct_period_closing_period')
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [idx_acct_period_closing_period] 
    ON [accounting_period_closings] ([organization_id], [branch_id], [period_year], [period_month])
  WHERE [deleted_at] IS NULL;
  PRINT 'Criado: idx_acct_period_closing_period';
END
GO
