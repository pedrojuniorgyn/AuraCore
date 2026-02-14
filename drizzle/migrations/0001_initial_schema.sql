-- =============================================================================
-- Migration: 0001_initial_schema.sql
-- Data: 2026-02-08
-- Épico: HOTFIX-008
-- Autor: Pedro Lemes / Agent
--
-- DESCRIÇÃO:
-- Cria TODAS as tabelas base do AuraCore que originalmente foram criadas
-- via drizzle-kit push e nunca tiveram migration SQL explícita.
-- Sem estas tabelas, as migrations subsequentes (0006+) falham por falta
-- de FK parents (organizations, users, branches).
--
-- IDEMPOTÊNCIA: Todas as operações usam IF NOT EXISTS.
-- ROLLBACK: DROP TABLE [tabela] para cada tabela criada.
-- =============================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================
-- GRUPO 1: TABELAS RAIZ (sem dependências FK)
-- ============================================

-- 1. ORGANIZATIONS (Inquilinos SaaS - raiz de tudo)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'organizations')
BEGIN
  CREATE TABLE [organizations] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    [slug] NVARCHAR(100) NOT NULL,
    [document] NVARCHAR(20) NOT NULL,
    [plan] NVARCHAR(20) DEFAULT 'FREE',
    [stripe_customer_id] NVARCHAR(100),
    [ie] NVARCHAR(20),
    [im] NVARCHAR(20),
    [accountant_name] NVARCHAR(100),
    [accountant_document] NVARCHAR(14),
    [accountant_crc_state] NVARCHAR(2),
    [accountant_crc] NVARCHAR(20),
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: organizations';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'organizations_slug_idx')
  CREATE UNIQUE INDEX [organizations_slug_idx] ON [organizations]([slug]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'organizations_document_idx')
  CREATE UNIQUE INDEX [organizations_document_idx] ON [organizations]([document]);
GO

-- 2. ROLES (RBAC - sem FK)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'roles')
BEGIN
  CREATE TABLE [roles] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: roles';
END
GO

-- 3. VERIFICATION TOKEN (Auth.js - sem FK)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'verificationToken')
BEGIN
  CREATE TABLE [verificationToken] (
    [identifier] NVARCHAR(255) NOT NULL,
    [token] NVARCHAR(255) NOT NULL,
    [expires] DATETIME2(3) NOT NULL,
    CONSTRAINT [PK_verificationToken] PRIMARY KEY ([identifier], [token])
  );
  PRINT 'Created: verificationToken';
END
GO

-- ============================================
-- GRUPO 2: AUTH (dependem de organizations)
-- ============================================

-- 4. USERS (Auth.js + Multi-Tenant)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
BEGIN
  CREATE TABLE [users] (
    [id] NVARCHAR(255) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [name] NVARCHAR(255),
    [email] NVARCHAR(255) NOT NULL,
    [emailVerified] DATETIME2(3),
    [image] NVARCHAR(MAX),
    [password_hash] NVARCHAR(MAX),
    [role] NVARCHAR(50) DEFAULT 'USER',
    [default_branch_id] INT,
    [totp_secret] NVARCHAR(500),
    [totp_enabled] BIT NOT NULL DEFAULT 0,
    [totp_backup_codes] NVARCHAR(MAX),
    [totp_verified_at] DATETIME2(3),
    [created_at] DATETIME2(3) DEFAULT GETDATE(),
    [updated_at] DATETIME2(3) DEFAULT GETDATE(),
    [deleted_at] DATETIME2(3),
    CONSTRAINT [FK_users_organization] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: users';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'users_email_org_idx')
  CREATE UNIQUE INDEX [users_email_org_idx] ON [users]([email], [organization_id]);
GO

-- 5. BRANCHES (Filiais - Multi-Tenant)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'branches')
BEGIN
  CREATE TABLE [branches] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [legacy_company_branch_code] INT,
    [name] NVARCHAR(255) NOT NULL,
    [trade_name] NVARCHAR(255) NOT NULL,
    [document] NVARCHAR(20) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [phone] NVARCHAR(20) NOT NULL,
    [ie] NVARCHAR(20) NOT NULL,
    [im] NVARCHAR(20),
    [c_class_trib] NVARCHAR(10),
    [crt] NVARCHAR(1) NOT NULL DEFAULT '1',
    [zip_code] NVARCHAR(10) NOT NULL,
    [street] NVARCHAR(255) NOT NULL,
    [number] NVARCHAR(20) NOT NULL,
    [complement] NVARCHAR(100),
    [district] NVARCHAR(100) NOT NULL,
    [city_code] NVARCHAR(7) NOT NULL,
    [city_name] NVARCHAR(100) NOT NULL,
    [state] NVARCHAR(2) NOT NULL,
    [time_zone] NVARCHAR(50) DEFAULT 'America/Sao_Paulo',
    [logo_url] NVARCHAR(500),
    [certificate_pfx] NVARCHAR(MAX),
    [certificate_password] NVARCHAR(255),
    [certificate_expiry] DATETIME2,
    [last_nsu] NVARCHAR(15) DEFAULT '0',
    [environment] NVARCHAR(20) DEFAULT 'HOMOLOGATION',
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1,
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    CONSTRAINT [FK_branches_organization] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: branches';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'branches_document_org_idx')
  CREATE UNIQUE INDEX [branches_document_org_idx] ON [branches]([document], [organization_id]) WHERE [deleted_at] IS NULL;
GO

