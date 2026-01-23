-- ============================================
-- E13 - ROLLBACK DE ÍNDICES
-- ============================================
-- Data: 23/01/2026
-- Épico: E13 - Performance Optimization
--
-- USAR APENAS SE NECESSÁRIO REVERTER OTIMIZAÇÕES
-- 
-- ⚠️ ATENÇÃO: DROP INDEX pode impactar performance!
-- Executar apenas se houver problema identificado.

USE [auracore_db]; -- Substituir pelo nome do banco
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '=== E13 ROLLBACK: REMOVENDO ÍNDICES ===';
PRINT '';

-- ============================================
-- BATCH 1: FINANCIAL
-- ============================================

PRINT '--- Batch 1: Financial ---';

DROP INDEX IF EXISTS [idx_bank_accounts_org_status] ON [bank_accounts];
PRINT '  Removido: idx_bank_accounts_org_status';

DROP INDEX IF EXISTS [idx_bank_accounts_bank_code] ON [bank_accounts];
PRINT '  Removido: idx_bank_accounts_bank_code';

DROP INDEX IF EXISTS [idx_bank_remittances_account_status] ON [bank_remittances];
PRINT '  Removido: idx_bank_remittances_account_status';

DROP INDEX IF EXISTS [idx_financial_categories_type] ON [financial_categories];
PRINT '  Removido: idx_financial_categories_type';

DROP INDEX IF EXISTS [idx_financial_categories_code] ON [financial_categories];
PRINT '  Removido: idx_financial_categories_code';

DROP INDEX IF EXISTS [idx_bank_transactions_account_date] ON [bank_transactions];
PRINT '  Removido: idx_bank_transactions_account_date';

DROP INDEX IF EXISTS [idx_bank_transactions_reconciliation] ON [bank_transactions];
PRINT '  Removido: idx_bank_transactions_reconciliation';

DROP INDEX IF EXISTS [idx_dda_inbox_status] ON [financial_dda_inbox];
PRINT '  Removido: idx_dda_inbox_status';

GO

-- ============================================
-- BATCH 2: FISCAL
-- ============================================

PRINT '';
PRINT '--- Batch 2: Fiscal ---';

DROP INDEX IF EXISTS [idx_inbound_invoices_main] ON [inbound_invoices];
PRINT '  Removido: idx_inbound_invoices_main';

DROP INDEX IF EXISTS [idx_inbound_invoices_access_key] ON [inbound_invoices];
PRINT '  Removido: idx_inbound_invoices_access_key';

DROP INDEX IF EXISTS [idx_inbound_invoices_partner] ON [inbound_invoices];
PRINT '  Removido: idx_inbound_invoices_partner';

DROP INDEX IF EXISTS [idx_inbound_invoices_sped] ON [inbound_invoices];
PRINT '  Removido: idx_inbound_invoices_sped';

DROP INDEX IF EXISTS [idx_inbound_invoices_entry_date] ON [inbound_invoices];
PRINT '  Removido: idx_inbound_invoices_entry_date';

DROP INDEX IF EXISTS [idx_invoice_items_document] ON [inbound_invoice_items];
PRINT '  Removido: idx_invoice_items_document';

DROP INDEX IF EXISTS [idx_invoice_items_product] ON [inbound_invoice_items];
PRINT '  Removido: idx_invoice_items_product';

DROP INDEX IF EXISTS [idx_invoice_items_ncm] ON [inbound_invoice_items];
PRINT '  Removido: idx_invoice_items_ncm';

DROP INDEX IF EXISTS [idx_partners_document] ON [business_partners];
PRINT '  Removido: idx_partners_document';

DROP INDEX IF EXISTS [idx_partners_type] ON [business_partners];
PRINT '  Removido: idx_partners_type';

GO

-- ============================================
-- RESUMO
-- ============================================

PRINT '';
PRINT '=== ROLLBACK CONCLUÍDO ===';
PRINT '18 índices do E13 removidos';
PRINT '';
PRINT '⚠️  Executar Query Store para verificar impacto em performance';
GO
