-- Migration: Create strategic_verification_item table
-- Date: 2026-01-30
-- Task: VerificationItem Infrastructure (Fase 3)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Create strategic_verification_item table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_verification_item')
BEGIN
    CREATE TABLE [strategic_verification_item] (
        [id] VARCHAR(36) PRIMARY KEY,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,

        -- Referência ao Item de Controle (relação causa-efeito)
        [control_item_id] VARCHAR(36) NOT NULL,

        [code] VARCHAR(20) NOT NULL,
        [name] VARCHAR(200) NOT NULL,
        [description] NVARCHAR(MAX),

        -- Configuração de verificação
        [verification_method] VARCHAR(500) NOT NULL,
        [responsible_user_id] VARCHAR(36) NOT NULL,
        [frequency] VARCHAR(20) NOT NULL, -- DAILY|WEEKLY|BIWEEKLY|MONTHLY

        -- Valores
        [standard_value] VARCHAR(100) NOT NULL,
        [current_value] VARCHAR(100),

        -- Verificação
        [last_verified_at] DATETIME2,
        [last_verified_by] VARCHAR(36),

        -- Status e correlação
        [status] VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE
        [correlation_weight] INT NOT NULL DEFAULT 50,

        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [deleted_at] DATETIME2,

        -- Foreign Key
        CONSTRAINT FK_verification_item_control_item
            FOREIGN KEY ([control_item_id])
            REFERENCES [strategic_control_item]([id])
    );
    PRINT 'Created strategic_verification_item table';
END
ELSE
BEGIN
    PRINT '⚠️  strategic_verification_item already exists';
END
GO

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_verification_item_tenant')
BEGIN
    CREATE INDEX [idx_verification_item_tenant]
        ON [strategic_verification_item] ([organization_id], [branch_id]);
    PRINT 'Created index idx_verification_item_tenant';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_verification_item_control_item')
BEGIN
    CREATE INDEX [idx_verification_item_control_item]
        ON [strategic_verification_item] ([control_item_id]);
    PRINT 'Created index idx_verification_item_control_item';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_verification_item_responsible')
BEGIN
    CREATE INDEX [idx_verification_item_responsible]
        ON [strategic_verification_item] ([responsible_user_id]);
    PRINT 'Created index idx_verification_item_responsible';
END
GO

PRINT '✅ Migration 0044 completed: strategic_verification_item created';
GO