-- 6. ACCOUNTS (Auth.js OAuth)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'accounts')
BEGIN
  CREATE TABLE [accounts] (
    [user_id] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(255) NOT NULL,
    [provider] NVARCHAR(255) NOT NULL,
    [provider_account_id] NVARCHAR(255) NOT NULL,
    [refresh_token] NVARCHAR(MAX),
    [access_token] NVARCHAR(MAX),
    [expires_at] INT,
    [token_type] NVARCHAR(255),
    [scope] NVARCHAR(MAX),
    [id_token] NVARCHAR(MAX),
    [session_state] NVARCHAR(MAX),
    CONSTRAINT [PK_accounts] PRIMARY KEY ([provider], [provider_account_id]),
    CONSTRAINT [FK_accounts_user] FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: accounts';
END
GO

-- 7. SESSIONS (Auth.js)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sessions')
BEGIN
  CREATE TABLE [sessions] (
    [session_token] NVARCHAR(255) PRIMARY KEY,
    [user_id] NVARCHAR(255) NOT NULL,
    [expires] DATETIME2(3) NOT NULL,
    CONSTRAINT [FK_sessions_user] FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: sessions';
END
GO

-- 8. USER_BRANCHES (Data Scoping)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_branches')
BEGIN
  CREATE TABLE [user_branches] (
    [user_id] NVARCHAR(255) NOT NULL,
    [branch_id] INT NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT [PK_user_branches] PRIMARY KEY ([user_id], [branch_id])
  );
  PRINT 'Created: user_branches';
END
GO

-- 9. PERMISSIONS (RBAC)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'permissions')
BEGIN
  CREATE TABLE [permissions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [slug] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(255),
    [module] NVARCHAR(50),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: permissions';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'permissions_slug_idx')
  CREATE UNIQUE INDEX [permissions_slug_idx] ON [permissions]([slug]);
GO

-- 10. ROLE_PERMISSIONS (Pivot RBAC)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'role_permissions')
BEGIN
  CREATE TABLE [role_permissions] (
    [role_id] INT NOT NULL,
    [permission_id] INT NOT NULL,
    CONSTRAINT [PK_role_permissions] PRIMARY KEY ([role_id], [permission_id])
  );
  PRINT 'Created: role_permissions';
END
GO

-- 11. USER_ROLES (Pivot RBAC)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_roles')
BEGIN
  CREATE TABLE [user_roles] (
    [user_id] NVARCHAR(255) NOT NULL,
    [role_id] INT NOT NULL,
    [organization_id] INT NOT NULL,
    [branch_id] INT,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT [PK_user_roles] PRIMARY KEY ([user_id], [role_id])
  );
  PRINT 'Created: user_roles';
END
GO

-- ============================================
-- GRUPO 3: MASTER DATA (dependem de org/branch)
-- ============================================

-- 12. BUSINESS_PARTNERS (Clientes/Fornecedores)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'business_partners')
BEGIN
  CREATE TABLE [business_partners] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [document] NVARCHAR(20) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [trade_name] NVARCHAR(255),
    [email] NVARCHAR(255),
    [phone] NVARCHAR(20),
    [data_source] NVARCHAR(20) DEFAULT 'MANUAL',
    [tax_regime] NVARCHAR(20) NOT NULL,
    [ie] NVARCHAR(20),
    [im] NVARCHAR(20),
    [c_class_trib] NVARCHAR(10),
    [ind_iedest] NVARCHAR(1) DEFAULT '9',
    [zip_code] NVARCHAR(10) NOT NULL,
    [street] NVARCHAR(255) NOT NULL,
    [number] NVARCHAR(20) NOT NULL,
    [complement] NVARCHAR(100),
    [district] NVARCHAR(100) NOT NULL,
    [city_code] NVARCHAR(7) NOT NULL,
    [city_name] NVARCHAR(100) NOT NULL,
    [state] NVARCHAR(2) NOT NULL,
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1,
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    CONSTRAINT [FK_bp_organization] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: business_partners';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'business_partners_document_org_idx')
  CREATE UNIQUE INDEX [business_partners_document_org_idx] ON [business_partners]([document], [organization_id]);
GO

-- 13. PRODUCTS (Produtos/Materiais)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'products')
BEGIN
  CREATE TABLE [products] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL DEFAULT 1,
    [sku] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [unit] NVARCHAR(10) NOT NULL,
    [ncm] NVARCHAR(8) NOT NULL,
    [origin] NVARCHAR(1) NOT NULL DEFAULT '0',
    [weight_kg] DECIMAL(10,3),
    [price_cost] DECIMAL(18,2),
    [price_sale] DECIMAL(18,2),
    [unit_conversion_enabled] NVARCHAR(1) DEFAULT 'N',
    [unit_conversion_factor] DECIMAL(10,4),
    [primary_unit] NVARCHAR(10),
    [secondary_unit] NVARCHAR(10),
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1,
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    CONSTRAINT [FK_products_organization] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: products';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'products_sku_org_idx')
  CREATE UNIQUE INDEX [products_sku_org_idx] ON [products]([sku], [organization_id]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_tenant')
  CREATE INDEX [idx_products_tenant] ON [products]([organization_id], [branch_id]);
GO

-- 14. COST_CENTERS (Centros de Custo)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cost_centers')
BEGIN
  CREATE TABLE [cost_centers] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL DEFAULT 1,
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [type] NVARCHAR(20) NOT NULL,
    [parent_id] INT,
    [level] INT DEFAULT 0,
    [is_analytical] NVARCHAR(10) DEFAULT 'false',
    [linked_vehicle_id] INT,
    [linked_partner_id] INT,
    [linked_branch_id] INT,
    [class] NVARCHAR(20) DEFAULT 'BOTH',
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: cost_centers';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'cost_centers_code_org_idx')
  CREATE UNIQUE INDEX [cost_centers_code_org_idx] ON [cost_centers]([code], [organization_id]) WHERE [deleted_at] IS NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cost_centers_tenant')
  CREATE INDEX [idx_cost_centers_tenant] ON [cost_centers]([organization_id], [branch_id]);
GO

-- 15. GEO_REGIONS (Regiões Geográficas)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'geo_regions')
BEGIN
  CREATE TABLE [geo_regions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [code] NVARCHAR(20) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: geo_regions';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'geo_regions_code_org_idx')
  CREATE UNIQUE INDEX [geo_regions_code_org_idx] ON [geo_regions]([code], [organization_id]) WHERE [deleted_at] IS NULL;
GO

-- 16. CHART_OF_ACCOUNTS (Plano de Contas Contábil)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'chart_of_accounts')
BEGIN
  CREATE TABLE [chart_of_accounts] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [type] NVARCHAR(30) NOT NULL,
    [category] NVARCHAR(50) NOT NULL,
    [parent_id] INT,
    [level] INT DEFAULT 0,
    [is_analytical] NVARCHAR(10) DEFAULT 'false',
    [accepts_cost_center] NVARCHAR(10) DEFAULT 'false',
    [requires_cost_center] NVARCHAR(10) DEFAULT 'false',
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: chart_of_accounts';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'chart_of_accounts_code_org_idx')
  CREATE UNIQUE INDEX [chart_of_accounts_code_org_idx] ON [chart_of_accounts]([code], [organization_id]) WHERE [deleted_at] IS NULL;
