-- Migration: 0070_create_cfop_determination.sql
-- Data: 2026-02-08
-- Épico: F3.3
-- Autor: AuraCore Agent
--
-- Cria tabela cfop_determination para mapeamento operação → CFOP.
-- Rollback: DROP TABLE [cfop_determination];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cfop_determination')
BEGIN
  CREATE TABLE [cfop_determination] (
    [id] VARCHAR(36) NOT NULL PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [operation_type] VARCHAR(50) NOT NULL,
    [direction] VARCHAR(20) NOT NULL,       -- ENTRY | EXIT
    [scope] VARCHAR(20) NOT NULL,           -- INTRASTATE | INTERSTATE | FOREIGN
    [tax_regime] VARCHAR(30) NULL,
    [document_type] VARCHAR(20) NULL,
    [cfop_code] VARCHAR(4) NOT NULL,
    [cfop_description] VARCHAR(200) NOT NULL,
    [is_default] BIT NOT NULL DEFAULT 0,
    [priority] INT NOT NULL DEFAULT 100,
    [status] VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2 NULL
  );
  PRINT 'Criada: tabela cfop_determination';
END
GO

-- Índice multi-tenancy
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cfop_det_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_cfop_det_tenant] ON [cfop_determination] ([organization_id])
  WHERE [deleted_at] IS NULL;
  PRINT 'Criado: idx_cfop_det_tenant';
END
GO

-- Índice de lookup principal
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cfop_det_lookup')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_cfop_det_lookup] ON [cfop_determination] 
    ([organization_id], [operation_type], [direction], [scope])
  INCLUDE ([cfop_code], [cfop_description], [is_default], [priority], [status])
  WHERE [deleted_at] IS NULL;
  PRINT 'Criado: idx_cfop_det_lookup';
END
GO
