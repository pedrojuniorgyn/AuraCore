-- Migration: 0002_ddd_module_tables.sql
-- Data: 2026-02-08
-- Autor: AuraCore Agent
-- Descricao: Cria tabelas de modulos DDD, Agent e Shared Infrastructure
--            que nao existiam como migrations SQL explicitas.
--
-- Tabelas criadas (29):
--   LEGACY (schema.ts):
--     1. management_chart_of_accounts
--     2. cargo_documents
--   ACCOUNTING (DDD):
--     3. account_determination
--     4. journal_entries
--     5. journal_entry_lines
--   FINANCIAL (DDD):
--     6. receivable_receipts
--     7. payments
--     8. receipts
--     9. expense_reports
--    10. expense_items
--   FISCAL (DDD):
--    11. fiscal_documents
--    12. fiscal_document_items
--    13. fiscal_document_taxes
--    14. fiscal_document_ibs_cbs
--    15. nfse_documents
--    16. cfop_determination
--   TMS (DDD):
--    17. romaneios
--    18. romaneio_items
--   DOCUMENTS (DDD):
--    19. document_store
--    20. document_jobs
--   WMS (DDD):
--    21. wms_locations
--    22. wms_stock_items
--    23. wms_stock_movements
--    24. wms_inventory_counts
--   STRATEGIC (DDD):
--    25. strategic_user_dashboard_layout
--    26. strategic_approval_approvers
--    27. strategic_pdca_cycle
--    28. strategic_goal_cascade
--   AGENT:
--    29. agent_sessions (corrigido com org/branch)
--    30. agent_messages
--   SHARED:
--    31. domain_event_outbox
--    32. retention_policies
--    33. fiscal_documents_audit
--    34. shared_audit_log
--
-- IMPORTANTE: Todas as tabelas usam IF NOT EXISTS para idempotencia.
-- Rollback: DROP TABLE individual com IF EXISTS

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- ============================================================
-- 1. MANAGEMENT CHART OF ACCOUNTS (Legacy schema.ts)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'management_chart_of_accounts')
BEGIN
  CREATE TABLE [management_chart_of_accounts] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [type] NVARCHAR(20) NOT NULL,
    [category] NVARCHAR(100),
    [parent_id] INT,
    [level] INT DEFAULT 0,
    [is_analytical] INT DEFAULT 0,
    [legal_account_id] INT,
    [allocation_rule] NVARCHAR(50),
    [allocation_base] NVARCHAR(50),
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: management_chart_of_accounts';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'management_chart_of_accounts_code_org_idx')
BEGIN
  CREATE UNIQUE INDEX [management_chart_of_accounts_code_org_idx]
    ON [management_chart_of_accounts]([organization_id], [code])
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: management_chart_of_accounts_code_org_idx';
END
GO

-- ============================================================
-- 2. CARGO DOCUMENTS (Legacy schema.ts)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cargo_documents')
BEGIN
  CREATE TABLE [cargo_documents] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [nfe_invoice_id] INT,
    [access_key] NVARCHAR(44) NOT NULL,
    [nfe_number] NVARCHAR(20),
    [nfe_series] NVARCHAR(10),
    [issuer_cnpj] NVARCHAR(14) NOT NULL,
    [issuer_name] NVARCHAR(255) NOT NULL,
    [recipient_cnpj] NVARCHAR(14) NOT NULL,
    [recipient_name] NVARCHAR(255) NOT NULL,
    [origin_uf] NVARCHAR(2),
    [origin_city] NVARCHAR(100),
    [destination_uf] NVARCHAR(2),
    [destination_city] NVARCHAR(100),
    [cargo_value] DECIMAL(18,2),
    [weight] DECIMAL(10,3),
    [volume] DECIMAL(10,3),
    [status] NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    [issue_date] DATETIME2 NOT NULL,
    [delivery_deadline] DATETIME2,
    [trip_id] INT,
    [cte_id] INT,
    [has_external_cte] NVARCHAR(1) DEFAULT 'N',
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: cargo_documents';
END
GO

-- ============================================================
-- 3. ACCOUNT DETERMINATION (Accounting DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'account_determination')
BEGIN
  CREATE TABLE [account_determination] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [operation_type] VARCHAR(50) NOT NULL,
    [debit_account_id] CHAR(36) NOT NULL,
    [debit_account_code] VARCHAR(30) NOT NULL,
    [credit_account_id] CHAR(36) NOT NULL,
    [credit_account_code] VARCHAR(30) NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: account_determination';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_acct_det_tenant')
BEGIN
  CREATE INDEX [idx_acct_det_tenant] ON [account_determination]([organization_id], [branch_id]);
  PRINT 'Created index: idx_acct_det_tenant';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_acct_det_unique_op')
BEGIN
  CREATE UNIQUE INDEX [idx_acct_det_unique_op] ON [account_determination]([organization_id], [branch_id], [operation_type]);
  PRINT 'Created index: idx_acct_det_unique_op';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_acct_det_op_type')
BEGIN
  CREATE INDEX [idx_acct_det_op_type] ON [account_determination]([operation_type]);
  PRINT 'Created index: idx_acct_det_op_type';
END
GO

-- ============================================================
-- 4. JOURNAL ENTRIES (Accounting DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'journal_entries')
BEGIN
  CREATE TABLE [journal_entries] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [entry_number] NVARCHAR(50) NOT NULL,
    [entry_date] DATETIME2 NOT NULL,
    [period_year] INT NOT NULL,
    [period_month] INT NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [source] VARCHAR(20) NOT NULL,
    [source_id] CHAR(36),
    [status] VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    [reversed_by_id] CHAR(36),
    [reverses_id] CHAR(36),
    [posted_at] DATETIME2,
    [posted_by] NVARCHAR(64),
    [notes] NVARCHAR(1000),
    [version] INT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: journal_entries';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_tenant')