GO

-- 17. PCG_NCM_RULES (Regras NCM x Plano Gerencial)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'pcg_ncm_rules')
BEGIN
  CREATE TABLE [pcg_ncm_rules] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [pcg_id] INT NOT NULL,
    [ncm_code] NVARCHAR(10) NOT NULL,
    [ncm_description] NVARCHAR(255),
    [flag_pis_cofins_monofasico] INT NOT NULL DEFAULT 0,
    [flag_icms_st] INT NOT NULL DEFAULT 0,
    [flag_icms_diferimento] INT NOT NULL DEFAULT 0,
    [flag_ipi_suspenso] INT NOT NULL DEFAULT 0,
    [flag_importacao] INT NOT NULL DEFAULT 0,
    [priority] INT NOT NULL DEFAULT 100,
    [is_active] INT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: pcg_ncm_rules';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'pcg_ncm_rules_org_pcg_ncm_idx')
  CREATE UNIQUE INDEX [pcg_ncm_rules_org_pcg_ncm_idx] ON [pcg_ncm_rules]([organization_id], [pcg_id], [ncm_code]) WHERE [deleted_at] IS NULL;
GO

-- 18. AUDIT_LOGS (Auditoria Global)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_logs')
BEGIN
  CREATE TABLE [audit_logs] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [user_id] NVARCHAR(255),
    [action] NVARCHAR(50) NOT NULL,
    [entity] NVARCHAR(50) NOT NULL,
    [entity_id] NVARCHAR(255),
    [changes] NVARCHAR(MAX),
    [ip_address] NVARCHAR(50),
    [user_agent] NVARCHAR(500),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT [FK_audit_logs_organization] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: audit_logs';
END
GO

-- ============================================
-- GRUPO 4: FINANCEIRO/FISCAL (dependem de master data)
-- ============================================

-- 19. INBOUND_INVOICES (NFe de Entrada)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'inbound_invoices')
BEGIN
  CREATE TABLE [inbound_invoices] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [partner_id] INT,
    [access_key] NVARCHAR(44) NOT NULL,
    [series] NVARCHAR(10),
    [number] NVARCHAR(20),
    [model] NVARCHAR(2) DEFAULT '55',
    [issue_date] DATETIME2 NOT NULL,
    [entry_date] DATETIME2,
    [total_products] DECIMAL(18,2),
    [total_nfe] DECIMAL(18,2),
    [xml_content] NVARCHAR(MAX),
    [xml_hash] NVARCHAR(64),
    [status] NVARCHAR(20) DEFAULT 'DRAFT',
    [imported_by] NVARCHAR(255),
    [nfe_type] NVARCHAR(20) DEFAULT 'PURCHASE',
    [carrier_cnpj] NVARCHAR(14),
    [carrier_name] NVARCHAR(255),
    [recipient_cnpj] NVARCHAR(14),
    [recipient_name] NVARCHAR(255),
    [recipient_city] NVARCHAR(100),
    [recipient_uf] NVARCHAR(2),
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_inbound_inv_org] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: inbound_invoices';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'inbound_invoices_access_key_idx')
  CREATE UNIQUE INDEX [inbound_invoices_access_key_idx] ON [inbound_invoices]([access_key], [organization_id]);
GO

-- 20. INBOUND_INVOICE_ITEMS (Itens NFe Entrada)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'inbound_invoice_items')
BEGIN
  CREATE TABLE [inbound_invoice_items] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [invoice_id] INT NOT NULL,
    [product_id] INT,
    [product_code_xml] NVARCHAR(60),
    [product_name_xml] NVARCHAR(500),
    [ean_xml] NVARCHAR(14),
    [ncm] NVARCHAR(8),
    [cfop] NVARCHAR(4),
    [cst] NVARCHAR(3),
    [quantity] DECIMAL(15,4) NOT NULL,
    [unit] NVARCHAR(10),
    [unit_price] DECIMAL(18,6),
    [total_price] DECIMAL(18,2),
    [item_number] INT,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: inbound_invoice_items';
END
GO

-- 21. PAYABLE_ITEMS (Itens de Contas a Pagar)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'payable_items')
BEGIN
  CREATE TABLE [payable_items] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [payable_id] INT NOT NULL,
    [item_number] INT NOT NULL,
    [ncm] NVARCHAR(10) NOT NULL,
    [product_code] NVARCHAR(100),
    [product_name] NVARCHAR(255) NOT NULL,
    [ean] NVARCHAR(20),
    [cfop] NVARCHAR(10),
    [cst] NVARCHAR(10),
    [unit] NVARCHAR(10) NOT NULL,
    [quantity] DECIMAL(18,4) NOT NULL,
    [unit_price] DECIMAL(18,4) NOT NULL,
    [total_price] DECIMAL(18,2) NOT NULL,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: payable_items';
END
GO

