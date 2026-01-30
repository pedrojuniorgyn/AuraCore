-- Migration: Add who type fields to action plans
-- Date: 2026-01-30
-- Refs: BUG-014

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Adicionar novos campos
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan') AND name = 'who_type')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_type] VARCHAR(20) NOT NULL DEFAULT 'USER';
    PRINT 'Added column: who_type';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan') AND name = 'who_email')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_email] VARCHAR(255) NULL;
    PRINT 'Added column: who_email';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan') AND name = 'who_partner_id')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_partner_id] VARCHAR(36) NULL;
    PRINT 'Added column: who_partner_id';
END
GO

-- Alterar coluna who_user_id para permitir NULL (para retrocompatibilidade)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan') AND name = 'who_user_id' AND is_nullable = 0)
BEGIN
    ALTER TABLE [strategic_action_plan]
    ALTER COLUMN [who_user_id] VARCHAR(36) NULL;
    PRINT 'Modified column: who_user_id (now nullable)';
END
GO

PRINT 'Migration 0030 completed: who_type fields added to action_plans';
GO
