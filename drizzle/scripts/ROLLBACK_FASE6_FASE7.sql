-- ============================================================================
-- ROLLBACK MIGRATIONS FASE 6 + FASE 7
-- Execute este arquivo APENAS se precisar desfazer as migrations
-- ============================================================================
-- ATENÇÃO: Este script apaga dados! Use com cuidado!
-- ============================================================================

USE AuraCore;
GO

PRINT '⚠️  INICIANDO ROLLBACK - Fase 6 + Fase 7...';
GO

-- ============================================================================
-- ROLLBACK 0055: Department Data
-- ============================================================================
PRINT '🔄 Rollback 0055: Limpar department_id...';
GO

UPDATE strategic_action_plan 
SET department_id = NULL 
WHERE department_id IN (
    SELECT id FROM department WHERE code = 'OPS'
);

PRINT '✅ department_id limpo de action_plan';
GO

-- ============================================================================
-- ROLLBACK 0054: Departments
-- ============================================================================
PRINT '🔄 Rollback 0054: Remover departments...';
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = 'strategic_action_plan' AND COLUMN_NAME = 'department_id')
BEGIN
    ALTER TABLE strategic_action_plan DROP CONSTRAINT FK_action_plan_department;
    ALTER TABLE strategic_action_plan DROP COLUMN department_id;
    PRINT '✅ Coluna department_id removida de action_plan';
END
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'department')
BEGIN
    DROP TABLE department;
    PRINT '✅ Tabela department removida';
END
GO

-- ============================================================================
-- ROLLBACK 0053: Workflow Approval
-- ============================================================================
PRINT '🔄 Rollback 0053: Remover workflow...';
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_approval_history')
BEGIN
    DROP TABLE strategic_approval_history;
    PRINT '✅ Tabela strategic_approval_history removida';
END
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'workflow_status')
BEGIN
    ALTER TABLE strategic_strategy 
        DROP COLUMN workflow_status,
                    submitted_by_user_id,
                    submitted_at,
                    rejection_reason;
    PRINT '✅ Colunas workflow removidas de strategic_strategy';
END
GO

-- ============================================================================
-- ROLLBACK 0052: Strategic Alerts
-- ============================================================================
PRINT '🔄 Rollback 0052: Remover alerts...';
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_alert')
BEGIN
    DROP TABLE strategic_alert;
    PRINT '✅ Tabela strategic_alert removida';
END
GO

PRINT '';
PRINT '✅ ROLLBACK CONCLUÍDO!';
PRINT '=====================';
PRINT '⚠️  Todas as migrations da Fase 6 + Fase 7 foram desfeitas.';
GO
