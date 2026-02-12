-- Migration: 0073_create_driver_receipts.sql
-- Data: 2026-02-08
-- Épico: F4
-- Autor: AuraCore Agent
--
-- Cria tabela de recibos de motorista (gerados automaticamente após pagamento).
-- Rollback: DROP TABLE [driver_receipts];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'driver_receipts')
BEGIN
  CREATE TABLE [driver_receipts] (
    [id] VARCHAR(36) NOT NULL PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [receipt_number] VARCHAR(30) NOT NULL,
    [driver_id] INT NULL,
    [driver_name] NVARCHAR(200) NOT NULL,
    [driver_document] VARCHAR(14) NOT NULL, -- CPF
    [trip_number] VARCHAR(50) NULL,
    [payable_id] VARCHAR(36) NULL,
    [payment_id] VARCHAR(36) NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [amount_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [payment_date] DATETIME2 NOT NULL,
    [payment_method] VARCHAR(30) NOT NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'GENERATED',
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(255) NOT NULL,
    [deleted_at] DATETIME2 NULL
  );
  PRINT 'Criada: tabela driver_receipts';
END
GO

-- Índice multi-tenancy
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_driver_receipts_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_driver_receipts_tenant] 
    ON [driver_receipts] ([organization_id], [branch_id])
  WHERE [deleted_at] IS NULL;
  PRINT 'Criado: idx_driver_receipts_tenant';
END
GO

-- Índice por motorista
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_driver_receipts_driver')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_driver_receipts_driver] 
    ON [driver_receipts] ([organization_id], [driver_id])
  INCLUDE ([receipt_number], [amount], [payment_date])
  WHERE [deleted_at] IS NULL;
  PRINT 'Criado: idx_driver_receipts_driver';
END
GO