-- 22. AUTO_CLASSIFICATION_RULES (Classificação Automática NCM)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'auto_classification_rules')
BEGIN
  CREATE TABLE [auto_classification_rules] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [priority] INT NOT NULL DEFAULT 100,
    [match_type] NVARCHAR(30) NOT NULL,
    [ncm_code] NVARCHAR(10),
    [cfop_code] NVARCHAR(10),
    [supplier_id] INT,
    [keyword] NVARCHAR(100),
    [operation_type] NVARCHAR(20) NOT NULL,
    [category_id] INT NOT NULL,
    [chart_account_id] INT NOT NULL,
    [cost_center_id] INT,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [is_active] NVARCHAR(10) DEFAULT 'true',
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT NOT NULL DEFAULT 1
  );
  PRINT 'Created: auto_classification_rules';
END
GO

-- 23. FISCAL_SETTINGS (Configurações Fiscais por Filial)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fiscal_settings')
BEGIN
  CREATE TABLE [fiscal_settings] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [nfe_environment] NVARCHAR(20) NOT NULL DEFAULT 'production',
    [cte_environment] NVARCHAR(20) NOT NULL DEFAULT 'homologacao',
    [cte_series] NVARCHAR(3) DEFAULT '1',
    [auto_import_enabled] NVARCHAR(1) DEFAULT 'S',
    [auto_import_interval] INT DEFAULT 1,
    [last_auto_import] DATETIME2,
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [version] INT NOT NULL DEFAULT 1,
    [deleted_at] DATETIME2
  );
  PRINT 'Created: fiscal_settings';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_settings_tenant')
  CREATE INDEX [idx_fiscal_settings_tenant] ON [fiscal_settings]([organization_id], [branch_id]);
GO

-- ============================================
-- GRUPO 5: TRANSPORTE/FROTA EXTENSÕES
-- ============================================

-- 24. TRIP_CHECKPOINTS (Rastreamento de Viagem)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'trip_checkpoints')
BEGIN
  CREATE TABLE [trip_checkpoints] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [trip_id] INT NOT NULL,
    [checkpoint_type] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(500),
    [latitude] DECIMAL(10,8),
    [longitude] DECIMAL(11,8),
    [location_address] NVARCHAR(500),
    [recorded_at] DATETIME2 NOT NULL,
    [recorded_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: trip_checkpoints';
END
GO

-- 25. CTE_INUTILIZATION (Inutilização de CTe)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cte_inutilization')
BEGIN
  CREATE TABLE [cte_inutilization] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [serie] NVARCHAR(3) NOT NULL,
    [number_from] INT NOT NULL,
    [number_to] INT NOT NULL,
    [year] INT NOT NULL,
    [justification] NVARCHAR(500) NOT NULL,
    [protocol_number] NVARCHAR(20),
    [status] NVARCHAR(20) DEFAULT 'PENDING',
    [sefaz_return_message] NVARCHAR(500),
    [inutilized_at] DATETIME2,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: cte_inutilization';
END
GO

-- 26. CTE_CORRECTION_LETTERS (Carta de Correção CTe)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cte_correction_letters')
BEGIN
  CREATE TABLE [cte_correction_letters] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [cte_header_id] INT NOT NULL,
    [sequence_number] INT NOT NULL,
    [corrections] NVARCHAR(MAX) NOT NULL,
    [protocol_number] NVARCHAR(20),
    [status] NVARCHAR(20) DEFAULT 'PENDING',
    [sefaz_return_message] NVARCHAR(500),
    [xml_event] NVARCHAR(MAX),
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: cte_correction_letters';
END
GO

-- 27. FUEL_TRANSACTIONS (Abastecimentos)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fuel_transactions')
BEGIN
  CREATE TABLE [fuel_transactions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL DEFAULT 1,
    [vehicle_id] INT NOT NULL,
    [driver_id] INT,
    [transaction_date] DATETIME2 NOT NULL,
    [fuel_type] NVARCHAR(20),
    [liters] DECIMAL(10,2) NOT NULL,
    [price_per_liter] DECIMAL(10,2),
    [total_value] DECIMAL(18,2) NOT NULL,
    [odometer] INT,
    [station_name] NVARCHAR(255),
    [station_cnpj] NVARCHAR(18),
    [source] NVARCHAR(20),
    [nfe_key] NVARCHAR(44),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: fuel_transactions';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fuel_transactions_tenant')
  CREATE INDEX [idx_fuel_transactions_tenant] ON [fuel_transactions]([organization_id], [branch_id]);
GO

-- 28. DRIVER_WORK_SHIFTS (Jornada Motorista)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'driver_work_shifts')
BEGIN
  CREATE TABLE [driver_work_shifts] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [driver_id] INT NOT NULL,
    [trip_id] INT,
    [shift_date] DATETIME2 NOT NULL,
    [started_at] DATETIME2,
    [ended_at] DATETIME2,
    [total_driving_hours] DECIMAL(5,2),
    [total_rest_hours] DECIMAL(5,2),
    [total_waiting_hours] DECIMAL(5,2),
    [status] NVARCHAR(20) DEFAULT 'IN_PROGRESS',
    [violations] NVARCHAR(MAX),
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: driver_work_shifts';
END
GO

-- 29. DRIVER_SHIFT_EVENTS (Eventos de Jornada)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'driver_shift_events')
BEGIN
  CREATE TABLE [driver_shift_events] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [work_shift_id] INT NOT NULL,
    [event_type] NVARCHAR(20) NOT NULL,
    [event_time] DATETIME2 NOT NULL,
    [source] NVARCHAR(20) DEFAULT 'MANUAL',
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: driver_shift_events';
END
GO

-- ============================================
-- GRUPO 6: CRM COMERCIAL
-- ============================================

