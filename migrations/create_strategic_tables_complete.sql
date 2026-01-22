-- ==========================================
-- MIGRATION: Criar TODAS as Tabelas do Módulo Strategic
-- Data: 2026-01-22
-- Épico: HOTFIX-SCHEMA-V1.0
-- ==========================================

-- 1. strategic_strategies
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_strategies')
BEGIN
    CREATE TABLE strategic_strategies (
        id NVARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        start_date DATETIME2 NOT NULL,
        end_date DATETIME2 NOT NULL,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    CREATE INDEX idx_strategies_tenant ON strategic_strategies(organization_id, branch_id);
    PRINT '✅ strategic_strategies criada';
END
ELSE
    PRINT '⚠️  strategic_strategies já existe';

-- 2. strategic_goals
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_goals')
BEGIN
    CREATE TABLE strategic_goals (
        id NVARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        strategy_id NVARCHAR(36),
        code NVARCHAR(20) NOT NULL,
        description NVARCHAR(500) NOT NULL,
        perspective_id NVARCHAR(50) NOT NULL,
        cascade_level NVARCHAR(20) NOT NULL,
        parent_goal_id NVARCHAR(36),
        owner_user_id NVARCHAR(36) NOT NULL,
        target_value DECIMAL(18,2) NOT NULL,
        current_value DECIMAL(18,2) NOT NULL DEFAULT 0,
        unit NVARCHAR(20) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        map_position_x INT,
        map_position_y INT,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    CREATE INDEX idx_goals_tenant ON strategic_goals(organization_id, branch_id);
    CREATE INDEX idx_goals_strategy ON strategic_goals(strategy_id);
    CREATE INDEX idx_goals_parent ON strategic_goals(parent_goal_id);
    PRINT '✅ strategic_goals criada';
END
ELSE
    PRINT '⚠️  strategic_goals já existe';

-- 3. strategic_kpis
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_kpis')
BEGIN
    CREATE TABLE strategic_kpis (
        id NVARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        goal_id NVARCHAR(36) NOT NULL,
        code NVARCHAR(20) NOT NULL,
        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        measurement_unit NVARCHAR(20) NOT NULL,
        target_value DECIMAL(18,2) NOT NULL,
        current_value DECIMAL(18,2) NOT NULL DEFAULT 0,
        frequency NVARCHAR(20) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        owner_user_id NVARCHAR(36) NOT NULL,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    CREATE INDEX idx_kpis_tenant ON strategic_kpis(organization_id, branch_id);
    CREATE INDEX idx_kpis_goal ON strategic_kpis(goal_id);
    PRINT '✅ strategic_kpis criada';
END
ELSE
    PRINT '⚠️  strategic_kpis já existe';

-- 4. strategic_action_plans
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_action_plans')
BEGIN
    CREATE TABLE strategic_action_plans (
        id NVARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        goal_id NVARCHAR(36),
        code NVARCHAR(20) NOT NULL,
        what_action NVARCHAR(500) NOT NULL,
        why_reason NVARCHAR(MAX),
        where_location NVARCHAR(200),
        when_start DATETIME2 NOT NULL,
        when_end DATETIME2 NOT NULL,
        who_user_id NVARCHAR(36) NOT NULL,
        how_method NVARCHAR(MAX),
        how_much_cost DECIMAL(18,2),
        how_much_currency NVARCHAR(3) DEFAULT 'BRL',
        pdca_cycle NVARCHAR(10) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
        priority NVARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        parent_action_plan_id NVARCHAR(36),
        next_follow_up_date DATETIME2,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    CREATE INDEX idx_action_plans_tenant ON strategic_action_plans(organization_id, branch_id);
    CREATE INDEX idx_action_plans_goal ON strategic_action_plans(goal_id);
    CREATE INDEX idx_action_plans_status ON strategic_action_plans(status);
    PRINT '✅ strategic_action_plans criada';
END
ELSE
    PRINT '⚠️  strategic_action_plans já existe';

-- 5. strategic_swot
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_swot')
BEGIN
    CREATE TABLE strategic_swot (
        id NVARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        strategy_id NVARCHAR(36),
        type NVARCHAR(20) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        impact NVARCHAR(10) NOT NULL,
        priority NVARCHAR(10) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    CREATE INDEX idx_swot_tenant ON strategic_swot(organization_id, branch_id);
    CREATE INDEX idx_swot_strategy ON strategic_swot(strategy_id);
    CREATE INDEX idx_swot_type ON strategic_swot(type);
    PRINT '✅ strategic_swot criada';
END
ELSE
    PRINT '⚠️  strategic_swot já existe';

-- 6. strategic_war_room_meetings
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_war_room_meetings')
BEGIN
    CREATE TABLE strategic_war_room_meetings (
        id NVARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        meeting_date DATETIME2 NOT NULL,
        duration_minutes INT NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
        participants NVARCHAR(MAX),
        agenda NVARCHAR(MAX),
        decisions NVARCHAR(MAX),
        action_items NVARCHAR(MAX),
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    CREATE INDEX idx_meetings_tenant ON strategic_war_room_meetings(organization_id, branch_id);
    CREATE INDEX idx_meetings_date ON strategic_war_room_meetings(meeting_date);
    PRINT '✅ strategic_war_room_meetings criada';
END
ELSE
    PRINT '⚠️  strategic_war_room_meetings já existe';

PRINT '';
PRINT '==========================================';
PRINT '✅ MIGRATION STRATEGIC COMPLETA!';
PRINT '==========================================';
PRINT 'Tabelas criadas:';
PRINT '  1. strategic_strategies';
PRINT '  2. strategic_goals';
PRINT '  3. strategic_kpis';
PRINT '  4. strategic_action_plans';
PRINT '  5. strategic_swot';
PRINT '  6. strategic_war_room_meetings';
PRINT '  7. strategic_idea_box (já criada anteriormente)';
PRINT '';
