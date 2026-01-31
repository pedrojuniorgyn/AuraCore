-- Migration: Create strategic_anomaly table
-- Date: 2026-01-30
-- Task: Anomaly Infrastructure (Fase 3)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Create strategic_anomaly table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_anomaly')
BEGIN
    CREATE TABLE [strategic_anomaly] (
        [id] VARCHAR(36) PRIMARY KEY,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,

        [code] VARCHAR(30) NOT NULL,
        [title] VARCHAR(200) NOT NULL,
        [description] NVARCHAR(MAX) NOT NULL,

        -- Origem da anomalia
        [source] VARCHAR(20) NOT NULL, -- CONTROL_ITEM|KPI|MANUAL|AUDIT
        [source_entity_id] VARCHAR(36),

        -- Detecção
        [detected_at] DATETIME2 NOT NULL,
        [detected_by] VARCHAR(36) NOT NULL,

        -- Classificação
        [severity] VARCHAR(20) NOT NULL, -- LOW|MEDIUM|HIGH|CRITICAL
        [process_area] VARCHAR(100) NOT NULL,
        [responsible_user_id] VARCHAR(36) NOT NULL,

        -- Status: OPEN|ANALYZING|IN_TREATMENT|RESOLVED|CANCELLED
        [status] VARCHAR(20) NOT NULL DEFAULT 'OPEN',

        -- Análise de causa raiz (5 Porquês)
        [root_cause_analysis] NVARCHAR(MAX),
        [why1] VARCHAR(500),
        [why2] VARCHAR(500),
        [why3] VARCHAR(500),
        [why4] VARCHAR(500),
        [why5] VARCHAR(500),
        [root_cause] VARCHAR(500),

        -- Tratamento
        [action_plan_id] VARCHAR(36),
        [standard_procedure_id] VARCHAR(36),

        -- Resolução
        [resolution] NVARCHAR(MAX),
        [resolved_at] DATETIME2,
        [resolved_by] VARCHAR(36),

        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [deleted_at] DATETIME2
    );
    PRINT 'Created strategic_anomaly table';
END
ELSE
BEGIN
    PRINT '⚠️  strategic_anomaly already exists';
END
GO

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_anomaly_tenant')
BEGIN
    CREATE INDEX [idx_anomaly_tenant]
        ON [strategic_anomaly] ([organization_id], [branch_id]);
    PRINT 'Created index idx_anomaly_tenant';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_anomaly_status')
BEGIN
    CREATE INDEX [idx_anomaly_status]
        ON [strategic_anomaly] ([status]);
    PRINT 'Created index idx_anomaly_status';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_anomaly_severity')
BEGIN
    CREATE INDEX [idx_anomaly_severity]
        ON [strategic_anomaly] ([severity]);
    PRINT 'Created index idx_anomaly_severity';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_anomaly_source')
BEGIN
    CREATE INDEX [idx_anomaly_source]
        ON [strategic_anomaly] ([source]);
    PRINT 'Created index idx_anomaly_source';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_anomaly_responsible')
BEGIN
    CREATE INDEX [idx_anomaly_responsible]
        ON [strategic_anomaly] ([responsible_user_id]);
    PRINT 'Created index idx_anomaly_responsible';
END
GO

PRINT '✅ Migration 0045 completed: strategic_anomaly created';
GO