BEGIN
  CREATE INDEX [idx_journal_entries_tenant] ON [journal_entries]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_date')
BEGIN
  CREATE INDEX [idx_journal_entries_date] ON [journal_entries]([organization_id], [branch_id], [entry_date]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_period')
BEGIN
  CREATE INDEX [idx_journal_entries_period] ON [journal_entries]([organization_id], [branch_id], [period_year], [period_month]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_status')
BEGIN
  CREATE INDEX [idx_journal_entries_status] ON [journal_entries]([organization_id], [branch_id], [status]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entries_source')
BEGIN
  CREATE INDEX [idx_journal_entries_source] ON [journal_entries]([source_id]);
END
GO

-- ============================================================
-- 5. JOURNAL ENTRY LINES (Accounting DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'journal_entry_lines')
BEGIN
  CREATE TABLE [journal_entry_lines] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [journal_entry_id] CHAR(36) NOT NULL,
    [account_id] CHAR(36) NOT NULL,
    [account_code] NVARCHAR(20) NOT NULL,
    [entry_type] VARCHAR(10) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [description] NVARCHAR(200),
    [cost_center_id] INT,
    [business_partner_id] INT,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: journal_entry_lines';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_jel_tenant')
BEGIN
  CREATE INDEX [idx_jel_tenant] ON [journal_entry_lines]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entry_lines_entry')
BEGIN
  CREATE INDEX [idx_journal_entry_lines_entry] ON [journal_entry_lines]([journal_entry_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_entry_lines_account')
BEGIN
  CREATE INDEX [idx_journal_entry_lines_account] ON [journal_entry_lines]([account_id]);
END
GO

-- ============================================================
-- 6. RECEIVABLE RECEIPTS (Financial DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'receivable_receipts')
BEGIN
  CREATE TABLE [receivable_receipts] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [receivable_id] CHAR(36) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [method] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    [bank_account_id] CHAR(36),
    [transaction_id] NVARCHAR(100),
    [notes] NVARCHAR(500),
    [received_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: receivable_receipts';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_receipts_tenant')
BEGIN
  CREATE INDEX [idx_receipts_tenant] ON [receivable_receipts]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_receipts_receivable')
BEGIN
  CREATE INDEX [idx_receipts_receivable] ON [receivable_receipts]([receivable_id]);
END
GO

-- ============================================================
-- 7. PAYMENTS (Financial DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'payments')
BEGIN
  CREATE TABLE [payments] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [payable_id] CHAR(36) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [method] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    [bank_account_id] CHAR(36),
    [transaction_id] NVARCHAR(100),
    [notes] NVARCHAR(500),
    [paid_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: payments';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_payments_tenant')
BEGIN
  CREATE INDEX [idx_payments_tenant] ON [payments]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_payments_payable')
BEGIN
  CREATE INDEX [idx_payments_payable] ON [payments]([payable_id]);
END
GO

-- ============================================================
-- 8. RECEIPTS (Financial DDD - Recibos)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'receipts')
BEGIN
  CREATE TABLE [receipts] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [tipo] VARCHAR(20) NOT NULL,
    [numero] INT NOT NULL,
    [serie] VARCHAR(10) NOT NULL,
    [pagador_nome] VARCHAR(255) NOT NULL,
    [pagador_documento] VARCHAR(14) NOT NULL,
    [pagador_tipo_documento] VARCHAR(4) NOT NULL,
    [pagador_endereco_logradouro] VARCHAR(255),
    [pagador_endereco_numero] VARCHAR(20),
    [pagador_endereco_complemento] VARCHAR(100),
    [pagador_endereco_bairro] VARCHAR(100),
    [pagador_endereco_cidade] VARCHAR(100),
    [pagador_endereco_estado] VARCHAR(2),
    [pagador_endereco_cep] VARCHAR(8),
    [recebedor_nome] VARCHAR(255) NOT NULL,
    [recebedor_documento] VARCHAR(14) NOT NULL,
    [recebedor_tipo_documento] VARCHAR(4) NOT NULL,
    [recebedor_endereco_logradouro] VARCHAR(255),
    [recebedor_endereco_numero] VARCHAR(20),
    [recebedor_endereco_complemento] VARCHAR(100),
    [recebedor_endereco_bairro] VARCHAR(100),
    [recebedor_endereco_cidade] VARCHAR(100),
    [recebedor_endereco_estado] VARCHAR(2),
    [recebedor_endereco_cep] VARCHAR(8),
    [valor_amount] DECIMAL(15,2) NOT NULL,
    [valor_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [valor_por_extenso] TEXT NOT NULL,
    [descricao] TEXT NOT NULL,
    [forma_pagamento] VARCHAR(20) NOT NULL,
    [data_recebimento] DATETIME NOT NULL,
    [local_recebimento] VARCHAR(255),
    [financial_transaction_id] VARCHAR(36),
    [payable_id] VARCHAR(36),
    [receivable_id] VARCHAR(36),
    [trip_id] VARCHAR(36),
    [expense_report_id] VARCHAR(36),
    [emitido_por] VARCHAR(255) NOT NULL,
    [emitido_em] DATETIME NOT NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    [cancelado_em] DATETIME,
    [cancelado_por] VARCHAR(255),
    [motivo_cancelamento] TEXT,
    [created_at] DATETIME NOT NULL,
    [created_by] VARCHAR(255) NOT NULL,
    [updated_at] DATETIME NOT NULL,
    [updated_by] VARCHAR(255) NOT NULL,
    [deleted_at] DATETIME
  );
  PRINT 'Created: receipts';
END
GO

-- ============================================================
-- 9. EXPENSE REPORTS (Financial DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'expense_reports')
BEGIN
  CREATE TABLE [expense_reports] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [employee_id] VARCHAR(36) NOT NULL,
    [employee_name] VARCHAR(200) NOT NULL,
    [cost_center_id] VARCHAR(36) NOT NULL,
    [periodo_inicio] DATETIME NOT NULL,
    [periodo_fim] DATETIME NOT NULL,
    [motivo] VARCHAR(500) NOT NULL,
    [projeto] VARCHAR(100),
    [advance_valor_solicitado_amount] DECIMAL(15,2),
    [advance_valor_solicitado_currency] VARCHAR(3),
    [advance_data_solicitacao] DATETIME,
    [advance_status_aprovacao] VARCHAR(20),
    [advance_valor_aprovado_amount] DECIMAL(15,2),
    [advance_valor_aprovado_currency] VARCHAR(3),
    [advance_data_liberacao] DATETIME,
    [advance_aprovador_id] VARCHAR(36),
    [total_despesas_amount] DECIMAL(15,2) NOT NULL DEFAULT 0,
    [total_despesas_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [saldo_amount] DECIMAL(15,2) NOT NULL DEFAULT 0,
    [saldo_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [status] VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    [submitted_at] DATETIME,
    [reviewer_id] VARCHAR(36),
    [reviewed_at] DATETIME,
    [review_notes] VARCHAR(2000),
    [payable_id] VARCHAR(36),
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(36) NOT NULL,
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_by] VARCHAR(36) NOT NULL,
    [deleted_at] DATETIME
  );
  PRINT 'Created: expense_reports';
END
GO

-- ============================================================
-- 10. EXPENSE ITEMS (Financial DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'expense_items')
BEGIN
  CREATE TABLE [expense_items] (
    [id] VARCHAR(36) PRIMARY KEY,
    [expense_report_id] VARCHAR(36) NOT NULL,
    [categoria] VARCHAR(30) NOT NULL,
    [data] DATETIME NOT NULL,
    [descricao] VARCHAR(500) NOT NULL,
    [valor_amount] DECIMAL(15,2) NOT NULL,
    [valor_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [comprovante_type] VARCHAR(20),
    [comprovante_numero] VARCHAR(50),
    [comprovante_url] VARCHAR(500),
    [dentro_politica] BIT NOT NULL,
    [motivo_violacao] VARCHAR(500)
  );
  PRINT 'Created: expense_items';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_expense_items_report')
BEGIN
  CREATE INDEX [idx_expense_items_report] ON [expense_items]([expense_report_id]);
END
GO

-- ============================================================
-- 11. FISCAL DOCUMENTS (Fiscal DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fiscal_documents')
BEGIN
  CREATE TABLE [fiscal_documents] (
    [id] CHAR(36) PRIMARY KEY,
    [document_type] VARCHAR(10) NOT NULL,
    [series] VARCHAR(10) NOT NULL,
    [number] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [issue_date] DATETIME NOT NULL,
    [issuer_id] VARCHAR(255) NOT NULL,
    [issuer_cnpj] CHAR(14) NOT NULL,
    [issuer_name] VARCHAR(255) NOT NULL,
    [recipient_id] VARCHAR(255),
    [recipient_cnpj_cpf] VARCHAR(14),
    [recipient_name] VARCHAR(255),
    [total_value] DECIMAL(18,2) NOT NULL,
    [currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [tax_regime] VARCHAR(20) NOT NULL DEFAULT 'CURRENT',
    [total_ibs] DECIMAL(18,2),
    [total_ibs_currency] VARCHAR(3),
    [total_cbs] DECIMAL(18,2),
    [total_cbs_currency] VARCHAR(3),
    [total_is] DECIMAL(18,2),
    [total_is_currency] VARCHAR(3),
    [total_dfe_value] DECIMAL(18,2),
    [total_dfe_value_currency] VARCHAR(3),
    [ibs_cbs_municipality_code] VARCHAR(7),
    [government_purchase_entity_type] INT,
    [government_purchase_rate_reduction] DECIMAL(5,2),
    [fiscal_key] CHAR(44),
    [protocol_number] VARCHAR(50),
    [rejection_code] VARCHAR(10),
    [rejection_reason] VARCHAR(500),
    [notes] TEXT,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME
  );
  PRINT 'Created: fiscal_documents';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_docs_tenant')
BEGIN
  CREATE INDEX [idx_fiscal_docs_tenant] ON [fiscal_documents]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_docs_status')
BEGIN
  CREATE INDEX [idx_fiscal_docs_status] ON [fiscal_documents]([organization_id], [status]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_docs_issue_date')
BEGIN
  CREATE INDEX [idx_fiscal_docs_issue_date] ON [fiscal_documents]([issue_date]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_docs_type')
BEGIN
  CREATE INDEX [idx_fiscal_docs_type] ON [fiscal_documents]([organization_id], [document_type]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_docs_key')
BEGIN
  CREATE INDEX [idx_fiscal_docs_key] ON [fiscal_documents]([fiscal_key]);
END
GO

-- ============================================================
-- 12. FISCAL DOCUMENT ITEMS (Fiscal DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fiscal_document_items')
BEGIN
  CREATE TABLE [fiscal_document_items] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [document_id] CHAR(36) NOT NULL,
    [item_number] INT NOT NULL,
    [description] VARCHAR(500) NOT NULL,
    [quantity] DECIMAL(18,4) NOT NULL,
    [unit_price] DECIMAL(18,2) NOT NULL,
    [total_value] DECIMAL(18,2) NOT NULL,
    [currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [ncm] CHAR(8),
    [cfop] CHAR(4) NOT NULL,
    [unit_of_measure] VARCHAR(10) NOT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: fiscal_document_items';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_items_tenant')
BEGIN
  CREATE INDEX [idx_fiscal_items_tenant] ON [fiscal_document_items]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_items_document')
BEGIN
  CREATE INDEX [idx_fiscal_items_document] ON [fiscal_document_items]([document_id]);
END
GO

-- ============================================================
-- 13. FISCAL DOCUMENT TAXES (Fiscal DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fiscal_document_taxes')
BEGIN
  CREATE TABLE [fiscal_document_taxes] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [document_id] CHAR(36) NOT NULL,
    [item_id] CHAR(36) NOT NULL,
    [tax_type] VARCHAR(10) NOT NULL,
    [base_calculo] DECIMAL(18,2) NOT NULL,
    [aliquota] DECIMAL(5,2) NOT NULL,
    [valor] DECIMAL(18,2) NOT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: fiscal_document_taxes';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_taxes_document')
BEGIN
  CREATE INDEX [idx_fiscal_taxes_document] ON [fiscal_document_taxes]([document_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_taxes_item')
BEGIN
  CREATE INDEX [idx_fiscal_taxes_item] ON [fiscal_document_taxes]([item_id]);
END
GO

-- ============================================================
-- 14. FISCAL DOCUMENT IBS/CBS (Fiscal DDD - Reforma 2026)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fiscal_document_ibs_cbs')
BEGIN
  CREATE TABLE [fiscal_document_ibs_cbs] (
    [id] CHAR(36) PRIMARY KEY,
    [fiscal_document_id] CHAR(36) NOT NULL,
    [fiscal_document_item_id] CHAR(36),
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [cst] VARCHAR(2) NOT NULL,
    [c_class_trib] VARCHAR(20) NOT NULL,
    [base_value] DECIMAL(18,2) NOT NULL,
    [base_value_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [ibs_uf_rate] DECIMAL(7,4) NOT NULL,
    [ibs_uf_value] DECIMAL(18,2) NOT NULL,
    [ibs_uf_value_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [ibs_mun_rate] DECIMAL(7,4) NOT NULL,
    [ibs_mun_value] DECIMAL(18,2) NOT NULL,
    [ibs_mun_value_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [cbs_rate] DECIMAL(7,4) NOT NULL,
    [cbs_value] DECIMAL(18,2) NOT NULL,
    [cbs_value_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [ibs_uf_effective_rate] DECIMAL(7,4),
    [ibs_mun_effective_rate] DECIMAL(7,4),
    [cbs_effective_rate] DECIMAL(7,4),
    [deferral_rate] DECIMAL(5,2),
    [deferral_ibs_value] DECIMAL(18,2),
    [deferral_ibs_value_currency] VARCHAR(3),
    [deferral_cbs_value] DECIMAL(18,2),
    [deferral_cbs_value_currency] VARCHAR(3),
    [refund_ibs_value] DECIMAL(18,2),
    [refund_ibs_value_currency] VARCHAR(3),
    [refund_cbs_value] DECIMAL(18,2),
    [refund_cbs_value_currency] VARCHAR(3),
    [reduction_ibs_rate] DECIMAL(5,2),
    [reduction_cbs_rate] DECIMAL(5,2),
    [presumed_credit_code] VARCHAR(10),
    [presumed_credit_rate] DECIMAL(5,2),
    [presumed_credit_ibs_value] DECIMAL(18,2),
    [presumed_credit_ibs_value_currency] VARCHAR(3),
    [presumed_credit_cbs_value] DECIMAL(18,2),
    [presumed_credit_cbs_value_currency] VARCHAR(3),
    [government_purchase_entity_type] INT,
    [government_purchase_reduction_rate] DECIMAL(5,2),
    [created_at] DATETIME NOT NULL,
    [updated_at] DATETIME NOT NULL
  );
  PRINT 'Created: fiscal_document_ibs_cbs';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_doc_ibs_cbs_doc_id')
BEGIN
  CREATE INDEX [idx_fiscal_doc_ibs_cbs_doc_id] ON [fiscal_document_ibs_cbs]([fiscal_document_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_doc_ibs_cbs_organization')
BEGIN
  CREATE INDEX [idx_fiscal_doc_ibs_cbs_organization] ON [fiscal_document_ibs_cbs]([organization_id], [branch_id]);
END
GO

-- ============================================================
-- 15. NFSE DOCUMENTS (Fiscal DDD - NFS-e)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'nfse_documents')
BEGIN
  CREATE TABLE [nfse_documents] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [numero] VARCHAR(20) NOT NULL,
    [serie] VARCHAR(5),
    [data_emissao] DATETIME NOT NULL,
    [competencia] DATETIME NOT NULL,
    [prestador_cnpj] VARCHAR(14) NOT NULL,
    [prestador_razao_social] VARCHAR(255) NOT NULL,
    [prestador_nome_fantasia] VARCHAR(255),
    [prestador_inscricao_municipal] VARCHAR(20) NOT NULL,
    [prestador_logradouro] VARCHAR(255) NOT NULL,
    [prestador_numero] VARCHAR(10) NOT NULL,
    [prestador_complemento] VARCHAR(100),
    [prestador_bairro] VARCHAR(100) NOT NULL,
    [prestador_codigo_municipio] VARCHAR(7) NOT NULL,
    [prestador_uf] VARCHAR(2) NOT NULL,
    [prestador_cep] VARCHAR(8) NOT NULL,
    [prestador_telefone] VARCHAR(20),
    [prestador_email] VARCHAR(255),
    [tomador_cpf_cnpj] VARCHAR(14) NOT NULL,
    [tomador_razao_social] VARCHAR(255) NOT NULL,
    [tomador_logradouro] VARCHAR(255),
    [tomador_numero] VARCHAR(10),
    [tomador_complemento] VARCHAR(100),
    [tomador_bairro] VARCHAR(100),
    [tomador_codigo_municipio] VARCHAR(7),
    [tomador_uf] VARCHAR(2),
    [tomador_cep] VARCHAR(8),
    [tomador_telefone] VARCHAR(20),
    [tomador_email] VARCHAR(255),
    [intermediario_cpf_cnpj] VARCHAR(14),
    [intermediario_razao_social] VARCHAR(255),
    [servico_codigo_servico] VARCHAR(10) NOT NULL,
    [servico_codigo_cnae] VARCHAR(7) NOT NULL,
    [servico_codigo_tributacao_municipio] VARCHAR(20),
    [servico_discriminacao] TEXT NOT NULL,
    [servico_valor_servicos] DECIMAL(18,2) NOT NULL,
    [servico_valor_servicos_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [servico_valor_deducoes] DECIMAL(18,2),
    [servico_valor_deducoes_currency] VARCHAR(3),
    [servico_valor_pis] DECIMAL(18,2),
    [servico_valor_pis_currency] VARCHAR(3),
    [servico_valor_cofins] DECIMAL(18,2),
    [servico_valor_cofins_currency] VARCHAR(3),
    [servico_valor_inss] DECIMAL(18,2),
    [servico_valor_inss_currency] VARCHAR(3),
    [servico_valor_ir] DECIMAL(18,2),
    [servico_valor_ir_currency] VARCHAR(3),
    [servico_valor_csll] DECIMAL(18,2),
    [servico_valor_csll_currency] VARCHAR(3),
    [servico_outras_retencoes] DECIMAL(18,2),
    [servico_outras_retencoes_currency] VARCHAR(3),
    [servico_desconto_condicionado] DECIMAL(18,2),
    [servico_desconto_condicionado_currency] VARCHAR(3),
    [servico_desconto_incondicionado] DECIMAL(18,2),
    [servico_desconto_incondicionado_currency] VARCHAR(3),
    [iss_retido] INT NOT NULL,
    [iss_valor_iss] DECIMAL(18,2) NOT NULL,
    [iss_valor_iss_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [iss_aliquota] DECIMAL(5,2) NOT NULL,
    [iss_base_calculo] DECIMAL(18,2) NOT NULL,
    [iss_base_calculo_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [iss_valor_iss_retido] DECIMAL(18,2),
    [iss_valor_iss_retido_currency] VARCHAR(3),
    [iss_codigo_municipio_incidencia] VARCHAR(7),
    [valor_liquido] DECIMAL(18,2) NOT NULL,
    [valor_liquido_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [tax_regime] VARCHAR(20) NOT NULL DEFAULT 'CURRENT',
    [observacoes] TEXT,
    [numero_nfse] VARCHAR(20),
    [codigo_verificacao] VARCHAR(20),
    [protocolo_envio] VARCHAR(50),
    [protocolo_cancelamento] VARCHAR(50),
    [motivo_cancelamento] TEXT,
    [authorized_at] DATETIME,
    [cancelled_at] DATETIME,
    [version] INT NOT NULL DEFAULT 1,
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME
  );
  PRINT 'Created: nfse_documents';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_nfse_org_branch')
BEGIN
  CREATE INDEX [idx_nfse_org_branch] ON [nfse_documents]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_nfse_status')
BEGIN
  CREATE INDEX [idx_nfse_status] ON [nfse_documents]([status], [organization_id], [branch_id]);
END
GO

-- ============================================================
-- 16. CFOP DETERMINATION (Fiscal DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cfop_determination')
BEGIN
  CREATE TABLE [cfop_determination] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [operation_type] VARCHAR(50) NOT NULL,
    [direction] VARCHAR(20) NOT NULL,
    [scope] VARCHAR(20) NOT NULL,
    [tax_regime] VARCHAR(30),
    [document_type] VARCHAR(20),
    [cfop_code] VARCHAR(4) NOT NULL,
    [cfop_description] VARCHAR(200) NOT NULL,
    [is_default] BIT NOT NULL DEFAULT 0,
    [priority] INT NOT NULL DEFAULT 100,
    [status] VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: cfop_determination';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cfop_det_tenant')
BEGIN
  CREATE INDEX [idx_cfop_det_tenant] ON [cfop_determination]([organization_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cfop_det_lookup')
BEGIN
  CREATE INDEX [idx_cfop_det_lookup] ON [cfop_determination]([organization_id], [operation_type], [direction], [scope]);
END
GO

-- ============================================================
-- 17. ROMANEIOS (TMS DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'romaneios')
BEGIN
  CREATE TABLE [romaneios] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [numero] VARCHAR(20) NOT NULL,
    [data_emissao] DATETIME NOT NULL,
    [remetente_id] VARCHAR(36) NOT NULL,
    [destinatario_id] VARCHAR(36) NOT NULL,
    [transportador_id] VARCHAR(36),
    [trip_id] VARCHAR(36),
    [delivery_id] VARCHAR(36),
    [cte_numbers] VARCHAR(2000) NOT NULL DEFAULT '[]',
    [nfe_numbers] VARCHAR(2000) NOT NULL DEFAULT '[]',
    [total_volumes] INT NOT NULL DEFAULT 0,
    [peso_liquido_total] DECIMAL(10,3) NOT NULL DEFAULT 0,
    [peso_bruto_total] DECIMAL(10,3) NOT NULL DEFAULT 0,
    [cubagem_total] DECIMAL(10,6) NOT NULL DEFAULT 0,
    [status] VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    [conferido_por] VARCHAR(36),
    [data_conferencia] DATETIME,
    [observacoes_conferencia] VARCHAR(2000),
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [created_by] VARCHAR(36) NOT NULL,
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_by] VARCHAR(36) NOT NULL,
    [deleted_at] DATETIME
  );
  PRINT 'Created: romaneios';
END
GO

-- ============================================================
-- 18. ROMANEIO ITEMS (TMS DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'romaneio_items')
BEGIN
  CREATE TABLE [romaneio_items] (
    [id] VARCHAR(36) PRIMARY KEY,
    [romaneio_id] VARCHAR(36) NOT NULL,
    [sequencia] INT NOT NULL,
    [marcacao_volume] VARCHAR(50) NOT NULL,
    [especie_embalagem] VARCHAR(20) NOT NULL,
    [quantidade] INT NOT NULL,
    [peso_liquido] DECIMAL(10,3) NOT NULL,
    [peso_bruto] DECIMAL(10,3) NOT NULL,
    [altura] DECIMAL(10,3) NOT NULL,
    [largura] DECIMAL(10,3) NOT NULL,
    [comprimento] DECIMAL(10,3) NOT NULL,
    [cubagem] DECIMAL(10,6) NOT NULL,
    [descricao_produto] VARCHAR(500) NOT NULL,
    [codigo_produto] VARCHAR(50),
    [observacoes] VARCHAR(1000)
  );
  PRINT 'Created: romaneio_items';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_romaneio_items_romaneio')
BEGIN
  CREATE INDEX [idx_romaneio_items_romaneio] ON [romaneio_items]([romaneio_id]);
END
GO

-- ============================================================
-- 19. DOCUMENT STORE (Documents DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'document_store')
BEGIN
  CREATE TABLE [document_store] (
    [id] NVARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [doc_type] NVARCHAR(64) NOT NULL,
    [entity_table] NVARCHAR(128),
    [entity_id] INT,
    [file_name] NVARCHAR(255) NOT NULL,
    [mime_type] NVARCHAR(100) NOT NULL,
    [file_size] BIGINT NOT NULL,
    [sha256] NVARCHAR(64),
    [storage_provider] NVARCHAR(20) NOT NULL DEFAULT 'S3',
    [storage_bucket] NVARCHAR(255),
    [storage_key] NVARCHAR(1024) NOT NULL,
    [storage_url] NVARCHAR(1024),
    [status] NVARCHAR(20) NOT NULL DEFAULT 'UPLOADED',
    [last_error] NVARCHAR(4000),
    [metadata_json] NVARCHAR(4000),
    [created_by] NVARCHAR(255),
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: document_store';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_document_store_tenant')
BEGIN
  CREATE INDEX [idx_document_store_tenant] ON [document_store]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_document_store_entity')
BEGIN
  CREATE INDEX [idx_document_store_entity] ON [document_store]([entity_table], [entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_document_store_status')
BEGIN
  CREATE INDEX [idx_document_store_status] ON [document_store]([organization_id], [status]);
END
GO

-- ============================================================
-- 20. DOCUMENT JOBS (Documents DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'document_jobs')
BEGIN
  CREATE TABLE [document_jobs] (
    [id] NVARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [document_id] NVARCHAR(36) NOT NULL,
    [job_type] NVARCHAR(64) NOT NULL,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    [attempts] INT NOT NULL DEFAULT 0,
    [max_attempts] INT NOT NULL DEFAULT 5,
    [scheduled_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [started_at] DATETIME2,
    [completed_at] DATETIME2,
    [locked_at] DATETIME2,
    [payload_json] NVARCHAR(4000),
    [result_json] NVARCHAR(4000),
    [last_error] NVARCHAR(4000),
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: document_jobs';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_document_jobs_tenant')
BEGIN
  CREATE INDEX [idx_document_jobs_tenant] ON [document_jobs]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_document_jobs_queue')
BEGIN
  CREATE INDEX [idx_document_jobs_queue] ON [document_jobs]([status], [scheduled_at], [id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_document_jobs_document')
BEGIN
  CREATE INDEX [idx_document_jobs_document] ON [document_jobs]([document_id]);
END
GO

-- ============================================================
-- 21. WMS LOCATIONS (WMS DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'wms_locations')
BEGIN
  CREATE TABLE [wms_locations] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [warehouse_id] CHAR(36) NOT NULL,
    [code] VARCHAR(20) NOT NULL,
    [name] VARCHAR(200) NOT NULL,
    [type] VARCHAR(20) NOT NULL,
    [parent_id] CHAR(36),
    [capacity] VARCHAR(50),
    [capacity_unit] VARCHAR(10),
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME
  );
  PRINT 'Created: wms_locations';
END
GO

-- ============================================================
-- 22. WMS STOCK ITEMS (WMS DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'wms_stock_items')
BEGIN
  CREATE TABLE [wms_stock_items] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [product_id] CHAR(36) NOT NULL,
    [location_id] CHAR(36) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [quantity_unit] VARCHAR(10) NOT NULL,
    [reserved_quantity] DECIMAL(18,3) NOT NULL DEFAULT 0,
    [reserved_quantity_unit] VARCHAR(10) NOT NULL,
    [lot_number] VARCHAR(50),
    [expiration_date] DATETIME,
    [unit_cost_amount] DECIMAL(18,2) NOT NULL,
    [unit_cost_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME
  );
  PRINT 'Created: wms_stock_items';
END
GO

-- ============================================================
-- 23. WMS STOCK MOVEMENTS (WMS DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'wms_stock_movements')
BEGIN
  CREATE TABLE [wms_stock_movements] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [product_id] CHAR(36) NOT NULL,
    [from_location_id] CHAR(36),
    [to_location_id] CHAR(36),
    [type] VARCHAR(30) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [quantity_unit] VARCHAR(10) NOT NULL,
    [unit_cost_amount] DECIMAL(18,2) NOT NULL,
    [unit_cost_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [total_cost_amount] DECIMAL(18,2) NOT NULL,
    [total_cost_currency] VARCHAR(3) NOT NULL DEFAULT 'BRL',
    [reference_type] VARCHAR(20),
    [reference_id] CHAR(36),
    [reason] VARCHAR(500),
    [executed_by] VARCHAR(50) NOT NULL,
    [executed_at] DATETIME NOT NULL,
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME DEFAULT GETDATE(),
    [deleted_at] DATETIME
  );
  PRINT 'Created: wms_stock_movements';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wms_stock_movements_tenant')
BEGIN
  CREATE INDEX [idx_wms_stock_movements_tenant] ON [wms_stock_movements]([organization_id], [branch_id]);
END
GO

-- ============================================================
-- 24. WMS INVENTORY COUNTS (WMS DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'wms_inventory_counts')
BEGIN
  CREATE TABLE [wms_inventory_counts] (
    [id] CHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [location_id] CHAR(36) NOT NULL,
    [product_id] CHAR(36) NOT NULL,
    [system_quantity] DECIMAL(18,3) NOT NULL,
    [system_quantity_unit] VARCHAR(10) NOT NULL,
    [counted_quantity] DECIMAL(18,3),
    [counted_quantity_unit] VARCHAR(10),
    [status] VARCHAR(20) NOT NULL,
    [counted_by] VARCHAR(50),
    [counted_at] DATETIME,
    [adjustment_movement_id] CHAR(36),
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [deleted_at] DATETIME
  );
  PRINT 'Created: wms_inventory_counts';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wms_inventory_counts_tenant')
BEGIN
  CREATE INDEX [idx_wms_inventory_counts_tenant] ON [wms_inventory_counts]([organization_id], [branch_id]);
END
GO

-- ============================================================
-- 25. STRATEGIC USER DASHBOARD LAYOUT (Strategic DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_user_dashboard_layout')
BEGIN
  CREATE TABLE [strategic_user_dashboard_layout] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [user_id] VARCHAR(36) NOT NULL,
    [layout_json] TEXT NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: strategic_user_dashboard_layout';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_user_dashboard_layout_tenant')
BEGIN
  CREATE INDEX [idx_user_dashboard_layout_tenant] ON [strategic_user_dashboard_layout]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_user_dashboard_layout_user')
BEGIN
  CREATE INDEX [idx_user_dashboard_layout_user] ON [strategic_user_dashboard_layout]([organization_id], [branch_id], [user_id]);
END
GO

-- ============================================================
-- 26. STRATEGIC APPROVAL APPROVERS (Strategic DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_approval_approvers')
BEGIN
  CREATE TABLE [strategic_approval_approvers] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [role] VARCHAR(50),
    [scope] VARCHAR(20) NOT NULL DEFAULT 'ALL',
    [department_id] VARCHAR(36),
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_by] VARCHAR(36),
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: strategic_approval_approvers';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approvers_org_branch_active')
BEGIN
  CREATE INDEX [idx_approvers_org_branch_active] ON [strategic_approval_approvers]([organization_id], [branch_id], [is_active]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approvers_user')
BEGIN
  CREATE INDEX [idx_approvers_user] ON [strategic_approval_approvers]([user_id], [organization_id], [branch_id]);
END
GO

-- ============================================================
-- 27. STRATEGIC PDCA CYCLE (Strategic DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_pdca_cycle')
BEGIN
  CREATE TABLE [strategic_pdca_cycle] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [action_plan_id] VARCHAR(36) NOT NULL,
    [from_phase] VARCHAR(10) NOT NULL,
    [to_phase] VARCHAR(10) NOT NULL,
    [transition_reason] TEXT,
    [evidences] TEXT,
    [completion_percent] INT NOT NULL,
    [transitioned_by] VARCHAR(36) NOT NULL,
    [transitioned_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: strategic_pdca_cycle';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pdca_cycle_tenant')
BEGIN
  CREATE INDEX [idx_pdca_cycle_tenant] ON [strategic_pdca_cycle]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pdca_cycle_action_plan')
BEGIN
  CREATE INDEX [idx_pdca_cycle_action_plan] ON [strategic_pdca_cycle]([action_plan_id]);
END
GO

-- ============================================================
-- 28. STRATEGIC GOAL CASCADE (Strategic DDD)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_goal_cascade')
BEGIN
  CREATE TABLE [strategic_goal_cascade] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [cause_goal_id] VARCHAR(36) NOT NULL,
    [effect_goal_id] VARCHAR(36) NOT NULL,
    [contribution_weight] DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    [description] VARCHAR(500),
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: strategic_goal_cascade';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_goal_cascade_tenant')
BEGIN
  CREATE INDEX [idx_goal_cascade_tenant] ON [strategic_goal_cascade]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_goal_cascade_cause')
BEGIN
  CREATE INDEX [idx_goal_cascade_cause] ON [strategic_goal_cascade]([cause_goal_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_goal_cascade_effect')
BEGIN
  CREATE INDEX [idx_goal_cascade_effect] ON [strategic_goal_cascade]([effect_goal_id]);
END
GO

-- ============================================================
-- 29. AGENT SESSIONS (Agent)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'agent_sessions')
BEGIN
  CREATE TABLE [agent_sessions] (
    [id] VARCHAR(36) PRIMARY KEY,
    [user_id] VARCHAR(36) NOT NULL,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [title] VARCHAR(255) NOT NULL,
    [metadata] TEXT,
    [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: agent_sessions';
END
GO

-- ============================================================
-- 30. AGENT MESSAGES (Agent)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'agent_messages')
BEGIN
  CREATE TABLE [agent_messages] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [session_id] VARCHAR(36) NOT NULL,
    [role] VARCHAR(20) NOT NULL,
    [content] TEXT NOT NULL,
    [tools_used] TEXT,
    [metadata] TEXT,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: agent_messages';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_agent_messages_tenant')
BEGIN
  CREATE INDEX [idx_agent_messages_tenant] ON [agent_messages]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_agent_messages_session')
BEGIN
  CREATE INDEX [idx_agent_messages_session] ON [agent_messages]([session_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_agent_messages_created')
BEGIN
  CREATE INDEX [idx_agent_messages_created] ON [agent_messages]([created_at]);
END
GO

-- ============================================================
-- 31. DOMAIN EVENT OUTBOX (Shared Infrastructure)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'domain_event_outbox')
BEGIN
  CREATE TABLE [domain_event_outbox] (
    [id] VARCHAR(36) PRIMARY KEY,
    [event_type] VARCHAR(255) NOT NULL,
    [aggregate_id] VARCHAR(36) NOT NULL,
    [aggregate_type] VARCHAR(100) NOT NULL,
    [payload] TEXT NOT NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    [retry_count] INT NOT NULL DEFAULT 0,
    [max_retries] INT NOT NULL DEFAULT 5,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [published_at] DATETIME2,
    [last_attempt_at] DATETIME2,
    [error_message] TEXT,
    [metadata] TEXT
  );
  PRINT 'Created: domain_event_outbox';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_outbox_status')
BEGIN
  CREATE INDEX [idx_outbox_status] ON [domain_event_outbox]([status]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_outbox_created')
BEGIN
  CREATE INDEX [idx_outbox_created] ON [domain_event_outbox]([created_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_outbox_aggregate')
BEGIN
  CREATE INDEX [idx_outbox_aggregate] ON [domain_event_outbox]([aggregate_type], [aggregate_id]);
END
GO

-- ============================================================
-- 32. RETENTION POLICIES (Shared Infrastructure)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'retention_policies')
BEGIN
  CREATE TABLE [retention_policies] (
    [id] VARCHAR(36) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [policy_name] VARCHAR(100) NOT NULL,
    [table_name] VARCHAR(100) NOT NULL,
    [retention_days] INT NOT NULL,
    [date_column] VARCHAR(100) NOT NULL DEFAULT 'created_at',
    [additional_conditions] VARCHAR(1000),
    [is_active] INT NOT NULL DEFAULT 1,
    [last_run_at] DATETIME2,
    [last_run_records_deleted] INT,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: retention_policies';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_retention_tenant')
BEGIN
  CREATE INDEX [idx_retention_tenant] ON [retention_policies]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_retention_policies_name')
BEGIN
  CREATE INDEX [idx_retention_policies_name] ON [retention_policies]([policy_name]);
END
GO

-- ============================================================
-- 33. FISCAL DOCUMENTS AUDIT (Shared Infrastructure)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fiscal_documents_audit')
BEGIN
  CREATE TABLE [fiscal_documents_audit] (
    [id] VARCHAR(36) PRIMARY KEY,
    [entity_id] VARCHAR(36) NOT NULL,
    [entity_type] VARCHAR(50) NOT NULL,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [operation] VARCHAR(10) NOT NULL,
    [old_values] NVARCHAR(MAX),
    [new_values] NVARCHAR(MAX),
    [changed_fields] NVARCHAR(MAX),
    [reason] VARCHAR(500),
    [changed_by] VARCHAR(36) NOT NULL,
    [changed_by_name] VARCHAR(255),
    [changed_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [ip_address] VARCHAR(50),
    [user_agent] VARCHAR(500),
    [request_id] VARCHAR(36),
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Created: fiscal_documents_audit';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_entity')
BEGIN
  CREATE INDEX [idx_fiscal_documents_audit_entity] ON [fiscal_documents_audit]([entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_tenant')
BEGIN
  CREATE INDEX [idx_fiscal_documents_audit_tenant] ON [fiscal_documents_audit]([organization_id], [branch_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_date')
BEGIN
  CREATE INDEX [idx_fiscal_documents_audit_date] ON [fiscal_documents_audit]([changed_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_documents_audit_user')
BEGIN
  CREATE INDEX [idx_fiscal_documents_audit_user] ON [fiscal_documents_audit]([changed_by]);
END
GO

-- ============================================================
-- 34. SHARED AUDIT LOG (Shared Infrastructure)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'shared_audit_log')
BEGIN
  CREATE TABLE [shared_audit_log] (
    [id] VARCHAR(36) PRIMARY KEY,
    [entity_type] VARCHAR(100) NOT NULL,
    [entity_id] VARCHAR(36) NOT NULL,
    [operation] VARCHAR(20) NOT NULL,
    [user_id] VARCHAR(36) NOT NULL,
    [user_name] VARCHAR(200),
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [timestamp] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [previous_values] TEXT,
    [new_values] TEXT,
    [changed_fields] TEXT,
    [client_ip] VARCHAR(45),
    [user_agent] VARCHAR(500),
    [metadata] TEXT
  );
  PRINT 'Created: shared_audit_log';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_entity')
BEGIN
  CREATE INDEX [idx_audit_log_entity] ON [shared_audit_log]([entity_type], [entity_id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_tenant_time')
BEGIN
  CREATE INDEX [idx_audit_log_tenant_time] ON [shared_audit_log]([organization_id], [branch_id], [timestamp]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_user')
BEGIN
  CREATE INDEX [idx_audit_log_user] ON [shared_audit_log]([user_id], [timestamp]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_operation')
BEGIN
  CREATE INDEX [idx_audit_log_operation] ON [shared_audit_log]([operation], [timestamp]);
END
GO

-- ============================================================
-- FIM DA MIGRATION 0002
-- ============================================================
PRINT '=== Migration 0002_ddd_module_tables.sql completed ===';
PRINT 'Tables: 34 (all with IF NOT EXISTS guard)';
