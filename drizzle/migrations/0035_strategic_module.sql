-- Migration: Strategic Module (E10 - Fase F1)
-- Descrição: Criar tabelas e índices do módulo de Gestão Estratégica
-- Data: 2026-01-19
-- Refs: ADR-0020, ADR-0021, ADR-0022, ADR-0023

-- =============================================================================
-- TABELAS
-- =============================================================================

-- Strategy (Estratégia)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_strategy')
BEGIN
    CREATE TABLE strategic_strategy (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        vision NVARCHAR(MAX),
        mission NVARCHAR(MAX),
        [values] NVARCHAR(MAX), -- JSON array
        start_date DATETIME2 NOT NULL,
        end_date DATETIME2 NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- BSC Perspective
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_bsc_perspective')
BEGIN
    CREATE TABLE strategic_bsc_perspective (
        id VARCHAR(36) PRIMARY KEY,
        strategy_id VARCHAR(36) NOT NULL REFERENCES strategic_strategy(id),
        code VARCHAR(3) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500),
        order_index INT NOT NULL,
        weight DECIMAL(5,2) NOT NULL DEFAULT 25.00,
        color VARCHAR(7) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- Strategic Goal
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_goal')
BEGIN
    CREATE TABLE strategic_goal (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        perspective_id VARCHAR(36) NOT NULL REFERENCES strategic_bsc_perspective(id),
        parent_goal_id VARCHAR(36),
        code VARCHAR(20) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        cascade_level VARCHAR(20) NOT NULL,
        target_value DECIMAL(18,4) NOT NULL,
        current_value DECIMAL(18,4) NOT NULL DEFAULT 0,
        baseline_value DECIMAL(18,4),
        unit VARCHAR(20) NOT NULL,
        polarity VARCHAR(10) NOT NULL DEFAULT 'UP',
        weight DECIMAL(5,2) NOT NULL,
        owner_user_id VARCHAR(36) NOT NULL,
        owner_branch_id INT NOT NULL,
        start_date DATETIME2 NOT NULL,
        due_date DATETIME2 NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
        map_position_x INT,
        map_position_y INT,
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- Goal Cascade (Relações N:N causa-efeito)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_goal_cascade')
BEGIN
    CREATE TABLE strategic_goal_cascade (
        id VARCHAR(36) PRIMARY KEY,
        cause_goal_id VARCHAR(36) NOT NULL REFERENCES strategic_goal(id),
        effect_goal_id VARCHAR(36) NOT NULL REFERENCES strategic_goal(id),
        contribution_weight DECIMAL(5,2) NOT NULL DEFAULT 100.00,
        description VARCHAR(500),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- KPI
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_kpi')
BEGIN
    CREATE TABLE strategic_kpi (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        goal_id VARCHAR(36) REFERENCES strategic_goal(id),
        code VARCHAR(30) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        unit VARCHAR(20) NOT NULL,
        polarity VARCHAR(10) NOT NULL DEFAULT 'UP',
        frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
        target_value DECIMAL(18,4) NOT NULL,
        current_value DECIMAL(18,4) NOT NULL DEFAULT 0,
        baseline_value DECIMAL(18,4),
        alert_threshold DECIMAL(5,2) NOT NULL DEFAULT 10.00,
        critical_threshold DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        auto_calculate BIT NOT NULL DEFAULT 0,
        source_module VARCHAR(50),
        source_query NVARCHAR(MAX),
        status VARCHAR(20) NOT NULL DEFAULT 'GREEN',
        last_calculated_at DATETIME2,
        owner_user_id VARCHAR(36) NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- KPI History
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_kpi_history')
BEGIN
    CREATE TABLE strategic_kpi_history (
        id VARCHAR(36) PRIMARY KEY,
        kpi_id VARCHAR(36) NOT NULL REFERENCES strategic_kpi(id),
        period_date DATETIME2 NOT NULL,
        period_type VARCHAR(20) NOT NULL,
        value DECIMAL(18,4) NOT NULL,
        target_value DECIMAL(18,4) NOT NULL,
        variance DECIMAL(18,4) NOT NULL,
        variance_percent DECIMAL(8,4) NOT NULL,
        status VARCHAR(20) NOT NULL,
        source_type VARCHAR(20) NOT NULL,
        source_user_id VARCHAR(36),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- Action Plan (5W2H + PDCA)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_action_plan')
BEGIN
    CREATE TABLE strategic_action_plan (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        goal_id VARCHAR(36) REFERENCES strategic_goal(id),
        code VARCHAR(20) NOT NULL,
        what NVARCHAR(MAX) NOT NULL,
        why NVARCHAR(MAX) NOT NULL,
        where_location VARCHAR(200) NOT NULL,
        when_start DATETIME2 NOT NULL,
        when_end DATETIME2 NOT NULL,
        who VARCHAR(100) NOT NULL,
        who_user_id VARCHAR(36) NOT NULL,
        how NVARCHAR(MAX) NOT NULL,
        how_much_amount DECIMAL(18,2),
        how_much_currency VARCHAR(3) DEFAULT 'BRL',
        pdca_cycle VARCHAR(10) NOT NULL DEFAULT 'PLAN',
        completion_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        parent_action_plan_id VARCHAR(36),
        reproposition_number INT NOT NULL DEFAULT 0,
        reproposition_reason NVARCHAR(MAX),
        priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        evidence_urls NVARCHAR(MAX),
        next_follow_up_date DATETIME2,
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- Action Plan Follow-up (3G - Falconi)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_action_plan_follow_up')
BEGIN
    CREATE TABLE strategic_action_plan_follow_up (
        id VARCHAR(36) PRIMARY KEY,
        action_plan_id VARCHAR(36) NOT NULL REFERENCES strategic_action_plan(id),
        follow_up_number INT NOT NULL,
        follow_up_date DATETIME2 NOT NULL,
        gemba_local VARCHAR(500) NOT NULL,
        gembutsu_observation NVARCHAR(MAX) NOT NULL,
        genjitsu_data NVARCHAR(MAX) NOT NULL,
        execution_status VARCHAR(20) NOT NULL,
        execution_percent DECIMAL(5,2) NOT NULL,
        problems_observed NVARCHAR(MAX),
        problem_severity VARCHAR(20),
        requires_new_plan BIT NOT NULL DEFAULT 0,
        new_plan_description NVARCHAR(MAX),
        new_plan_assigned_to VARCHAR(36),
        child_action_plan_id VARCHAR(36),
        verified_by VARCHAR(36) NOT NULL,
        verified_at DATETIME2 NOT NULL,
        evidence_urls NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- PDCA Cycle (Histórico de transições)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_pdca_cycle')
BEGIN
    CREATE TABLE strategic_pdca_cycle (
        id VARCHAR(36) PRIMARY KEY,
        action_plan_id VARCHAR(36) NOT NULL REFERENCES strategic_action_plan(id),
        from_phase VARCHAR(10) NOT NULL,
        to_phase VARCHAR(10) NOT NULL,
        transition_reason NVARCHAR(MAX),
        evidences NVARCHAR(MAX),
        completion_percent INT NOT NULL,
        transitioned_by VARCHAR(36) NOT NULL,
        transitioned_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- Control Item (IC - GEROT)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_control_item')
BEGIN
    CREATE TABLE strategic_control_item (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        process_name VARCHAR(200) NOT NULL,
        process_owner VARCHAR(100) NOT NULL,
        process_owner_user_id VARCHAR(36) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        polarity VARCHAR(10) NOT NULL DEFAULT 'UP',
        frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
        target_value DECIMAL(18,4) NOT NULL,
        current_value DECIMAL(18,4) NOT NULL DEFAULT 0,
        upper_limit DECIMAL(18,4),
        lower_limit DECIMAL(18,4),
        status VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        last_measured_at DATETIME2,
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- Verification Item (IV - GEROT)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_verification_item')
BEGIN
    CREATE TABLE strategic_verification_item (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        control_item_id VARCHAR(36) NOT NULL REFERENCES strategic_control_item(id),
        code VARCHAR(20) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        unit VARCHAR(20) NOT NULL,
        polarity VARCHAR(10) NOT NULL DEFAULT 'UP',
        frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY',
        influence_weight DECIMAL(5,2) NOT NULL DEFAULT 100.00,
        target_value DECIMAL(18,4) NOT NULL,
        current_value DECIMAL(18,4) NOT NULL DEFAULT 0,
        measured_by VARCHAR(36),
        last_measured_at DATETIME2,
        status VARCHAR(20) NOT NULL DEFAULT 'OK',
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- SWOT Analysis
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_swot_analysis')
BEGIN
    CREATE TABLE strategic_swot_analysis (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        strategy_id VARCHAR(36) REFERENCES strategic_strategy(id),
        quadrant VARCHAR(15) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        impact_score DECIMAL(3,1) NOT NULL DEFAULT 3,
        probability_score DECIMAL(3,1) NOT NULL DEFAULT 3,
        priority_score DECIMAL(5,2),
        category VARCHAR(50),
        converted_to_action_plan_id VARCHAR(36),
        converted_to_goal_id VARCHAR(36),
        status VARCHAR(20) NOT NULL DEFAULT 'IDENTIFIED',
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- War Room Meeting
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_war_room_meeting')
BEGIN
    CREATE TABLE strategic_war_room_meeting (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        strategy_id VARCHAR(36) REFERENCES strategic_strategy(id),
        meeting_type VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        scheduled_at DATETIME2 NOT NULL,
        expected_duration INT NOT NULL DEFAULT 60,
        started_at DATETIME2,
        ended_at DATETIME2,
        participants NVARCHAR(MAX),
        agenda_items NVARCHAR(MAX),
        decisions NVARCHAR(MAX),
        minutes NVARCHAR(MAX),
        minutes_generated_at DATETIME2,
        status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
        facilitator_user_id VARCHAR(36) NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- Idea Box
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_idea_box')
BEGIN
    CREATE TABLE strategic_idea_box (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        submitted_by VARCHAR(36) NOT NULL,
        submitted_by_name VARCHAR(100),
        department VARCHAR(100),
        urgency VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        importance VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        estimated_impact VARCHAR(20),
        estimated_cost DECIMAL(18,2),
        estimated_cost_currency VARCHAR(3) DEFAULT 'BRL',
        estimated_benefit DECIMAL(18,2),
        estimated_benefit_currency VARCHAR(3) DEFAULT 'BRL',
        status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
        reviewed_by VARCHAR(36),
        reviewed_at DATETIME2,
        review_notes NVARCHAR(MAX),
        converted_to VARCHAR(50),
        converted_entity_id VARCHAR(36),
        converted_at DATETIME2,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- Standard Procedure
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_standard_procedure')
BEGIN
    CREATE TABLE strategic_standard_procedure (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        source_action_plan_id VARCHAR(36) REFERENCES strategic_action_plan(id),
        code VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        problem_description NVARCHAR(MAX) NOT NULL,
        root_cause NVARCHAR(MAX),
        solution NVARCHAR(MAX) NOT NULL,
        standard_operating_procedure NVARCHAR(MAX),
        department VARCHAR(100),
        process_name VARCHAR(200),
        owner_user_id VARCHAR(36) NOT NULL,
        version INT NOT NULL DEFAULT 1,
        last_review_date DATETIME2,
        next_review_date DATETIME2,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        attachments NVARCHAR(MAX),
        created_by VARCHAR(36) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
END
GO

-- =============================================================================
-- ÍNDICES (SCHEMA-003: Índice composto multi-tenancy OBRIGATÓRIO)
-- =============================================================================

-- Strategy
CREATE INDEX idx_strategic_strategy_tenant ON strategic_strategy (organization_id, branch_id);
CREATE INDEX idx_strategic_strategy_status ON strategic_strategy (status);
GO

-- BSC Perspective
CREATE INDEX idx_bsc_perspective_strategy ON strategic_bsc_perspective (strategy_id);
CREATE UNIQUE INDEX idx_bsc_perspective_code ON strategic_bsc_perspective (strategy_id, code);
GO

-- Strategic Goal
CREATE INDEX idx_strategic_goal_tenant ON strategic_goal (organization_id, branch_id);
CREATE INDEX idx_strategic_goal_perspective ON strategic_goal (perspective_id);
CREATE INDEX idx_strategic_goal_parent ON strategic_goal (parent_goal_id);
CREATE INDEX idx_strategic_goal_cascade ON strategic_goal (cascade_level);
CREATE INDEX idx_strategic_goal_status ON strategic_goal (status);
CREATE INDEX idx_strategic_goal_owner ON strategic_goal (owner_user_id);
GO

-- Goal Cascade
CREATE INDEX idx_goal_cascade_cause ON strategic_goal_cascade (cause_goal_id);
CREATE INDEX idx_goal_cascade_effect ON strategic_goal_cascade (effect_goal_id);
CREATE UNIQUE INDEX idx_goal_cascade_unique ON strategic_goal_cascade (cause_goal_id, effect_goal_id);
GO

-- KPI
CREATE INDEX idx_kpi_tenant ON strategic_kpi (organization_id, branch_id);
CREATE INDEX idx_kpi_goal ON strategic_kpi (goal_id);
CREATE INDEX idx_kpi_code ON strategic_kpi (organization_id, branch_id, code);
CREATE INDEX idx_kpi_status ON strategic_kpi (status);
CREATE INDEX idx_kpi_source ON strategic_kpi (source_module);
GO

-- KPI History
CREATE INDEX idx_kpi_history_kpi ON strategic_kpi_history (kpi_id);
CREATE INDEX idx_kpi_history_period ON strategic_kpi_history (kpi_id, period_date);
CREATE INDEX idx_kpi_history_date ON strategic_kpi_history (period_date);
GO

-- Action Plan
CREATE INDEX idx_action_plan_tenant ON strategic_action_plan (organization_id, branch_id);
CREATE INDEX idx_action_plan_goal ON strategic_action_plan (goal_id);
CREATE INDEX idx_action_plan_pdca ON strategic_action_plan (pdca_cycle);
CREATE INDEX idx_action_plan_status ON strategic_action_plan (status);
CREATE INDEX idx_action_plan_parent ON strategic_action_plan (parent_action_plan_id);
CREATE INDEX idx_action_plan_who ON strategic_action_plan (who_user_id);
CREATE INDEX idx_action_plan_follow_up ON strategic_action_plan (next_follow_up_date);
GO

-- Follow-up
CREATE INDEX idx_follow_up_action_plan ON strategic_action_plan_follow_up (action_plan_id);
CREATE INDEX idx_follow_up_date ON strategic_action_plan_follow_up (follow_up_date);
CREATE INDEX idx_follow_up_status ON strategic_action_plan_follow_up (execution_status);
CREATE INDEX idx_follow_up_verifier ON strategic_action_plan_follow_up (verified_by);
GO

-- PDCA Cycle
CREATE INDEX idx_pdca_cycle_action_plan ON strategic_pdca_cycle (action_plan_id);
CREATE INDEX idx_pdca_cycle_transition ON strategic_pdca_cycle (transitioned_at);
CREATE INDEX idx_pdca_cycle_phase ON strategic_pdca_cycle (to_phase);
GO

-- Control Item
CREATE INDEX idx_control_item_tenant ON strategic_control_item (organization_id, branch_id);
CREATE INDEX idx_control_item_code ON strategic_control_item (organization_id, branch_id, code);
CREATE INDEX idx_control_item_status ON strategic_control_item (status);
CREATE INDEX idx_control_item_owner ON strategic_control_item (process_owner_user_id);
GO

-- Verification Item
CREATE INDEX idx_verification_item_tenant ON strategic_verification_item (organization_id, branch_id);
CREATE INDEX idx_verification_item_control ON strategic_verification_item (control_item_id);
CREATE INDEX idx_verification_item_code ON strategic_verification_item (organization_id, branch_id, code);
CREATE INDEX idx_verification_item_status ON strategic_verification_item (status);
GO

-- SWOT Analysis
CREATE INDEX idx_swot_tenant ON strategic_swot_analysis (organization_id, branch_id);
CREATE INDEX idx_swot_strategy ON strategic_swot_analysis (strategy_id);
CREATE INDEX idx_swot_quadrant ON strategic_swot_analysis (quadrant);
CREATE INDEX idx_swot_priority ON strategic_swot_analysis (priority_score);
CREATE INDEX idx_swot_status ON strategic_swot_analysis (status);
GO

-- War Room Meeting
CREATE INDEX idx_war_room_meeting_tenant ON strategic_war_room_meeting (organization_id, branch_id);
CREATE INDEX idx_war_room_meeting_strategy ON strategic_war_room_meeting (strategy_id);
CREATE INDEX idx_war_room_meeting_type ON strategic_war_room_meeting (meeting_type);
CREATE INDEX idx_war_room_meeting_scheduled ON strategic_war_room_meeting (scheduled_at);
CREATE INDEX idx_war_room_meeting_status ON strategic_war_room_meeting (status);
CREATE INDEX idx_war_room_meeting_facilitator ON strategic_war_room_meeting (facilitator_user_id);
GO

-- Idea Box
CREATE INDEX idx_idea_box_tenant ON strategic_idea_box (organization_id, branch_id);
CREATE INDEX idx_idea_box_code ON strategic_idea_box (organization_id, branch_id, code);
CREATE INDEX idx_idea_box_status ON strategic_idea_box (status);
CREATE INDEX idx_idea_box_submitter ON strategic_idea_box (submitted_by);
CREATE INDEX idx_idea_box_source ON strategic_idea_box (source_type);
GO

-- Standard Procedure
CREATE INDEX idx_standard_procedure_tenant ON strategic_standard_procedure (organization_id, branch_id);
CREATE INDEX idx_standard_procedure_code ON strategic_standard_procedure (organization_id, branch_id, code);
CREATE INDEX idx_standard_procedure_source ON strategic_standard_procedure (source_action_plan_id);
CREATE INDEX idx_standard_procedure_status ON strategic_standard_procedure (status);
CREATE INDEX idx_standard_procedure_owner ON strategic_standard_procedure (owner_user_id);
CREATE INDEX idx_standard_procedure_review ON strategic_standard_procedure (next_review_date);
GO

PRINT 'Migration 0035_strategic_module concluída com sucesso!';
GO
