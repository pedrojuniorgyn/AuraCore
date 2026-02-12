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
-- ============================================================================

-- 1. Criar tabela notifications
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
GO

-- 2. Criar índices de performance
CREATE NONCLUSTERED INDEX [idx_notifications_org] 
    ON [notifications]([organization_id], [created_at]);
GO

CREATE NONCLUSTERED INDEX [idx_notifications_type] 
    ON [notifications]([type], [created_at]);
GO

CREATE NONCLUSTERED INDEX [idx_notifications_user] 
    ON [notifications]([user_id], [is_read], [created_at]);
GO

-- 3. Constraint de validação do tipo
ALTER TABLE [notifications]
ADD CONSTRAINT [CK__notificati__type__04EFA97D]
CHECK ([type] IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS'));
GO

-- 4. Validação final
SELECT 
    COUNT(*) as total_colunas,
    (SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID('notifications') AND type > 0) as total_indexes
FROM sys.columns 
WHERE object_id = OBJECT_ID('notifications');
GO

PRINT '✅ Tabela notifications criada com sucesso!';
GO
