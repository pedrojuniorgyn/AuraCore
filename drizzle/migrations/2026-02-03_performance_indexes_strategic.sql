-- Migration: Performance Indexes for Strategic Module (Cursor Pagination + Cache)
-- Date: 2026-02-03
-- Epic: E8.X - Task 01 - Performance Optimization
-- Author: AgenteAura
--
-- Objetivo: Adicionar índices otimizados para cursor pagination e queries com cache
-- 
-- IMPORTANTE: Testar em ambiente local antes de executar em homolog/prod
-- Rollback: Comandos DROP INDEX no final do arquivo

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================
-- STRATEGIC_STRATEGY INDEXES
-- Otimização: Dashboard executivo e listagens
-- ============================================

-- Índice para cursor pagination + multi-tenancy
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategy_tenant_created_desc')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategy_tenant_created_desc]
    ON [strategic_strategy] ([organization_id], [branch_id], [created_at] DESC)
    INCLUDE ([status], [vision_statement], [mission_statement])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_strategy_tenant_created_desc';
END
GO

-- Índice para filtro por status (queries comuns)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategy_tenant_status')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategy_tenant_status]
    ON [strategic_strategy] ([organization_id], [branch_id], [status])
    INCLUDE ([created_at], [updated_at])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_strategy_tenant_status';
END
GO

-- ============================================
-- STRATEGIC_KPI INDEXES
-- Otimização: Dashboard data query (busca 100 KPIs)
-- ============================================

-- Índice composto tenant + status + created_at (covering index)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_kpi_tenant_status_created')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_kpi_tenant_status_created]
    ON [strategic_kpi] ([organization_id], [branch_id], [status], [created_at] DESC)
    INCLUDE ([goal_id], [current_value], [target_value], [unit], [owner_user_id], [updated_at])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_kpi_tenant_status_created';
END
GO

-- Índice para cursor pagination sem filtro de status
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_kpi_tenant_created_desc')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_kpi_tenant_created_desc]
    ON [strategic_kpi] ([organization_id], [branch_id], [created_at] DESC)
    INCLUDE ([status], [goal_id], [current_value], [target_value])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_kpi_tenant_created_desc';
END
GO

-- ============================================
-- STRATEGIC_GOAL INDEXES
-- Otimização: Dashboard data query (busca 100 Goals)
-- ============================================

-- Índice para cursor pagination + covering columns
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_goal_tenant_created_desc')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_goal_tenant_created_desc]
    ON [strategic_goal] ([organization_id], [branch_id], [created_at] DESC)
    INCLUDE ([perspective_id], [current_value], [target_value], [status])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_goal_tenant_created_desc';
END
GO

-- Índice para filtro por perspectiva BSC
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_goal_tenant_perspective')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_goal_tenant_perspective]
    ON [strategic_goal] ([organization_id], [branch_id], [perspective_id])
    INCLUDE ([current_value], [target_value], [status])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_goal_tenant_perspective';
END
GO

-- ============================================
-- STRATEGIC_ACTION_PLAN INDEXES
-- Otimização: Dashboard actions (busca 10 mais urgentes)
-- ============================================

-- Índice para cursor pagination ordenado por when_end (ações mais urgentes)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_tenant_urgency')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_action_plan_tenant_urgency]
    ON [strategic_action_plan] ([organization_id], [branch_id], [when_end] ASC, [status])
    INCLUDE ([code], [what], [completion_percent], [created_at])
    WHERE [deleted_at] IS NULL AND [status] NOT IN ('COMPLETED', 'CANCELLED');
    PRINT 'Created: idx_action_plan_tenant_urgency';
END
GO

-- Índice para listagem geral com cursor pagination
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_tenant_created_desc')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_action_plan_tenant_created_desc]
    ON [strategic_action_plan] ([organization_id], [branch_id], [created_at] DESC)
    INCLUDE ([status], [when_end], [completion_percent])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_action_plan_tenant_created_desc';
END
GO

-- ============================================
-- STRATEGIC_APPROVAL_HISTORY INDEXES
-- Otimização: Relatórios e auditorias
-- ============================================

