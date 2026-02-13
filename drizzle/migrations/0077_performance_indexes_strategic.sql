-- Migration: Performance Indexes for Strategic Module (Cursor Pagination + Cache)
-- Date: 2026-02-03
-- Epic: E8.X - Task 01 - Performance Optimization
-- Author: AgenteAura
--
-- Objetivo: Adicionar índices otimizados para cursor pagination e queries com cache
-- 
-- IMPORTANTE: Testar em ambiente local antes de executar em homolog/prod
-- Rollback: Comandos DROP INDEX no final do arquivo
--
-- HOTFIX 2026-02-13: Corrigido nomes de colunas/tabelas para corresponder ao schema real do banco

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================
-- STRATEGIC_STRATEGY INDEXES
-- Otimização: Dashboard executivo e listagens
-- ============================================

-- Índice para cursor pagination + multi-tenancy
-- Nota: vision/mission são TEXT e não podem ser INCLUDE em índices SQL Server
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategy_tenant_created_desc')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategy_tenant_created_desc]
    ON [strategic_strategy] ([organization_id], [branch_id], [created_at] DESC)
    INCLUDE ([status], [name])
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
-- Nota: SQL Server filtered indexes não suportam NOT IN, usando <> em vez disso
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_tenant_urgency')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_action_plan_tenant_urgency]
    ON [strategic_action_plan] ([organization_id], [branch_id], [when_end] ASC, [status])
    INCLUDE ([code], [completion_percent], [created_at])
    WHERE [deleted_at] IS NULL AND [status] <> 'COMPLETED' AND [status] <> 'CANCELLED';
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
-- Nota: Tabela criada pelo 0053 com from_status, to_status, deleted_at
--       (0076 IF NOT EXISTS nunca executa pois 0053 roda primeiro)
-- ============================================

-- Índice para busca por período (findByPeriod)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approval_history_period')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_approval_history_period]
    ON [strategic_approval_history] ([organization_id], [branch_id], [created_at] DESC)
    INCLUDE ([strategy_id], [action], [to_status], [actor_user_id])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_approval_history_period';
END
GO

-- Índice para busca por estratégia específica
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approval_history_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_approval_history_entity]
    ON [strategic_approval_history] ([strategy_id], [created_at] DESC)
    INCLUDE ([action], [to_status])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_approval_history_entity';
END
GO

-- ============================================
-- DEPARTMENT INDEXES (tabela = department, NÃO strategic_department)
-- Otimização: Cache de árvore de departamentos (TTL: 1h)
-- ============================================

-- Índice para busca hierárquica (parent_id)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_department_tenant_parent')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_department_tenant_parent]
    ON [department] ([organization_id], [branch_id], [parent_id])
    INCLUDE ([code], [name], [is_active])
    WHERE [deleted_at] IS NULL;
    PRINT 'Created: idx_department_tenant_parent';
END
GO

-- Índice para busca raiz (parent_id IS NULL)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_department_tenant_root')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_department_tenant_root]
    ON [department] ([organization_id], [branch_id])
    INCLUDE ([code], [name])
    WHERE [deleted_at] IS NULL AND [parent_id] IS NULL;
    PRINT 'Created: idx_department_tenant_root';
END
GO

-- ============================================
-- STRATEGIC_BSC_PERSPECTIVE INDEXES
-- Otimização: Cache de perspectivas BSC
-- Nota: Tabela NÃO possui organization_id/branch_id diretos,
--       usa strategy_id como FK. Também NÃO possui deleted_at.
--       Coluna de ordenação é order_index (não display_order).
-- ============================================

-- Índice para ordenação por order_index dentro de uma estratégia
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bsc_perspective_tenant_order')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bsc_perspective_tenant_order]
    ON [strategic_bsc_perspective] ([strategy_id], [order_index] ASC)
    INCLUDE ([code], [name], [description]);
    PRINT 'Created: idx_bsc_perspective_tenant_order';
END
GO

PRINT '✅ All performance indexes created successfully';
GO

-- ============================================
-- STATISTICS UPDATE
-- Forçar atualização de estatísticas para melhor query plan
-- ============================================

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_strategy') UPDATE STATISTICS [strategic_strategy] WITH FULLSCAN;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_kpi') UPDATE STATISTICS [strategic_kpi] WITH FULLSCAN;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_goal') UPDATE STATISTICS [strategic_goal] WITH FULLSCAN;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_action_plan') UPDATE STATISTICS [strategic_action_plan] WITH FULLSCAN;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_approval_history') UPDATE STATISTICS [strategic_approval_history] WITH FULLSCAN;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'department') UPDATE STATISTICS [department] WITH FULLSCAN;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_bsc_perspective') UPDATE STATISTICS [strategic_bsc_perspective] WITH FULLSCAN;

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
DROP INDEX IF EXISTS [idx_department_tenant_parent] ON [department];
DROP INDEX IF EXISTS [idx_department_tenant_root] ON [department];

-- BSC Perspective
DROP INDEX IF EXISTS [idx_bsc_perspective_tenant_order] ON [strategic_bsc_perspective];

PRINT 'Rollback completed';
*/
