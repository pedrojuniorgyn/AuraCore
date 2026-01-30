-- Migration: Add temporal indexes for Strategic module
-- Date: 2026-01-29
-- Refs: GAP-I02, ANALISE_ARQUITETURAL_ENTERPRISE.md
--
-- Rollback: DROP INDEX statements at the end

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================
-- STRATEGIC_GOAL INDEXES
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_goal_start_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_goal_start_date]
    ON [strategic_goal] ([start_date])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_strategic_goal_start_date';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_goal_due_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_goal_due_date]
    ON [strategic_goal] ([due_date])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_strategic_goal_due_date';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_goal_period')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_goal_period]
    ON [strategic_goal] ([organization_id], [branch_id], [start_date], [due_date])
    INCLUDE ([status], [current_value], [target_value])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_strategic_goal_period';
END
GO

-- ============================================
-- STRATEGIC_ACTION_PLAN INDEXES
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_when_start')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_action_plan_when_start]
    ON [strategic_action_plan] ([when_start])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_action_plan_when_start';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_when_end')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_action_plan_when_end]
    ON [strategic_action_plan] ([when_end])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_action_plan_when_end';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_period')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_action_plan_period]
    ON [strategic_action_plan] ([organization_id], [branch_id], [when_start], [when_end])
    INCLUDE ([status], [pdca_cycle], [completion_percent])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_action_plan_period';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_overdue')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_action_plan_overdue]
    ON [strategic_action_plan] ([organization_id], [branch_id], [when_end], [status])
    WHERE [deleted_at] IS NULL AND [status] NOT IN ('COMPLETED', 'CANCELLED');
    PRINT 'Created: idx_action_plan_overdue';
END
GO

-- ============================================
-- STRATEGIC_KPI INDEXES
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_kpi_last_updated')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_kpi_last_updated]
    ON [strategic_kpi] ([updated_at])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_strategic_kpi_last_updated';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_kpi_tenant_updated')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_kpi_tenant_updated]
    ON [strategic_kpi] ([organization_id], [branch_id], [updated_at])
    INCLUDE ([current_value], [target_value], [status])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_strategic_kpi_tenant_updated';
END
GO

-- ============================================
-- STRATEGIC_KPI_HISTORY INDEXES
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_kpi_history_period_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_kpi_history_period_date]
    ON [strategic_kpi_history] ([period_date]);
    PRINT 'Created: idx_kpi_history_period_date';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_kpi_history_kpi_period')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_kpi_history_kpi_period]
    ON [strategic_kpi_history] ([kpi_id], [period_date])
    INCLUDE ([value]);
    PRINT 'Created: idx_kpi_history_kpi_period';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_kpi_history_date_range')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_kpi_history_date_range]
    ON [strategic_kpi_history] ([kpi_id], [period_date], [value]);
    PRINT 'Created: idx_kpi_history_date_range';
END
GO

-- ============================================
-- STRATEGIC_WAR_ROOM_MEETING INDEXES
-- ============================================

-- Note: idx_war_room_meeting_scheduled already exists, skip creation

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_war_room_meeting_tenant_schedule')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_war_room_meeting_tenant_schedule]
    ON [strategic_war_room_meeting] ([organization_id], [branch_id], [scheduled_at])
    INCLUDE ([status], [meeting_type])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_war_room_meeting_tenant_schedule';
END
GO

PRINT '✅ All temporal indexes created successfully';
GO

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
/*
DROP INDEX IF EXISTS [idx_strategic_goal_start_date] ON [strategic_goal];
DROP INDEX IF EXISTS [idx_strategic_goal_due_date] ON [strategic_goal];
DROP INDEX IF EXISTS [idx_strategic_goal_period] ON [strategic_goal];
DROP INDEX IF EXISTS [idx_action_plan_when_start] ON [strategic_action_plan];
DROP INDEX IF EXISTS [idx_action_plan_when_end] ON [strategic_action_plan];
DROP INDEX IF EXISTS [idx_action_plan_period] ON [strategic_action_plan];
DROP INDEX IF EXISTS [idx_action_plan_overdue] ON [strategic_action_plan];
DROP INDEX IF EXISTS [idx_strategic_kpi_last_updated] ON [strategic_kpi];
DROP INDEX IF EXISTS [idx_strategic_kpi_tenant_updated] ON [strategic_kpi];
DROP INDEX IF EXISTS [idx_kpi_history_period_date] ON [strategic_kpi_history];
DROP INDEX IF EXISTS [idx_kpi_history_kpi_period] ON [strategic_kpi_history];
DROP INDEX IF EXISTS [idx_kpi_history_date_range] ON [strategic_kpi_history];
DROP INDEX IF EXISTS [idx_war_room_meeting_tenant_schedule] ON [strategic_war_room_meeting];
*/
