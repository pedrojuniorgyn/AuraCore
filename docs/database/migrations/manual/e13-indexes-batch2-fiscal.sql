-- ============================================
-- E13 - INDEXAÇÃO ESTRATÉGICA - BATCH 2: FISCAL
-- ============================================
-- Data: 23/01/2026
-- Épico: E13 - Performance Optimization
-- Fase: 2 - Indexação Estratégica
--
-- REGRAS APLICADAS:
-- - INDEX-001: (organizationId, branchId) SEMPRE primeiro
-- - INDEX-006: ONLINE = ON (zero downtime)
-- - INDEX-007: MAXDOP = 4 (limita paralelismo)
-- - INDEX-008: FILLFACTOR = 85 para tabelas muito hot

USE [auracore_db]; -- Substituir pelo nome do banco
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '=== E13 BATCH 2: FISCAL INDEXES ===';
PRINT '';

-- ============================================
-- 1. INBOUND INVOICES (NFe Entrada)
-- ============================================

-- INDEX-FI001: Filtro principal (listagem fiscal)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inbound_invoices_main')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_inbound_invoices_main]
    ON [inbound_invoices] (
        [organization_id] ASC,
        [branch_id] ASC,
        [status] ASC,
        [issue_date] DESC
    )
    INCLUDE (
        [access_key],
        [number],
        [series],
        [partner_id],
        [total_nfe]
    )
    WITH (ONLINE = ON, MAXDOP = 4, FILLFACTOR = 85);
    
    PRINT '✅ Criado: idx_inbound_invoices_main';
END
ELSE
    PRINT '⏭️ Já existe: idx_inbound_invoices_main';
GO

-- INDEX-FI002: Busca por chave de acesso (única)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inbound_invoices_access_key')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_inbound_invoices_access_key]
    ON [inbound_invoices] (
        [organization_id] ASC,
        [access_key] ASC
    )
    INCLUDE (
        [id],
        [status],
        [issue_date]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_inbound_invoices_access_key';
END
ELSE
    PRINT '⏭️ Já existe: idx_inbound_invoices_access_key';
GO

-- INDEX-FI003: Filtro por parceiro (fornecedor)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inbound_invoices_partner')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_inbound_invoices_partner]
    ON [inbound_invoices] (
        [organization_id] ASC,
        [branch_id] ASC,
        [partner_id] ASC,
        [issue_date] DESC
    )
    INCLUDE (
        [access_key],
        [number],
        [total_nfe],
        [status]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_inbound_invoices_partner';
END
ELSE
    PRINT '⏭️ Já existe: idx_inbound_invoices_partner';
GO

-- INDEX-FI004: Relatório SPED (período fiscal)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inbound_invoices_sped')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_inbound_invoices_sped]
    ON [inbound_invoices] (
        [organization_id] ASC,
        [branch_id] ASC,
        [issue_date] ASC
    )
    INCLUDE (
        [number],
        [series],
        [access_key],
        [total_nfe],
        [model]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_inbound_invoices_sped';
END
ELSE
    PRINT '⏭️ Já existe: idx_inbound_invoices_sped';
GO

-- INDEX-FI005: Data de entrada (estoque)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inbound_invoices_entry_date')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_inbound_invoices_entry_date]
    ON [inbound_invoices] (
        [organization_id] ASC,
        [branch_id] ASC,
        [entry_date] DESC
    )
    WHERE [deleted_at] IS NULL
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_inbound_invoices_entry_date';
END
ELSE
    PRINT '⏭️ Já existe: idx_inbound_invoices_entry_date';
GO

-- ============================================
-- 2. INBOUND INVOICE ITEMS (Itens NFe)
-- ============================================

-- INDEX-FI006: Itens por documento
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_invoice_items_document')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_invoice_items_document]
    ON [inbound_invoice_items] (
        [invoice_id] ASC,
        [sequence_number] ASC
    )
    INCLUDE (
        [product_id],
        [product_name_xml],
        [quantity],
        [total_price],
        [ncm],
        [cfop]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_invoice_items_document';
END
ELSE
    PRINT '⏭️ Já existe: idx_invoice_items_document';
GO

-- INDEX-FI007: Busca por produto vinculado
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_invoice_items_product')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_invoice_items_product]
    ON [inbound_invoice_items] (
        [product_id] ASC
    )
    INCLUDE (
        [invoice_id],
        [quantity],
        [unit_price],
        [total_price]
    )
    WHERE [product_id] IS NOT NULL
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_invoice_items_product';
END
ELSE
    PRINT '⏭️ Já existe: idx_invoice_items_product';
GO

-- INDEX-FI008: Busca por NCM (classificação fiscal)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_invoice_items_ncm')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_invoice_items_ncm]
    ON [inbound_invoice_items] (
        [ncm] ASC
    )
    INCLUDE (
        [invoice_id],
        [product_name_xml],
        [total_price]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_invoice_items_ncm';
END
ELSE
    PRINT '⏭️ Já existe: idx_invoice_items_ncm';
GO

-- ============================================
-- 3. BUSINESS PARTNERS (Parceiros/Fornecedores)
-- ============================================

-- INDEX-FI009: Busca por documento (CNPJ/CPF)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_partners_document')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_partners_document]
    ON [business_partners] (
        [organization_id] ASC,
        [document] ASC
    )
    INCLUDE (
        [id],
        [name],
        [trade_name]
    )
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_partners_document';
END
ELSE
    PRINT '⏭️ Já existe: idx_partners_document';
GO

-- INDEX-FI010: Filtro por tipo
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_partners_type')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_partners_type]
    ON [business_partners] (
        [organization_id] ASC,
        [type] ASC
    )
    INCLUDE (
        [name],
        [document],
        [status]
    )
    WHERE [deleted_at] IS NULL
    WITH (ONLINE = ON, MAXDOP = 4);
    
    PRINT '✅ Criado: idx_partners_type';
END
ELSE
    PRINT '⏭️ Já existe: idx_partners_type';
GO

-- ============================================
-- RESUMO
-- ============================================

PRINT '';
PRINT '=== BATCH 2 CONCLUÍDO ===';
PRINT '10 índices verificados/criados para módulo FISCAL';
PRINT '';
PRINT 'Rollback: docs/database/migrations/rollback/e13-rollback-batch2.sql';
GO
