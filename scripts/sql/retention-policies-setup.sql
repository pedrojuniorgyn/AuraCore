-- =====================================================
-- RETENTION POLICIES SETUP - Wave 9
-- =====================================================
-- 
-- Este script cria a tabela de políticas de retenção e insere as políticas padrão.
--
-- Data: 2026-01-20
-- Épico: E9 - Segurança Avançada & Governança
-- =====================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- =====================================================
-- 1. CRIAR TABELA retention_policies
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'retention_policies')
BEGIN
    CREATE TABLE [dbo].[retention_policies] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        [policy_name] VARCHAR(100) NOT NULL,
        [table_name] VARCHAR(100) NOT NULL,
        [retention_days] INT NOT NULL,
        [date_column] VARCHAR(100) NOT NULL DEFAULT 'created_at',
        [additional_conditions] VARCHAR(1000) NULL,
        [is_active] INT NOT NULL DEFAULT 1,
        [last_run_at] DATETIME2 NULL,
        [last_run_records_deleted] INT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Criada: retention_policies';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_retention_policies_name')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_retention_policies_name] 
    ON [dbo].[retention_policies] ([policy_name]);
    PRINT 'Criado: idx_retention_policies_name';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_retention_policies_table')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_retention_policies_table] 
    ON [dbo].[retention_policies] ([table_name]);
    PRINT 'Criado: idx_retention_policies_table';
END
GO

-- =====================================================
-- 2. INSERIR POLÍTICAS PADRÃO
-- =====================================================
-- NOTA: Ajustar conforme as tabelas existentes no ambiente

-- Política: Logs de requisição lentos (30 dias)
IF NOT EXISTS (SELECT 1 FROM retention_policies WHERE policy_name = 'slow_logs')
BEGIN
    INSERT INTO retention_policies (id, policy_name, table_name, retention_days, date_column, additional_conditions, is_active)
    VALUES (NEWID(), 'slow_logs', 'request_logs', 30, 'created_at', 'duration_ms >= 1500', 1);
    PRINT 'Inserida: slow_logs';
END
GO

-- Política: Tokens de idempotência (7 dias)
IF NOT EXISTS (SELECT 1 FROM retention_policies WHERE policy_name = 'idempotency_tokens')
BEGIN
    INSERT INTO retention_policies (id, policy_name, table_name, retention_days, date_column, additional_conditions, is_active)
    VALUES (NEWID(), 'idempotency_tokens', 'idempotency_keys', 7, 'created_at', NULL, 1);
    PRINT 'Inserida: idempotency_tokens';
END
GO

-- Política: Sessões expiradas (1 dia)
IF NOT EXISTS (SELECT 1 FROM retention_policies WHERE policy_name = 'expired_sessions')
BEGIN
    INSERT INTO retention_policies (id, policy_name, table_name, retention_days, date_column, additional_conditions, is_active)
    VALUES (NEWID(), 'expired_sessions', 'sessions', 1, 'expires_at', 'expires_at < GETDATE()', 1);
    PRINT 'Inserida: expired_sessions';
END
GO

-- Política: Jobs de documentos concluídos (90 dias)
IF NOT EXISTS (SELECT 1 FROM retention_policies WHERE policy_name = 'completed_jobs')
BEGIN
    INSERT INTO retention_policies (id, policy_name, table_name, retention_days, date_column, additional_conditions, is_active)
    VALUES (NEWID(), 'completed_jobs', 'document_jobs', 90, 'updated_at', 'status IN (''SUCCEEDED'', ''FAILED'')', 1);
    PRINT 'Inserida: completed_jobs';
END
GO

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 
    policy_name,
    table_name,
    retention_days,
    date_column,
    CASE WHEN is_active = 1 THEN 'Ativo' ELSE 'Inativo' END AS status
FROM retention_policies
ORDER BY policy_name;
GO

PRINT '';
PRINT '=====================================================';
PRINT 'RETENTION POLICIES SETUP COMPLETED';
PRINT '=====================================================';
PRINT 'IMPORTANTE:';
PRINT '  - Tabelas de auditoria (*_audit) NÃO devem ter cleanup';
PRINT '  - Retention mínima de auditoria: 5 anos (Lei 8.218/91)';
PRINT '  - Execute POST /api/admin/retention/cleanup para rodar';
PRINT '=====================================================';
GO
