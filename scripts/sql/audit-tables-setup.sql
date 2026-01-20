-- =====================================================
-- AUDIT TABLES SETUP - Wave 9
-- =====================================================
-- 
-- Este script cria as tabelas de auditoria para as 6 entidades críticas.
-- Características:
-- - Append-only (imutável)
-- - JSON para valores antigos/novos
-- - Índices otimizados para consultas comuns
-- - Multi-tenancy aware
--
-- IMPORTANTE: 
-- - Testar em ambiente local antes de executar em homolog/prod
-- - Retention de 5 anos para compliance fiscal (Lei 8.218/91)
--
-- Data: 2026-01-20
-- Épico: E9 - Segurança Avançada & Governança
-- =====================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- =====================================================
-- 1. FISCAL DOCUMENTS AUDIT
-- Prioridade: CRÍTICO (compliance SEFAZ)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fiscal_documents_audit')
BEGIN
    CREATE TABLE [dbo].[fiscal_documents_audit] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        [entity_id] VARCHAR(36) NOT NULL,
        [entity_type] VARCHAR(50) NOT NULL,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        [operation] VARCHAR(10) NOT NULL,
        [old_values] NVARCHAR(MAX) NULL,
        [new_values] NVARCHAR(MAX) NULL,
        [changed_fields] NVARCHAR(MAX) NULL,
        [reason] VARCHAR(500) NULL,
        [changed_by] VARCHAR(36) NOT NULL,
        [changed_by_name] VARCHAR(255) NULL,
        [changed_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [ip_address] VARCHAR(50) NULL,
        [user_agent] VARCHAR(500) NULL,
        [request_id] VARCHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Criada: fiscal_documents_audit';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_fiscal_documents_audit_entity] 
    ON [dbo].[fiscal_documents_audit] ([entity_id]);
    PRINT 'Criado: idx_fiscal_documents_audit_entity';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_fiscal_documents_audit_tenant] 
    ON [dbo].[fiscal_documents_audit] ([organization_id], [branch_id]);
    PRINT 'Criado: idx_fiscal_documents_audit_tenant';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_fiscal_documents_audit_date] 
    ON [dbo].[fiscal_documents_audit] ([changed_at]);
    PRINT 'Criado: idx_fiscal_documents_audit_date';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_user')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_fiscal_documents_audit_user] 
    ON [dbo].[fiscal_documents_audit] ([changed_by]);
    PRINT 'Criado: idx_fiscal_documents_audit_user';
END
GO

