-- Rollback Migration: 0039_notifications_performance_indexes_down.sql
-- Use apenas se houver problemas de performance ou espaço
--
-- CUIDADO: 
-- - DROP INDEX não pode ser feito com ONLINE = ON
-- - Haverá lock breve na tabela durante DROP
-- - Executar fora do horário de pico
--
-- Rollback plan:
-- 1. DROP índices (ok reverter)
-- 2. DROP deleted_at (⚠️ CUIDADO: dados serão perdidos)
-- 3. DROP updated_at (⚠️ CUIDADO: dados serão perdidos)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================
-- PARTE 1: REMOVER ÍNDICES
-- ============================================

PRINT '=== REMOVENDO ÍNDICES ===';

-- 1.1: Remover índice principal
IF EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'idx_notifications_user_coverage' 
      AND object_id = OBJECT_ID('notifications')
)
BEGIN
    DROP INDEX [idx_notifications_user_coverage] ON [notifications];
    PRINT '✅ Removido idx_notifications_user_coverage';
END
ELSE
BEGIN
    PRINT 'ℹ️  idx_notifications_user_coverage não existe';
END
GO

-- 1.2: Remover índice de não-lidas
IF EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'idx_notifications_unread' 
      AND object_id = OBJECT_ID('notifications')
)
BEGIN
    DROP INDEX [idx_notifications_unread] ON [notifications];
    PRINT '✅ Removido idx_notifications_unread';
END
ELSE
BEGIN
    PRINT 'ℹ️  idx_notifications_unread não existe';
END
GO

-- ============================================
-- PARTE 2: REMOVER COLUNAS (⚠️ CUIDADO)
-- ============================================

PRINT '';
PRINT '⚠️  ATENÇÃO: Próximas operações removem colunas e dados!';
PRINT '⚠️  Certifique-se de ter backup antes de prosseguir.';
PRINT '';

-- 2.1: Remover deleted_at
IF EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'notifications' 
      AND COLUMN_NAME = 'deleted_at'
)
BEGIN
    -- Verificar se há dados deletados (soft delete)
    DECLARE @deletedCount INT;
    SELECT @deletedCount = COUNT(*) 
    FROM [notifications] 
    WHERE [deleted_at] IS NOT NULL;
    
    IF @deletedCount > 0
    BEGIN
        PRINT '⚠️  WARNING: ' + CAST(@deletedCount AS VARCHAR) + ' notifications com deleted_at não-null';
        PRINT '⚠️  Estes registros serão visíveis novamente após rollback!';
    END
    
    ALTER TABLE [notifications] DROP COLUMN [deleted_at];
    PRINT '✅ Removido deleted_at de notifications';
END
ELSE
BEGIN
    PRINT 'ℹ️  deleted_at não existe em notifications';
END
GO

-- 2.2: Remover updated_at
IF EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'notifications' 
      AND COLUMN_NAME = 'updated_at'
)
BEGIN
    -- Remover constraint DEFAULT primeiro
    DECLARE @constraintName NVARCHAR(200);
    SELECT @constraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE c.object_id = OBJECT_ID('notifications')
      AND c.name = 'updated_at';
    
    IF @constraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE [notifications] DROP CONSTRAINT [' + @constraintName + ']');
        PRINT '✅ Removida constraint DEFAULT de updated_at';
    END
    
    ALTER TABLE [notifications] DROP COLUMN [updated_at];
    PRINT '✅ Removido updated_at de notifications';
END
ELSE
BEGIN
    PRINT 'ℹ️  updated_at não existe em notifications';
END
GO

-- ============================================
-- PARTE 3: VERIFICAÇÃO FINAL
-- ============================================

PRINT '';
PRINT '=== VERIFICAÇÃO FINAL ===';

-- Verificar índices removidos
SELECT name AS [Índices Restantes]
FROM sys.indexes 
WHERE object_id = OBJECT_ID('notifications')
  AND name LIKE 'idx_notifications_%';
-- Deve retornar 0 linhas

-- Verificar colunas removidas
SELECT c.name AS [Colunas Restantes]
FROM sys.columns c
WHERE c.object_id = OBJECT_ID('notifications')
  AND c.name IN ('deleted_at', 'updated_at');
-- Deve retornar 0 linhas

PRINT '';
PRINT '=== ROLLBACK MIGRATION 0039 CONCLUÍDA ===';
PRINT '⚠️  Lembre-se: Performance voltará ao baseline anterior (Table Scan)';
PRINT '⚠️  Dados soft-deleted podem estar visíveis novamente';
GO
