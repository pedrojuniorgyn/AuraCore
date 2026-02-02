-- ========================================
-- Hotfix 0056: Add Missing who_email Column
-- ========================================
-- BUG-020: Schema mismatch - coluna definida no código mas não no banco
-- Causa: Migration 0035 não criou a coluna who_email
-- Impacto: 100% das APIs strategic retornando 500 ("Invalid column name 'who_email'")
-- Data: 2026-02-02

ALTER TABLE strategic_action_plan
ADD who_email VARCHAR(255) NULL;
GO

-- Index para queries que filtram por email
CREATE NONCLUSTERED INDEX idx_action_plan_who_email
ON strategic_action_plan(who_email)
WHERE who_email IS NOT NULL AND deleted_at IS NULL;
GO

-- Documentação
EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Email do responsável quando whoType = EMAIL (responsável externo)',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE', @level1name = 'strategic_action_plan',
    @level2type = N'COLUMN', @level2name = 'who_email';
GO

-- Validação
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_action_plan'
  AND COLUMN_NAME = 'who_email';
GO