-- =====================================================
-- 2. ACCOUNTS PAYABLE AUDIT
-- Prioridade: CRÍTICO (financeiro)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'accounts_payable_audit')
BEGIN
    CREATE TABLE [dbo].[accounts_payable_audit] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        [entity_id] VARCHAR(36) NOT NULL,
        [entity_type] VARCHAR(50) NOT NULL,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        [operation] VARCHAR(10) NOT NULL,
        [old_values] NVARCHAR(MAX) NULL,
        [new_values] NVARCHAR(MAX) NULL,
        [changed_fields] NVARCHAR(MAX) NULL,
        [reason] VARCHAR(500) NULL,
        [changed_by] VARCHAR(36) NOT NULL,
        [changed_by_name] VARCHAR(255) NULL,
        [changed_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [ip_address] VARCHAR(50) NULL,
        [user_agent] VARCHAR(500) NULL,
        [request_id] VARCHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Criada: accounts_payable_audit';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_payable_audit_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_payable_audit_entity] 
    ON [dbo].[accounts_payable_audit] ([entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_payable_audit_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_payable_audit_tenant] 
    ON [dbo].[accounts_payable_audit] ([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_payable_audit_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_payable_audit_date] 
    ON [dbo].[accounts_payable_audit] ([changed_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_payable_audit_user')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_payable_audit_user] 
    ON [dbo].[accounts_payable_audit] ([changed_by]);
END
GO

-- =====================================================
-- 3. ACCOUNTS RECEIVABLE AUDIT
-- Prioridade: CRÍTICO (financeiro)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'accounts_receivable_audit')
BEGIN
    CREATE TABLE [dbo].[accounts_receivable_audit] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        [entity_id] VARCHAR(36) NOT NULL,
        [entity_type] VARCHAR(50) NOT NULL,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        [operation] VARCHAR(10) NOT NULL,
        [old_values] NVARCHAR(MAX) NULL,
        [new_values] NVARCHAR(MAX) NULL,
        [changed_fields] NVARCHAR(MAX) NULL,
        [reason] VARCHAR(500) NULL,
        [changed_by] VARCHAR(36) NOT NULL,
        [changed_by_name] VARCHAR(255) NULL,
        [changed_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [ip_address] VARCHAR(50) NULL,
        [user_agent] VARCHAR(500) NULL,
        [request_id] VARCHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Criada: accounts_receivable_audit';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_receivable_audit_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_receivable_audit_entity] 
    ON [dbo].[accounts_receivable_audit] ([entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_receivable_audit_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_receivable_audit_tenant] 
    ON [dbo].[accounts_receivable_audit] ([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_receivable_audit_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_receivable_audit_date] 
    ON [dbo].[accounts_receivable_audit] ([changed_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_receivable_audit_user')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_accounts_receivable_audit_user] 
    ON [dbo].[accounts_receivable_audit] ([changed_by]);
END
GO

-- =====================================================
-- 4. JOURNAL ENTRIES AUDIT
-- Prioridade: CRÍTICO (contabilidade)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'journal_entries_audit')
BEGIN
    CREATE TABLE [dbo].[journal_entries_audit] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        [entity_id] VARCHAR(36) NOT NULL,
        [entity_type] VARCHAR(50) NOT NULL,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        [operation] VARCHAR(10) NOT NULL,
        [old_values] NVARCHAR(MAX) NULL,
        [new_values] NVARCHAR(MAX) NULL,
        [changed_fields] NVARCHAR(MAX) NULL,
        [reason] VARCHAR(500) NULL,
        [changed_by] VARCHAR(36) NOT NULL,
        [changed_by_name] VARCHAR(255) NULL,
        [changed_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [ip_address] VARCHAR(50) NULL,
        [user_agent] VARCHAR(500) NULL,
        [request_id] VARCHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Criada: journal_entries_audit';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_audit_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_journal_entries_audit_entity] 
    ON [dbo].[journal_entries_audit] ([entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_audit_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_journal_entries_audit_tenant] 
    ON [dbo].[journal_entries_audit] ([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_audit_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_journal_entries_audit_date] 
    ON [dbo].[journal_entries_audit] ([changed_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_audit_user')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_journal_entries_audit_user] 
    ON [dbo].[journal_entries_audit] ([changed_by]);
END
GO

-- =====================================================
-- 5. CHART OF ACCOUNTS AUDIT
-- Prioridade: ALTA (contabilidade)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'chart_of_accounts_audit')
BEGIN
    CREATE TABLE [dbo].[chart_of_accounts_audit] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        [entity_id] VARCHAR(36) NOT NULL,
        [entity_type] VARCHAR(50) NOT NULL,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        [operation] VARCHAR(10) NOT NULL,
        [old_values] NVARCHAR(MAX) NULL,
        [new_values] NVARCHAR(MAX) NULL,
        [changed_fields] NVARCHAR(MAX) NULL,
        [reason] VARCHAR(500) NULL,
        [changed_by] VARCHAR(36) NOT NULL,
        [changed_by_name] VARCHAR(255) NULL,
        [changed_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [ip_address] VARCHAR(50) NULL,
        [user_agent] VARCHAR(500) NULL,
        [request_id] VARCHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Criada: chart_of_accounts_audit';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_chart_of_accounts_audit_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_chart_of_accounts_audit_entity] 
    ON [dbo].[chart_of_accounts_audit] ([entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_chart_of_accounts_audit_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_chart_of_accounts_audit_tenant] 
    ON [dbo].[chart_of_accounts_audit] ([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_chart_of_accounts_audit_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_chart_of_accounts_audit_date] 
    ON [dbo].[chart_of_accounts_audit] ([changed_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_chart_of_accounts_audit_user')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_chart_of_accounts_audit_user] 
    ON [dbo].[chart_of_accounts_audit] ([changed_by]);
END
GO

-- =====================================================
-- 6. USERS AUDIT
-- Prioridade: ALTA (segurança)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users_audit')
BEGIN
    CREATE TABLE [dbo].[users_audit] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        [entity_id] VARCHAR(36) NOT NULL,
        [entity_type] VARCHAR(50) NOT NULL,
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        [operation] VARCHAR(10) NOT NULL,
        [old_values] NVARCHAR(MAX) NULL,
        [new_values] NVARCHAR(MAX) NULL,
        [changed_fields] NVARCHAR(MAX) NULL,
        [reason] VARCHAR(500) NULL,
        [changed_by] VARCHAR(36) NOT NULL,
        [changed_by_name] VARCHAR(255) NULL,
        [changed_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [ip_address] VARCHAR(50) NULL,
        [user_agent] VARCHAR(500) NULL,
        [request_id] VARCHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Criada: users_audit';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_users_audit_entity')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_users_audit_entity] 
    ON [dbo].[users_audit] ([entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_users_audit_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_users_audit_tenant] 
    ON [dbo].[users_audit] ([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_users_audit_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_users_audit_date] 
    ON [dbo].[users_audit] ([changed_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_users_audit_user')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_users_audit_user] 
    ON [dbo].[users_audit] ([changed_by]);
END
GO

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 
    t.name AS table_name,
    (SELECT COUNT(*) FROM sys.indexes WHERE object_id = t.object_id AND type > 0) AS index_count
FROM sys.tables t
WHERE t.name LIKE '%_audit'
ORDER BY t.name;
GO

PRINT '';
PRINT '=====================================================';
PRINT 'AUDIT TABLES SETUP COMPLETED';
PRINT '=====================================================';
PRINT 'Tabelas criadas:';
PRINT '  - fiscal_documents_audit';
PRINT '  - accounts_payable_audit';
PRINT '  - accounts_receivable_audit';
PRINT '  - journal_entries_audit';
PRINT '  - chart_of_accounts_audit';
PRINT '  - users_audit';
PRINT '';
PRINT 'IMPORTANTE: Retention = 5 anos (compliance fiscal)';
PRINT '=====================================================';
GO
