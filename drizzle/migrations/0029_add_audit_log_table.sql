-- Migration: Add audit log table
-- Date: 2026-01-30
-- Refs: GAP-I04

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'shared_audit_log')
BEGIN
    CREATE TABLE [shared_audit_log] (
        [id] VARCHAR(36) PRIMARY KEY,
        [entity_type] VARCHAR(100) NOT NULL,
        [entity_id] VARCHAR(36) NOT NULL,
        [operation] VARCHAR(20) NOT NULL,
        [user_id] VARCHAR(36) NOT NULL,
        [user_name] VARCHAR(200) NULL,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        [timestamp] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [previous_values] TEXT NULL,
        [new_values] TEXT NULL,
        [changed_fields] TEXT NULL,
        [client_ip] VARCHAR(45) NULL,
        [user_agent] VARCHAR(500) NULL,
        [metadata] TEXT NULL
    );
    PRINT 'Created table: shared_audit_log';
END
GO

-- Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_entity')
BEGIN
    CREATE INDEX [idx_audit_log_entity] ON [shared_audit_log] ([entity_type], [entity_id]);
    PRINT 'Created index: idx_audit_log_entity';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_tenant_time')
BEGIN
    CREATE INDEX [idx_audit_log_tenant_time] ON [shared_audit_log] ([organization_id], [branch_id], [timestamp]);
    PRINT 'Created index: idx_audit_log_tenant_time';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_user')
BEGIN
    CREATE INDEX [idx_audit_log_user] ON [shared_audit_log] ([user_id], [timestamp]);
    PRINT 'Created index: idx_audit_log_user';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_operation')
BEGIN
    CREATE INDEX [idx_audit_log_operation] ON [shared_audit_log] ([operation], [timestamp]);
    PRINT 'Created index: idx_audit_log_operation';
END
GO

PRINT '✅ Audit log table created successfully';
