-- Migration: Align strategic_control_item with Entity/Schema
-- Date: 2026-01-30
-- Note: No data exists, safe to recreate table

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Drop old table structure (no data loss - table is empty)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_control_item')
BEGIN
    DROP TABLE [strategic_control_item];
    PRINT 'Dropped old strategic_control_item table';
END
GO

-- Recreate with correct structure aligned to Entity
CREATE TABLE [strategic_control_item] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    
    [code] VARCHAR(20) NOT NULL,
    [name] VARCHAR(200) NOT NULL,
    [description] NVARCHAR(MAX),
    
    -- Aligned with Entity
    [process_area] VARCHAR(100) NOT NULL,
    [responsible_user_id] VARCHAR(36) NOT NULL,
    [measurement_frequency] VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    
    [unit] VARCHAR(20) NOT NULL,
    [target_value] DECIMAL(18,4) NOT NULL,
    [current_value] DECIMAL(18,4) NOT NULL DEFAULT 0,
    [upper_limit] DECIMAL(18,4) NOT NULL,
    [lower_limit] DECIMAL(18,4) NOT NULL,
    
    [kpi_id] VARCHAR(36) NULL,
    
    -- Status: ACTIVE | INACTIVE | UNDER_REVIEW (aligned with Entity)
    [status] VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    [last_measured_at] DATETIME2,
    
    [created_by] VARCHAR(36) NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
);
PRINT 'Created strategic_control_item table with correct schema';
GO

-- Indexes
CREATE INDEX [idx_control_item_tenant] ON [strategic_control_item] ([organization_id], [branch_id]);
CREATE INDEX [idx_control_item_code] ON [strategic_control_item] ([organization_id], [branch_id], [code]);
CREATE INDEX [idx_control_item_status] ON [strategic_control_item] ([status]);
CREATE INDEX [idx_control_item_responsible] ON [strategic_control_item] ([responsible_user_id]);
CREATE INDEX [idx_control_item_kpi] ON [strategic_control_item] ([kpi_id]);
PRINT 'Created indexes for strategic_control_item';
GO

PRINT '✅ Migration 0043 completed: strategic_control_item aligned with Entity';
