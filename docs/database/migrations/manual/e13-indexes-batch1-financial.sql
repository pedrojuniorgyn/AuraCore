-- ============================================
-- E13 - INDEXAÇÃO ESTRATÉGICA - BATCH 1: FINANCIAL
-- ============================================
-- Data: 23/01/2026
-- Épico: E13 - Performance Optimization
-- Fase: 2 - Indexação Estratégica
--
-- REGRAS APLICADAS:
-- - INDEX-001: (organizationId, branchId) SEMPRE primeiro
-- - INDEX-006: ONLINE = ON (zero downtime)
-- - INDEX-007: MAXDOP = 4 (limita paralelismo)
-- - INDEX-008: FILLFACTOR = 90 para tabelas hot
--
-- EXECUTAR: SQL Server Management Studio ou Azure Data Studio
-- TEMPO ESTIMADO: 5-10 minutos

USE [auracore_db]; -- Substituir pelo nome do banco
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '=== E13 BATCH 1: FINANCIAL INDEXES ===';
PRINT '';

-- ============================================
-- 1. BANK ACCOUNTS (Contas Bancárias)
-- ============================================

-- INDEX-F001: Filtro por status (listagem de contas ativas)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_accounts_org_status')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bank_accounts_org_status]
    ON [bank_accounts] (
        [organization_id] ASC,
        [status] ASC
    )
    INCLUDE (
        [name],
        [bank_code],
        [bank_name],
        [current_balance]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_bank_accounts_org_status';
END
ELSE
    PRINT '⏭️ Já existe: idx_bank_accounts_org_status';
GO

-- INDEX-F002: Busca por código do banco
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_accounts_bank_code')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bank_accounts_bank_code]
    ON [bank_accounts] (
        [organization_id] ASC,
        [bank_code] ASC
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_bank_accounts_bank_code';
END
ELSE
    PRINT '⏭️ Já existe: idx_bank_accounts_bank_code';
GO

-- ============================================
-- 2. BANK REMITTANCES (Remessas CNAB)
-- ============================================

-- INDEX-F003: Filtro por conta + status + data
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_remittances_account_status')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bank_remittances_account_status]
    ON [bank_remittances] (
        [organization_id] ASC,
        [bank_account_id] ASC,
        [status] ASC,
        [created_at] DESC
    )
    INCLUDE (
        [file_name],
        [remittance_number],
        [total_records],
        [total_amount]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_bank_remittances_account_status';
END
ELSE
    PRINT '⏭️ Já existe: idx_bank_remittances_account_status';
GO

-- ============================================
-- 3. FINANCIAL CATEGORIES (Plano de Contas)
-- ============================================

-- INDEX-F004: Hierarquia de categorias
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_financial_categories_type')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_financial_categories_type]
    ON [financial_categories] (
        [organization_id] ASC,
        [type] ASC,
        [status] ASC
    )
    INCLUDE (
        [name],
        [code],
        [grupo_dfc]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_financial_categories_type';
END
ELSE
    PRINT '⏭️ Já existe: idx_financial_categories_type';
GO

-- INDEX-F005: Busca por código estruturado (DRE)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_financial_categories_code')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_financial_categories_code]
    ON [financial_categories] (
        [organization_id] ASC,
        [code] ASC
    )
    INCLUDE (
        [name],
        [type]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_financial_categories_code';
END
ELSE
    PRINT '⏭️ Já existe: idx_financial_categories_code';
GO

-- ============================================
-- 4. BANK TRANSACTIONS (Movimentações Bancárias)
-- ============================================

-- INDEX-F006: Filtro por conta + data (extrato)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_transactions_account_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bank_transactions_account_date]
    ON [bank_transactions] (
        [organization_id] ASC,
        [branch_id] ASC,
        [bank_account_id] ASC,
        [transaction_date] DESC
    )
    INCLUDE (
        [type],
        [amount],
        [description],
        [status]
    )
    WITH (ONLINE = ON, MAXDOP = 4, FILLFACTOR = 90);
    
    PRINT '✅ Criado: idx_bank_transactions_account_date';
END
ELSE
    PRINT '⏭️ Já existe: idx_bank_transactions_account_date';
GO

-- INDEX-F007: Conciliação por status
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_transactions_reconciliation')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bank_transactions_reconciliation]
    ON [bank_transactions] (
        [organization_id] ASC,
        [branch_id] ASC,
        [status] ASC,
        [transaction_date] DESC
    )
    INCLUDE (
        [bank_account_id],
        [amount],
        [type]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_bank_transactions_reconciliation';
END
ELSE
    PRINT '⏭️ Já existe: idx_bank_transactions_reconciliation';
GO

-- ============================================
-- 5. FINANCIAL DDA INBOX (DDA - Débito Direto)
-- ============================================

-- INDEX-F008: Status + data para processamento
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_dda_inbox_status')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_dda_inbox_status]
    ON [financial_dda_inbox] (
        [organization_id] ASC,
        [status] ASC,
        [due_date] ASC
    )
    INCLUDE (
        [amount],
        [payer_document],
        [payer_name]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_dda_inbox_status';
END
ELSE
    PRINT '⏭️ Já existe: idx_dda_inbox_status';
GO

-- ============================================
-- RESUMO
-- ============================================

PRINT '';
PRINT '=== BATCH 1 CONCLUÍDO ===';
PRINT '8 índices verificados/criados para módulo FINANCIAL';
PRINT '';
PRINT 'Rollback: docs/database/migrations/rollback/e13-rollback-batch1.sql';
GO