-- 30. CRM_LEADS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'crm_leads')
BEGIN
  CREATE TABLE [crm_leads] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [company_name] NVARCHAR(255) NOT NULL,
    [cnpj] NVARCHAR(18),
    [contact_name] NVARCHAR(255),
    [contact_email] NVARCHAR(255),
    [contact_phone] NVARCHAR(20),
    [segment] NVARCHAR(50),
    [source] NVARCHAR(50),
    [stage] NVARCHAR(50) NOT NULL DEFAULT 'PROSPECTING',
    [score] INT DEFAULT 0,
    [estimated_value] DECIMAL(18,2),
    [estimated_monthly_shipments] INT,
    [expected_close_date] DATETIME2,
    [probability] INT,
    [owner_id] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [lost_reason] NVARCHAR(500),
    [won_date] DATETIME2,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: crm_leads';
END
GO

-- 31. CRM_ACTIVITIES
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'crm_activities')
BEGIN
  CREATE TABLE [crm_activities] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [lead_id] INT,
    [partner_id] INT,
    [type] NVARCHAR(50) NOT NULL,
    [subject] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [scheduled_at] DATETIME2,
    [completed_at] DATETIME2,
    [status] NVARCHAR(20) DEFAULT 'PENDING',
    [assigned_to] NVARCHAR(255),
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: crm_activities';
END
GO

-- 32. COMMERCIAL_PROPOSALS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'commercial_proposals')
BEGIN
  CREATE TABLE [commercial_proposals] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [proposal_number] NVARCHAR(20) NOT NULL,
    [lead_id] INT,
    [partner_id] INT,
    [status] NVARCHAR(20) DEFAULT 'DRAFT',
    [routes] NVARCHAR(MAX),
    [prices] NVARCHAR(MAX),
    [conditions] NVARCHAR(MAX),
    [validity_days] INT DEFAULT 15,
    [pdf_url] NVARCHAR(500),
    [sent_at] DATETIME2,
    [sent_to_email] NVARCHAR(255),
    [accepted_at] DATETIME2,
    [rejected_at] DATETIME2,
    [rejection_reason] NVARCHAR(500),
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: commercial_proposals';
END
GO

-- ============================================
-- GRUPO 7: MANUTENÇÃO
-- ============================================

-- 33. TIRES (Pneus)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tires')
BEGIN
  CREATE TABLE [tires] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [serial_number] NVARCHAR(50) NOT NULL,
    [brand_id] INT,
    [model] NVARCHAR(100),
    [size] NVARCHAR(20),
    [purchase_date] DATETIME2,
    [purchase_price] DECIMAL(18,2),
    [status] NVARCHAR(20) DEFAULT 'STOCK',
    [current_vehicle_id] INT,
    [position] NVARCHAR(20),
    [initial_mileage] INT,
    [current_mileage] INT,
    [total_km_used] INT,
    [recapping_count] INT DEFAULT 0,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: tires';
END
GO

-- 34. TIRE_MOVEMENTS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tire_movements')
BEGIN
  CREATE TABLE [tire_movements] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [tire_id] INT NOT NULL,
    [movement_type] NVARCHAR(20) NOT NULL,
    [from_vehicle_id] INT,
    [from_position] NVARCHAR(20),
    [to_vehicle_id] INT,
    [to_position] NVARCHAR(20),
    [mileage_at_movement] INT,
    [notes] NVARCHAR(500),
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: tire_movements';
END
GO

-- 35. VEHICLE_MAINTENANCE_PLANS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'vehicle_maintenance_plans')
BEGIN
  CREATE TABLE [vehicle_maintenance_plans] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [vehicle_model] NVARCHAR(100),
    [service_name] NVARCHAR(255) NOT NULL,
    [service_description] NVARCHAR(500),
    [trigger_type] NVARCHAR(20) NOT NULL,
    [mileage_interval] INT,
    [time_interval_months] INT,
    [advance_warning_km] INT,
    [advance_warning_days] INT,
    [is_active] NVARCHAR(1) DEFAULT 'S',
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: vehicle_maintenance_plans';
END
GO

-- 36. MAINTENANCE_ALERTS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'maintenance_alerts')
BEGIN
  CREATE TABLE [maintenance_alerts] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [vehicle_id] INT NOT NULL,
    [maintenance_plan_id] INT NOT NULL,
    [alert_type] NVARCHAR(20) NOT NULL,
    [alert_message] NVARCHAR(500) NOT NULL,
    [current_odometer] INT,
    [next_service_odometer] INT,
    [current_check_date] DATETIME2,
    [next_service_date] DATETIME2,
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [dismissed_at] DATETIME2,
    [dismissed_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: maintenance_alerts';
END
GO

-- 37. MECHANICS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mechanics')
BEGIN
  CREATE TABLE [mechanics] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [specialty] NVARCHAR(100),
    [hourly_rate] DECIMAL(18,2),
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: mechanics';
END
GO

-- 38. MAINTENANCE_PROVIDERS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'maintenance_providers')
BEGIN
  CREATE TABLE [maintenance_providers] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [cnpj] NVARCHAR(18),
    [contact_name] NVARCHAR(255),
    [phone] NVARCHAR(20),
    [specialty] NVARCHAR(100),
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: maintenance_providers';
END
GO

-- 39. MAINTENANCE_WORK_ORDERS (Ordens de Serviço)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'maintenance_work_orders')
BEGIN
  CREATE TABLE [maintenance_work_orders] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL DEFAULT 1,
    [wo_number] NVARCHAR(20) NOT NULL,
    [vehicle_id] INT NOT NULL,
    [wo_type] NVARCHAR(20) NOT NULL,
    [priority] NVARCHAR(20) DEFAULT 'NORMAL',
    [reported_by_driver_id] INT,
    [reported_issue] NVARCHAR(500),
    [odometer] INT,
    [status] NVARCHAR(20) DEFAULT 'OPEN',
    [provider_type] NVARCHAR(20),
    [provider_id] INT,
    [opened_at] DATETIME2 DEFAULT GETDATE(),
    [started_at] DATETIME2,
    [completed_at] DATETIME2,
    [total_labor_cost] DECIMAL(18,2),
    [total_parts_cost] DECIMAL(18,2),
    [total_cost] DECIMAL(18,2),
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: maintenance_work_orders';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_maintenance_work_orders_tenant')
  CREATE INDEX [idx_maintenance_work_orders_tenant] ON [maintenance_work_orders]([organization_id], [branch_id]);
