-- ============================================================================
-- Migration: 0074_create_notifications_table
-- Data: 2026-02-12
-- Descrição: Cria tabela notifications (ausente em produção)
-- 
-- CONTEXTO:
-- - Tabela foi criada manualmente no ambiente local ontem
-- - Produção está quebrando ao tentar contar notificações
-- - Schema.ts tem definição incompleta (13 colunas vs 18 reais)
-- - Esta migration usa a estrutura REAL do banco local
--
-- CORRIGIDO: 2026-02-14 - Adicionado IF NOT EXISTS para idempotência
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- 1. Criar tabela notifications (idempotente)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notifications')
BEGIN
    CREATE TABLE [notifications] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [organization_id] INT NOT NULL,
        [user_id] NVARCHAR(255) NOT NULL,
        [type] NVARCHAR(50) NOT NULL,
        [title] NVARCHAR(255) NOT NULL,
        [message] NVARCHAR(MAX) NOT NULL,
        [link] NVARCHAR(500) NULL,
        [is_read] INT NOT NULL DEFAULT 0,
        [priority] NVARCHAR(20) NULL DEFAULT 'NORMAL',
        [metadata] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NULL DEFAULT GETDATE(),
        [read_at] DATETIME2 NULL,
        [branch_id] INT NULL,
        [event] NVARCHAR(100) NULL,
        [data] NVARCHAR(MAX) NULL,
        [action_url] NVARCHAR(500) NULL,
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [deleted_at] DATETIME2 NULL,
        
        CONSTRAINT [PK__notifica__3213E83FFC2149E0] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT 'Created: notifications';
END
ELSE
BEGIN
    PRINT 'Table notifications already exists, skipping...';
END
GO

-- 2. Criar índices de performance (idempotente)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notifications_org')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_notifications_org] 
        ON [notifications]([organization_id], [created_at]);
    PRINT 'Created index: idx_notifications_org';
END
ELSE
BEGIN
    PRINT 'Index idx_notifications_org already exists, skipping...';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notifications_type')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_notifications_type] 
        ON [notifications]([type], [created_at]);
    PRINT 'Created index: idx_notifications_type';
END
ELSE
BEGIN
    PRINT 'Index idx_notifications_type already exists, skipping...';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notifications_user')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_notifications_user] 
        ON [notifications]([user_id], [is_read], [created_at]);
    PRINT 'Created index: idx_notifications_user';
END
ELSE
BEGIN
    PRINT 'Index idx_notifications_user already exists, skipping...';
END
GO

-- 3. Constraint de validação do tipo (idempotente)
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK__notificati__type__04EFA97D')
BEGIN
    ALTER TABLE [notifications]
    ADD CONSTRAINT [CK__notificati__type__04EFA97D]
    CHECK ([type] IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS'));
    PRINT 'Created constraint: CK__notificati__type__04EFA97D';
END
ELSE
BEGIN
    PRINT 'Constraint CK__notificati__type__04EFA97D already exists, skipping...';
END
GO

-- 4. Validação final
SELECT 
    COUNT(*) as total_colunas,
    (SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID('notifications') AND type > 0) as total_indexes
FROM sys.columns 
WHERE object_id = OBJECT_ID('notifications');
GO

PRINT '✅ Tabela notifications verificada com sucesso!';
GO