-- Índice para busca por período (findByPeriod)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approval_history_period')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_approval_history_period]
    ON [strategic_approval_history] ([organization_id], [branch_id], [created_at] DESC)
    INCLUDE ([entity_type], [entity_id], [action], [status], [approved_by])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_approval_history_period';
END
GO

-- Índice para busca por entidade específica
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approval_history_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_approval_history_entity]
    ON [strategic_approval_history] ([entity_id], [created_at] DESC)
    INCLUDE ([entity_type], [action], [status])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_approval_history_entity';
END
GO

-- ============================================
-- STRATEGIC_DEPARTMENTS INDEXES
-- Otimização: Cache de árvore de departamentos (TTL: 1h)
-- ============================================

-- Índice para busca hierárquica (parent_id)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_department_tenant_parent')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_department_tenant_parent]
    ON [strategic_department] ([organization_id], [branch_id], [parent_id])
    INCLUDE ([code], [name], [manager_user_id], [level])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_department_tenant_parent';
END
GO

-- Índice para busca raiz (parent_id IS NULL)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_department_tenant_root')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_department_tenant_root]
    ON [strategic_department] ([organization_id], [branch_id])
    INCLUDE ([code], [name], [level])
    WHERE [deleted_at] IS NULL AND [parent_id] IS NULL;
    PRINT 'Created: idx_department_tenant_root';
END
GO

-- ============================================
-- STRATEGIC_BSC_PERSPECTIVE INDEXES
-- Otimização: Cache de perspectivas BSC
-- ============================================

-- Índice para ordenação por display_order
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bsc_perspective_tenant_order')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bsc_perspective_tenant_order]
    ON [strategic_bsc_perspective] ([organization_id], [branch_id], [display_order] ASC)
    INCLUDE ([code], [name], [description])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_bsc_perspective_tenant_order';
END
GO

PRINT '✅ All performance indexes created successfully';
GO

-- ============================================
-- STATISTICS UPDATE
-- Forçar atualização de estatísticas para melhor query plan
-- ============================================

UPDATE STATISTICS [strategic_strategy] WITH FULLSCAN;
UPDATE STATISTICS [strategic_kpi] WITH FULLSCAN;
UPDATE STATISTICS [strategic_goal] WITH FULLSCAN;
UPDATE STATISTICS [strategic_action_plan] WITH FULLSCAN;
UPDATE STATISTICS [strategic_approval_history] WITH FULLSCAN;
UPDATE STATISTICS [strategic_department] WITH FULLSCAN;
UPDATE STATISTICS [strategic_bsc_perspective] WITH FULLSCAN;

PRINT '✅ Statistics updated';
GO

-- ============================================
-- ROLLBACK (se necessário)
-- ============================================
/*
-- Strategy
DROP INDEX IF EXISTS [idx_strategy_tenant_created_desc] ON [strategic_strategy];
DROP INDEX IF EXISTS [idx_strategy_tenant_status] ON [strategic_strategy];

-- KPI
DROP INDEX IF EXISTS [idx_kpi_tenant_status_created] ON [strategic_kpi];
DROP INDEX IF EXISTS [idx_kpi_tenant_created_desc] ON [strategic_kpi];

-- Goal
DROP INDEX IF EXISTS [idx_goal_tenant_created_desc] ON [strategic_goal];
DROP INDEX IF EXISTS [idx_goal_tenant_perspective] ON [strategic_goal];

-- Action Plan
DROP INDEX IF EXISTS [idx_action_plan_tenant_urgency] ON [strategic_action_plan];
DROP INDEX IF EXISTS [idx_action_plan_tenant_created_desc] ON [strategic_action_plan];

-- Approval History
DROP INDEX IF EXISTS [idx_approval_history_period] ON [strategic_approval_history];
DROP INDEX IF EXISTS [idx_approval_history_entity] ON [strategic_approval_history];

-- Department
DROP INDEX IF EXISTS [idx_department_tenant_parent] ON [strategic_department];
DROP INDEX IF EXISTS [idx_department_tenant_root] ON [strategic_department];

-- BSC Perspective
DROP INDEX IF EXISTS [idx_bsc_perspective_tenant_order] ON [strategic_bsc_perspective];

PRINT 'Rollback completed';
*/
