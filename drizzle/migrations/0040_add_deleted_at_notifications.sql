-- Migration: 0040_sync_notifications_schema.sql
-- Data: 2026-01-25
-- Épico: P0.1 - HOTFIX Strategic
-- Autor: Claude Agent
-- Descrição: Sincroniza tabela notifications com schema Drizzle (adiciona colunas faltantes)
--
-- PROBLEMA:
-- - Schema Drizzle define: branch_id, event, data, action_url, updated_at, deleted_at
-- - Tabela física NÃO possui essas colunas
-- - Resulta em erro 500: "Invalid column name 'deleted_at'" e outros
--
-- COLUNAS A ADICIONAR:
-- 1. branch_id INT NULL (multi-tenancy)
-- 2. event NVARCHAR(100) NULL (pode ser NULL para registros existentes)
-- 3. data NVARCHAR(MAX) NULL (JSON, substitui metadata)
-- 4. action_url NVARCHAR(500) NULL (substitui link)
-- 5. updated_at DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP
-- 6. deleted_at DATETIME2 NULL (soft delete)
--
-- IMPORTANTE: 
-- - Executar em horário de baixo uso
-- - Colunas são NULLABLE para compatibilidade com registros existentes
--
-- Rollback: 
--   ALTER TABLE [notifications] DROP COLUMN [branch_id];
--   ALTER TABLE [notifications] DROP COLUMN [event];
--   ALTER TABLE [notifications] DROP COLUMN [data];
--   ALTER TABLE [notifications] DROP COLUMN [action_url];
--   ALTER TABLE [notifications] DROP COLUMN [updated_at];
--   ALTER TABLE [notifications] DROP COLUMN [deleted_at];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. Adicionar branch_id
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [notifications] ADD [branch_id] INT NULL;
    PRINT 'Adicionado branch_id em notifications';
END
GO

-- 2. Adicionar event
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications' AND COLUMN_NAME = 'event')
BEGIN
    ALTER TABLE [notifications] ADD [event] NVARCHAR(100) NULL;
    PRINT 'Adicionado event em notifications';
END
GO

-- 3. Adicionar data (para JSON, equivalente ao metadata existente)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications' AND COLUMN_NAME = 'data')
BEGIN
    ALTER TABLE [notifications] ADD [data] NVARCHAR(MAX) NULL;
    PRINT 'Adicionado data em notifications';
END
GO

-- 4. Adicionar action_url (equivalente ao link existente)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications' AND COLUMN_NAME = 'action_url')
BEGIN
    ALTER TABLE [notifications] ADD [action_url] NVARCHAR(500) NULL;
    PRINT 'Adicionado action_url em notifications';
END
GO

-- 5. Adicionar updated_at
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications' AND COLUMN_NAME = 'updated_at')
BEGIN
    ALTER TABLE [notifications] ADD [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP;
    PRINT 'Adicionado updated_at em notifications';
END
GO

-- 6. Adicionar deleted_at (soft delete)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [notifications] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em notifications';
END
GO

-- 7. Migrar dados existentes: copiar link para action_url
UPDATE [notifications] 
SET [action_url] = [link]
WHERE [link] IS NOT NULL AND [action_url] IS NULL;
PRINT 'Migrados dados de link para action_url';
GO

-- 8. Migrar dados existentes: copiar metadata para data
UPDATE [notifications] 
SET [data] = [metadata]
WHERE [metadata] IS NOT NULL AND [data] IS NULL;
PRINT 'Migrados dados de metadata para data';
GO

-- 9. Preencher event com valor default para registros existentes
UPDATE [notifications] 
SET [event] = 'SYSTEM'
WHERE [event] IS NULL;
PRINT 'Preenchido event com SYSTEM para registros existentes';
GO

-- Verificação final
PRINT '=== VERIFICAÇÃO FINAL ==='
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'notifications'
ORDER BY ORDINAL_POSITION;
GO

PRINT '=== MIGRATION 0040 CONCLUÍDA COM SUCESSO ===';
GO