GO

-- 40. WORK_ORDER_ITEMS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'work_order_items')
BEGIN
  CREATE TABLE [work_order_items] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [work_order_id] INT NOT NULL,
    [item_type] NVARCHAR(20) NOT NULL,
    [product_id] INT,
    [service_description] NVARCHAR(255),
    [quantity] DECIMAL(10,2) NOT NULL,
    [unit_cost] DECIMAL(18,2),
    [total_cost] DECIMAL(18,2),
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: work_order_items';
END
GO

-- 41. WORK_ORDER_MECHANICS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'work_order_mechanics')
BEGIN
  CREATE TABLE [work_order_mechanics] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [work_order_id] INT NOT NULL,
    [mechanic_id] INT NOT NULL,
    [assigned_at] DATETIME2 DEFAULT GETDATE(),
    [started_at] DATETIME2,
    [completed_at] DATETIME2,
    [hours_worked] DECIMAL(5,2),
    [labor_cost] DECIMAL(18,2),
    [notes] NVARCHAR(500)
  );
  PRINT 'Created: work_order_mechanics';
END
GO

-- ============================================
-- GRUPO 8: CONCILIAÇÃO BANCÁRIA / BTG
-- ============================================

-- 42. BANK_TRANSACTIONS (Conciliação Bancária)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'bank_transactions')
BEGIN
  CREATE TABLE [bank_transactions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL DEFAULT 1,
    [bank_account_id] INT NOT NULL,
    [transaction_date] DATETIME2 NOT NULL,
    [description] NVARCHAR(500),
    [amount] DECIMAL(18,2) NOT NULL,
    [balance] DECIMAL(18,2),
    [transaction_type] NVARCHAR(20),
    [reconciled] NVARCHAR(1) DEFAULT 'N',
    [reconciled_at] DATETIME2,
    [reconciled_by] NVARCHAR(255),
    [accounts_payable_id] INT,
    [accounts_receivable_id] INT,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: bank_transactions';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_transactions_tenant')
  CREATE INDEX [idx_bank_transactions_tenant] ON [bank_transactions]([organization_id], [branch_id]);
GO

-- 43. BTG_BOLETOS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'btg_boletos')
BEGIN
  CREATE TABLE [btg_boletos] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [nosso_numero] NVARCHAR(20) NOT NULL,
    [seu_numero] NVARCHAR(20),
    [customer_id] INT,
    [payer_name] NVARCHAR(255) NOT NULL,
    [payer_document] NVARCHAR(18) NOT NULL,
    [valor_nominal] DECIMAL(18,2) NOT NULL,
    [valor_desconto] DECIMAL(18,2),
    [valor_multa] DECIMAL(18,2),
    [valor_juros] DECIMAL(18,2),
    [valor_pago] DECIMAL(18,2),
    [data_emissao] DATETIME2 NOT NULL,
    [data_vencimento] DATETIME2 NOT NULL,
    [data_pagamento] DATETIME2,
    [status] NVARCHAR(20) DEFAULT 'PENDING',
    [btg_id] NVARCHAR(50),
    [linha_digitavel] NVARCHAR(100),
    [codigo_barras] NVARCHAR(100),
    [pdf_url] NVARCHAR(500),
    [accounts_receivable_id] INT,
    [billing_invoice_id] INT,
    [webhook_received_at] DATETIME2,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: btg_boletos';
END
GO

-- 44. BTG_PIX_CHARGES
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'btg_pix_charges')
BEGIN
  CREATE TABLE [btg_pix_charges] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [txid] NVARCHAR(50) NOT NULL,
    [customer_id] INT,
    [payer_name] NVARCHAR(255),
    [payer_document] NVARCHAR(18),
    [valor] DECIMAL(18,2) NOT NULL,
    [chave_pix] NVARCHAR(100),
    [qr_code] NVARCHAR(MAX),
    [qr_code_image_url] NVARCHAR(500),
    [status] NVARCHAR(20) DEFAULT 'ACTIVE',
    [data_criacao] DATETIME2 DEFAULT GETDATE(),
    [data_expiracao] DATETIME2,
    [data_pagamento] DATETIME2,
    [accounts_receivable_id] INT,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: btg_pix_charges';
END
GO

-- 45. BTG_PAYMENTS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'btg_payments')
BEGIN
  CREATE TABLE [btg_payments] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [payment_type] NVARCHAR(10) NOT NULL,
    [beneficiary_name] NVARCHAR(255) NOT NULL,
    [beneficiary_document] NVARCHAR(18) NOT NULL,
    [beneficiary_bank] NVARCHAR(10),
    [beneficiary_agency] NVARCHAR(10),
    [beneficiary_account] NVARCHAR(20),
    [beneficiary_pix_key] NVARCHAR(100),
    [amount] DECIMAL(18,2) NOT NULL,
    [status] NVARCHAR(20) DEFAULT 'PENDING',
    [btg_transaction_id] NVARCHAR(50),
    [error_message] NVARCHAR(500),
    [scheduled_date] DATETIME2,
    [processed_at] DATETIME2,
    [accounts_payable_id] INT,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: btg_payments';
END
GO

-- ============================================
-- GRUPO 9: OPERACIONAIS DIVERSOS
-- ============================================

