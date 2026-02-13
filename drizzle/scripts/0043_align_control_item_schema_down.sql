-- Rollback: Revert strategic_control_item to old structure
-- Only use if needed to revert migration 0043

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_control_item')
BEGIN
    DROP TABLE [strategic_control_item];
    PRINT 'Dropped strategic_control_item table';
END
GO

-- Recreate with original structure from migration 0035
CREATE TABLE [strategic_control_item] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [code] VARCHAR(20) NOT NULL,
    [name] VARCHAR(200) NOT NULL,
    [description] NVARCHAR(MAX),
    [process_name] VARCHAR(200) NOT NULL,
    [process_owner] VARCHAR(100) NOT NULL,
    [process_owner_user_id] VARCHAR(36) NOT NULL,
    [unit] VARCHAR(20) NOT NULL,
    [polarity] VARCHAR(10) NOT NULL DEFAULT 'UP',
    [frequency] VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    [target_value] DECIMAL(18,4) NOT NULL,
    [current_value] DECIMAL(18,4) NOT NULL DEFAULT 0,
    [upper_limit] DECIMAL(18,4),
    [lower_limit] DECIMAL(18,4),
    [status] VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    [last_measured_at] DATETIME2,
    [created_by] VARCHAR(36) NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
);
GO

PRINT '⚠️ Rollback 0043 completed: reverted to old schema';
