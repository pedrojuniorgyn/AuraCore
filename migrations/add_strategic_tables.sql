-- ==========================================
-- MIGRATION: Adicionar Tabelas e Colunas do Módulo Strategic
-- Data: 2026-01-22
-- Épico: HOTFIX-SCHEMA-V1.0
-- ==========================================

-- 1. Criar tabela strategic_idea_box
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'strategic_idea_box')
BEGIN
    CREATE TABLE strategic_idea_box (
        id NVARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        code NVARCHAR(20) NOT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        source_type NVARCHAR(50) NOT NULL,
        category NVARCHAR(100),
        submitted_by NVARCHAR(36) NOT NULL,
        submitted_by_name NVARCHAR(100),
        department NVARCHAR(100),
        urgency NVARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        importance NVARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        estimated_impact NVARCHAR(20),
        estimated_cost DECIMAL(18,2),
        estimated_cost_currency NVARCHAR(3) DEFAULT 'BRL',
        estimated_benefit DECIMAL(18,2),
        estimated_benefit_currency NVARCHAR(3) DEFAULT 'BRL',
        status NVARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
        reviewed_by NVARCHAR(36),
        reviewed_at DATETIME2,
        review_notes NVARCHAR(MAX),
        converted_to NVARCHAR(50),
        converted_entity_id NVARCHAR(36),
        converted_at DATETIME2,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    
    CREATE INDEX idx_idea_box_tenant ON strategic_idea_box(organization_id, branch_id);
    CREATE INDEX idx_idea_box_code ON strategic_idea_box(organization_id, branch_id, code);
    CREATE INDEX idx_idea_box_status ON strategic_idea_box(status);
    CREATE INDEX idx_idea_box_submitter ON strategic_idea_box(submitted_by);
    CREATE INDEX idx_idea_box_source ON strategic_idea_box(source_type);
    
    PRINT '✅ strategic_idea_box criada';
END
ELSE
    PRINT '⚠️  strategic_idea_box já existe';

-- 2. Adicionar coluna created_by em strategic_goals (se não existir)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_goals' AND COLUMN_NAME = 'created_by')
BEGIN
    ALTER TABLE strategic_goals ADD created_by NVARCHAR(255) NOT NULL DEFAULT 'system';
    PRINT '✅ Coluna created_by adicionada em strategic_goals';
END
ELSE
    PRINT '⚠️  Coluna created_by já existe em strategic_goals';

-- 3. Adicionar coluna created_by em strategic_kpis (se não existir)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_kpis' AND COLUMN_NAME = 'created_by')
BEGIN
    ALTER TABLE strategic_kpis ADD created_by NVARCHAR(255) NOT NULL DEFAULT 'system';
    PRINT '✅ Coluna created_by adicionada em strategic_kpis';
END
ELSE
    PRINT '⚠️  Coluna created_by já existe em strategic_kpis';

-- 4. Adicionar coluna created_by em strategic_action_plans (se não existir)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_action_plans' AND COLUMN_NAME = 'created_by')
BEGIN
    ALTER TABLE strategic_action_plans ADD created_by NVARCHAR(255) NOT NULL DEFAULT 'system';
    PRINT '✅ Coluna created_by adicionada em strategic_action_plans';
END
ELSE
    PRINT '⚠️  Coluna created_by já existe em strategic_action_plans';

-- 5. Adicionar coluna created_by em strategic_swot (se não existir)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_swot' AND COLUMN_NAME = 'created_by')
BEGIN
    ALTER TABLE strategic_swot ADD created_by NVARCHAR(255) NOT NULL DEFAULT 'system';
    PRINT '✅ Coluna created_by adicionada em strategic_swot';
END
ELSE
    PRINT '⚠️  Coluna created_by já existe em strategic_swot';

-- 6. Adicionar coluna created_by em strategic_strategies (se não existir)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_strategies' AND COLUMN_NAME = 'created_by')
BEGIN
    ALTER TABLE strategic_strategies ADD created_by NVARCHAR(255) NOT NULL DEFAULT 'system';
    PRINT '✅ Coluna created_by adicionada em strategic_strategies';
END
ELSE
    PRINT '⚠️  Coluna created_by já existe em strategic_strategies';

-- 7. Adicionar coluna created_by em strategic_war_room_meetings (se não existir)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_war_room_meetings' AND COLUMN_NAME = 'created_by')
BEGIN
    ALTER TABLE strategic_war_room_meetings ADD created_by NVARCHAR(255) NOT NULL DEFAULT 'system';
    PRINT '✅ Coluna created_by adicionada em strategic_war_room_meetings';
END
ELSE
    PRINT '⚠️  Coluna created_by já existe em strategic_war_room_meetings';

PRINT '';
PRINT '==========================================';
PRINT '✅ MIGRATION STRATEGIC COMPLETA!';
PRINT '==========================================';