-- 46. NFE_MANIFESTATION_EVENTS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'nfe_manifestation_events')
BEGIN
  CREATE TABLE [nfe_manifestation_events] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [inbound_invoice_id] INT NOT NULL,
    [event_type] NVARCHAR(10) NOT NULL,
    [event_description] NVARCHAR(100),
    [justification] NVARCHAR(500),
    [protocol_number] NVARCHAR(20),
    [status] NVARCHAR(20) DEFAULT 'PENDING',
    [sefaz_return_code] NVARCHAR(10),
    [sefaz_return_message] NVARCHAR(500),
    [sent_at] DATETIME2,
    [confirmed_at] DATETIME2,
    [xml_event] NVARCHAR(MAX),
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: nfe_manifestation_events';
END
GO

-- 47. PRODUCT_UNIT_CONVERSIONS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'product_unit_conversions')
BEGIN
  CREATE TABLE [product_unit_conversions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [product_id] INT NOT NULL,
    [from_unit] NVARCHAR(10) NOT NULL,
    [to_unit] NVARCHAR(10) NOT NULL,
    [factor] DECIMAL(10,4) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE()
  );
  PRINT 'Created: product_unit_conversions';
END
GO

-- 48. INVENTORY_ADJUSTMENTS
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'inventory_adjustments')
BEGIN
  CREATE TABLE [inventory_adjustments] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL DEFAULT 1,
    [count_id] INT,
    [adjustment_number] NVARCHAR(20) NOT NULL,
    [adjustment_date] DATETIME2 NOT NULL,
    [product_id] INT NOT NULL,
    [location_id] INT,
    [quantity_before] DECIMAL(18,4),
    [quantity_adjusted] DECIMAL(18,4),
    [quantity_after] DECIMAL(18,4),
    [reason] NVARCHAR(20) NOT NULL,
    [notes] NVARCHAR(500),
    [approved_by] NVARCHAR(255),
    [approved_at] DATETIME2,
    [created_by] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: inventory_adjustments';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inventory_adjustments_tenant')
  CREATE INDEX [idx_inventory_adjustments_tenant] ON [inventory_adjustments]([organization_id], [branch_id]);
GO

-- 49. EXTERNAL_CTES (CTe emitidos por terceiros)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'external_ctes')
BEGIN
  CREATE TABLE [external_ctes] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [access_key] NVARCHAR(44) NOT NULL,
    [cte_number] NVARCHAR(20),
    [series] NVARCHAR(10),
    [model] NVARCHAR(2) DEFAULT '57',
    [issue_date] DATETIME2 NOT NULL,
    [issuer_cnpj] NVARCHAR(14) NOT NULL,
    [issuer_name] NVARCHAR(255) NOT NULL,
    [issuer_ie] NVARCHAR(20),
    [sender_cnpj] NVARCHAR(14),
    [sender_name] NVARCHAR(255),
    [recipient_cnpj] NVARCHAR(14),
    [recipient_name] NVARCHAR(255),
    [shipper_cnpj] NVARCHAR(14),
    [shipper_name] NVARCHAR(255),
    [receiver_cnpj] NVARCHAR(14),
    [receiver_name] NVARCHAR(255),
    [origin_city] NVARCHAR(100),
    [origin_uf] NVARCHAR(2),
    [destination_city] NVARCHAR(100),
    [destination_uf] NVARCHAR(2),
    [total_value] DECIMAL(18,2),
    [cargo_value] DECIMAL(18,2),
    [icms_value] DECIMAL(18,2),
    [weight] DECIMAL(10,3),
    [volume] DECIMAL(10,3),
    [linked_nfe_key] NVARCHAR(44),
    [cargo_document_id] INT,
    [xml_content] NVARCHAR(MAX),
    [xml_hash] NVARCHAR(64),
    [status] NVARCHAR(20) DEFAULT 'IMPORTED',
    [import_source] NVARCHAR(50) DEFAULT 'SEFAZ_AUTO',
    [created_by] NVARCHAR(255) NOT NULL,
    [updated_by] NVARCHAR(255),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [deleted_at] DATETIME2,
    [version] INT DEFAULT 1,
    CONSTRAINT [FK_external_ctes_org] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE
  );
  PRINT 'Created: external_ctes';
END
GO

-- 50. LANCAMENTOS_CONTABEIS (Diário Contábil)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'lancamentos_contabeis')
BEGIN
  CREATE TABLE [lancamentos_contabeis] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [data_lancamento] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [data_competencia] DATETIME2 NOT NULL,
    [id_plano_contas] INT NOT NULL,
    [id_plano_contas_gerencial] INT,
    [id_centro_custo] INT NOT NULL,
    [historico] NVARCHAR(500) NOT NULL,
    [valor] DECIMAL(15,2) NOT NULL,
    [tipo_lancamento] NVARCHAR(1) NOT NULL,
    [origem_modulo] NVARCHAR(20),
    [id_origem_externa] BIGINT,
    [lote_contabil] NVARCHAR(50),
    [status] NVARCHAR(20) DEFAULT 'PENDENTE',
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: lancamentos_contabeis';
END
GO

-- 51. COMPRAS_ENTRADA_ITEM (Itens NF Compra)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'compras_entrada_item')
BEGIN
  CREATE TABLE [compras_entrada_item] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [id_header] BIGINT NOT NULL,
    [descricao_produto] NVARCHAR(255) NOT NULL,
    [ncm_utilizado] NVARCHAR(10) NOT NULL,
    [id_pcg_item] INT NOT NULL,
    [id_centro_custo_aplicacao] INT NOT NULL,
    [quantidade] DECIMAL(12,4) NOT NULL,
    [valor_unitario] DECIMAL(15,4) NOT NULL,
    [valor_total_item] DECIMAL(15,2) NOT NULL,
    [is_monofasico] INT DEFAULT 0,
    [is_icms_st] INT DEFAULT 0,
    [is_icms_diferimento] INT DEFAULT 0,
    [is_ipi_suspenso] INT DEFAULT 0,
    [valor_icms] DECIMAL(15,2),
    [valor_ipi] DECIMAL(15,2),
    [valor_pis] DECIMAL(15,2),
    [valor_cofins] DECIMAL(15,2),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: compras_entrada_item';
