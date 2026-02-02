-- ===================================================================
-- HOTFIX CRÍTICO: BUG-022 - Adicionar who_type e who_partner_id
-- Data: 02/02/2026
-- Refs: Migration 0042 (nunca aplicada)
-- Urgência: P0 - BLOQUEANTE
-- ===================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '========================================';
PRINT '🚨 HOTFIX BUG-022: who_type + who_partner_id';
PRINT '========================================';
GO

-- 1. Adicionar who_type (CRÍTICO - Causa erro 500 em TODOS os endpoints)
IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_type')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_type] VARCHAR(20) NOT NULL DEFAULT 'USER';
    PRINT '✅ Coluna who_type adicionada';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_type já existe';
END
GO

-- 2. Adicionar who_partner_id (Para suporte futuro)
IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_partner_id')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_partner_id] VARCHAR(36) NULL;
    PRINT '✅ Coluna who_partner_id adicionada';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_partner_id já existe';
END
GO

-- 3. Alterar who_user_id para NULL (retrocompatibilidade com who_type)
IF EXISTS (SELECT 1 FROM sys.columns 
           WHERE object_id = OBJECT_ID('strategic_action_plan') 
           AND name = 'who_user_id' 
           AND is_nullable = 0)
BEGIN
    ALTER TABLE [strategic_action_plan]
    ALTER COLUMN [who_user_id] VARCHAR(36) NULL;
    PRINT '✅ Coluna who_user_id agora permite NULL';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_user_id já é nullable ou não existe';
END
GO

-- 4. Criar índice who_type (performance para filtros)
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE name = 'idx_action_plan_who_type' 
               AND object_id = OBJECT_ID('strategic_action_plan'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_action_plan_who_type
    ON [strategic_action_plan](who_type)
    WHERE who_type IS NOT NULL AND deleted_at IS NULL;
    PRINT '✅ Índice idx_action_plan_who_type criado';
END
ELSE
BEGIN
    PRINT '⚠️ Índice idx_action_plan_who_type já existe';
END
GO

-- 5. Criar índice who_partner_id (para joins futuros)
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE name = 'idx_action_plan_who_partner' 
               AND object_id = OBJECT_ID('strategic_action_plan'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_action_plan_who_partner
    ON [strategic_action_plan](who_partner_id)
    WHERE who_partner_id IS NOT NULL AND deleted_at IS NULL;
    PRINT '✅ Índice idx_action_plan_who_partner criado';
END
ELSE
BEGIN
    PRINT '⚠️ Índice idx_action_plan_who_partner já existe';
END
GO

-- 6. Validação final (exibe estrutura completa dos campos "who*")
PRINT '========================================';
PRINT '🔍 Validação Final - Colunas "who*"';
PRINT '========================================';
GO

SELECT 
    'strategic_action_plan' AS [Tabela],
    COLUMN_NAME AS [Coluna],
    DATA_TYPE AS [Tipo],
    CHARACTER_MAXIMUM_LENGTH AS [Tamanho],
    CASE WHEN IS_NULLABLE = 'YES' THEN 'NULL' ELSE 'NOT NULL' END AS [Nullable],
    COLUMN_DEFAULT AS [Default]
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_action_plan'
AND COLUMN_NAME LIKE 'who%'
ORDER BY ORDINAL_POSITION;
GO

PRINT '========================================';
PRINT '✅ HOTFIX BUG-022 CONCLUÍDO COM SUCESSO!';
PRINT '========================================';
PRINT 'Próximo passo: Testar endpoints em https://tcl.auracore.cloud/strategic/dashboard';
GO