END
GO

-- 52. FROTA_ABASTECIMENTOS (Abastecimentos Frota)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'frota_abastecimentos')
BEGIN
  CREATE TABLE [frota_abastecimentos] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] INT NOT NULL,
    [branch_id] INT NOT NULL,
    [data_abastecimento] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [local_abastecimento] NVARCHAR(255),
    [id_ativo] INT NOT NULL,
    [id_motorista] INT,
    [id_pcg_combustivel] INT NOT NULL,
    [litros] DECIMAL(10,3) NOT NULL,
    [hodometro_atual] INT NOT NULL,
    [hodometro_anterior] INT,
    [valor_litro] DECIMAL(10,4) NOT NULL,
    [valor_total] DECIMAL(15,2) NOT NULL,
    [km_rodados] INT,
    [media_km_l] DECIMAL(5,2),
    [tipo_abastecimento] NVARCHAR(20) DEFAULT 'INTERNO',
    [numero_cupom_fiscal] NVARCHAR(50),
    [validado] INT DEFAULT 0,
    [observacoes] NVARCHAR(500),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    [created_by] NVARCHAR(255),
    [updated_by] NVARCHAR(255),
    [deleted_at] DATETIME2
  );
  PRINT 'Created: frota_abastecimentos';
END
GO

-- ============================================
-- GRUPO 10: SEED DATA (Organização + Filial + Usuário Admin)
-- ============================================

-- Seed: Organização
IF NOT EXISTS (SELECT 1 FROM [organizations] WHERE [document] = '04058687000177')
BEGIN
  SET IDENTITY_INSERT [organizations] ON;
  INSERT INTO [organizations] ([id], [name], [slug], [document], [plan], [ie], [status])
  VALUES (1, N'TCL Transporte Rodoviario Costa Lemes Ltda', N'AuraCoreTCL', N'04058687000177', N'PRO', N'103317244', N'ACTIVE');
  SET IDENTITY_INSERT [organizations] OFF;
  PRINT 'Seed: organizations (id=1)';
END
GO

-- Seed: Filial Matriz
IF NOT EXISTS (SELECT 1 FROM [branches] WHERE [document] = '04058687000177' AND [organization_id] = 1)
BEGIN
  SET IDENTITY_INSERT [branches] ON;
  INSERT INTO [branches] (
    [id], [organization_id], [name], [trade_name], [document], [email], [phone],
    [ie], [im], [crt], [zip_code], [street], [number], [district],
    [city_code], [city_name], [state], [status]
  ) VALUES (
    1, 1,
    N'TCL Transporte Rodoviario Costa Lemes Ltda',
    N'TCL Transporte Rodoviario Costa Lemes Ltda',
    N'04058687000177',
    N'pedro.lemes@tcltransporte.com.br',
    N'62981197104',
    N'103317244',
    N'1725130',
    N'3',
    N'74665834',
    N'Rua 2',
    N'541',
    N'Goiania',
    N'5208707',
    N'Goiania',
    N'GO',
    N'ACTIVE'
  );
  SET IDENTITY_INSERT [branches] OFF;
  PRINT 'Seed: branches (id=1, Matriz Goiania)';
END
GO

-- Seed: Usuário Admin
-- Senha: rbp6B60@@ (bcrypt hash gerado com rounds=10)
IF NOT EXISTS (SELECT 1 FROM [users] WHERE [email] = 'pedro.lemes@tcltransporte.com.br' AND [organization_id] = 1)
BEGIN
  INSERT INTO [users] ([id], [organization_id], [name], [email], [password_hash], [role], [default_branch_id])
  VALUES (
    N'00000000-0000-0000-0000-000000000001',
    1,
    N'Pedro Lemes',
    N'pedro.lemes@tcltransporte.com.br',
    N'$2b$10$N90nVnzAgVjhhDRjSpEwMucrRWAUwKYgEDgt3U6f9Uec2ysoOHf0.',
    N'ADMIN',
    1
  );
  PRINT 'Seed: users (Admin - Pedro Lemes)';
END
GO

-- Seed: User-Branch mapping
IF NOT EXISTS (SELECT 1 FROM [user_branches] WHERE [user_id] = '00000000-0000-0000-0000-000000000001' AND [branch_id] = 1)
BEGIN
  INSERT INTO [user_branches] ([user_id], [branch_id])
  VALUES (N'00000000-0000-0000-0000-000000000001', 1);
  PRINT 'Seed: user_branches (Admin -> Filial 1)';
END
GO

-- Seed: Role ADMIN
IF NOT EXISTS (SELECT 1 FROM [roles] WHERE [name] = 'Admin')
BEGIN
  SET IDENTITY_INSERT [roles] ON;
  INSERT INTO [roles] ([id], [name], [description])
  VALUES (1, N'Admin', N'Administrador com acesso total');
  SET IDENTITY_INSERT [roles] OFF;
  PRINT 'Seed: roles (Admin)';
END
GO

-- Seed: User-Role mapping
IF NOT EXISTS (SELECT 1 FROM [user_roles] WHERE [user_id] = '00000000-0000-0000-0000-000000000001' AND [role_id] = 1)
BEGIN
  INSERT INTO [user_roles] ([user_id], [role_id], [organization_id], [branch_id])
  VALUES (N'00000000-0000-0000-0000-000000000001', 1, 1, 1);
  PRINT 'Seed: user_roles (Admin -> Role Admin)';
END
GO

-- ============================================
-- RESUMO FINAL
-- ============================================
PRINT '';
PRINT '=== MIGRATION 0001_initial_schema.sql CONCLUIDA ===';
PRINT '52 tabelas base + seed data (organizacao, filial, usuario admin)';
PRINT '=========================================================';
GO
