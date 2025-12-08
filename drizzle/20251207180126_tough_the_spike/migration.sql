CREATE TABLE [accounts_payable] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[branch_id] int NOT NULL,
	[partner_id] int,
	[category_id] int,
	[bank_account_id] int,
	[description] nvarchar(max) NOT NULL,
	[document_number] nvarchar(100),
	[barcode] nvarchar(100),
	[issue_date] datetime2 NOT NULL,
	[due_date] datetime2 NOT NULL,
	[pay_date] datetime2,
	[amount] decimal(18,2) NOT NULL,
	[amount_paid] decimal(18,2) CONSTRAINT [accounts_payable_amount_paid_default] DEFAULT ((0.00)),
	[discount] decimal(18,2) CONSTRAINT [accounts_payable_discount_default] DEFAULT ((0.00)),
	[interest] decimal(18,2) CONSTRAINT [accounts_payable_interest_default] DEFAULT ((0.00)),
	[fine] decimal(18,2) CONSTRAINT [accounts_payable_fine_default] DEFAULT ((0.00)),
	[status] nvarchar(20) NOT NULL CONSTRAINT [accounts_payable_status_default] DEFAULT ('OPEN'),
	[origin] nvarchar(50) CONSTRAINT [accounts_payable_origin_default] DEFAULT ('MANUAL'),
	[notes] nvarchar(max),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [accounts_payable_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [accounts_payable_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [accounts_payable_version_default] DEFAULT ((1)),
	CONSTRAINT [accounts_payable_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [accounts_receivable] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[branch_id] int NOT NULL,
	[partner_id] int,
	[category_id] int,
	[bank_account_id] int,
	[description] nvarchar(max) NOT NULL,
	[document_number] nvarchar(100),
	[issue_date] datetime2 NOT NULL,
	[due_date] datetime2 NOT NULL,
	[receive_date] datetime2,
	[amount] decimal(18,2) NOT NULL,
	[amount_received] decimal(18,2) CONSTRAINT [accounts_receivable_amount_received_default] DEFAULT ((0.00)),
	[discount] decimal(18,2) CONSTRAINT [accounts_receivable_discount_default] DEFAULT ((0.00)),
	[interest] decimal(18,2) CONSTRAINT [accounts_receivable_interest_default] DEFAULT ((0.00)),
	[fine] decimal(18,2) CONSTRAINT [accounts_receivable_fine_default] DEFAULT ((0.00)),
	[status] nvarchar(20) NOT NULL CONSTRAINT [accounts_receivable_status_default] DEFAULT ('OPEN'),
	[origin] nvarchar(50) CONSTRAINT [accounts_receivable_origin_default] DEFAULT ('MANUAL'),
	[notes] nvarchar(max),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [accounts_receivable_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [accounts_receivable_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [accounts_receivable_version_default] DEFAULT ((1)),
	CONSTRAINT [accounts_receivable_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [bank_accounts] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[branch_id] int,
	[name] nvarchar(255) NOT NULL,
	[bank_code] nvarchar(10),
	[bank_name] nvarchar(255),
	[agency] nvarchar(20),
	[account_number] nvarchar(50),
	[account_digit] nvarchar(2),
	[account_type] nvarchar(50),
	[wallet] nvarchar(20),
	[agreement_number] nvarchar(50),
	[cnab_layout] nvarchar(20) CONSTRAINT [bank_accounts_cnab_layout_default] DEFAULT ('CNAB240'),
	[next_remittance_number] int CONSTRAINT [bank_accounts_next_remittance_number_default] DEFAULT ((1)),
	[initial_balance] decimal(18,2) CONSTRAINT [bank_accounts_initial_balance_default] DEFAULT ((0.00)),
	[current_balance] decimal(18,2) CONSTRAINT [bank_accounts_current_balance_default] DEFAULT ((0.00)),
	[status] nvarchar(20) CONSTRAINT [bank_accounts_status_default] DEFAULT ('ACTIVE'),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [bank_accounts_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [bank_accounts_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [bank_accounts_version_default] DEFAULT ((1)),
	CONSTRAINT [bank_accounts_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [bank_remittances] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[bank_account_id] int NOT NULL,
	[file_name] nvarchar(255) NOT NULL,
	[content] nvarchar(max) NOT NULL,
	[remittance_number] int NOT NULL,
	[type] nvarchar(20) NOT NULL,
	[status] nvarchar(50) CONSTRAINT [bank_remittances_status_default] DEFAULT ('GENERATED'),
	[total_records] int CONSTRAINT [bank_remittances_total_records_default] DEFAULT ((0)),
	[total_amount] decimal(18,2) CONSTRAINT [bank_remittances_total_amount_default] DEFAULT ((0.00)),
	[notes] nvarchar(max),
	[processed_at] datetime2,
	[created_by] nvarchar(255) NOT NULL,
	[created_at] datetime2 CONSTRAINT [bank_remittances_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	CONSTRAINT [bank_remittances_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [drivers] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[name] nvarchar(255) NOT NULL,
	[cpf] nvarchar(14) NOT NULL,
	[phone] nvarchar(20),
	[email] nvarchar(255),
	[cnh_number] nvarchar(20) NOT NULL,
	[cnh_category] nvarchar(5) NOT NULL,
	[cnh_expiry] datetime2 NOT NULL,
	[cnh_issue_date] datetime2,
	[partner_id] int,
	[status] nvarchar(20) CONSTRAINT [drivers_status_default] DEFAULT ('ACTIVE'),
	[notes] nvarchar(max),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [drivers_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [drivers_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [drivers_version_default] DEFAULT ((1)),
	CONSTRAINT [drivers_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [financial_categories] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[name] nvarchar(255) NOT NULL,
	[code] nvarchar(50),
	[type] nvarchar(20) NOT NULL,
	[description] nvarchar(max),
	[status] nvarchar(20) CONSTRAINT [financial_categories_status_default] DEFAULT ('ACTIVE'),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [financial_categories_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [financial_categories_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [financial_categories_version_default] DEFAULT ((1)),
	CONSTRAINT [financial_categories_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [financial_dda_inbox] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[bank_account_id] int NOT NULL,
	[external_id] nvarchar(255) NOT NULL,
	[beneficiary_name] nvarchar(255) NOT NULL,
	[beneficiary_document] nvarchar(20) NOT NULL,
	[amount] decimal(18,2) NOT NULL,
	[due_date] datetime2 NOT NULL,
	[issue_date] datetime2,
	[barcode] nvarchar(100) NOT NULL,
	[digitable_line] nvarchar(100),
	[status] nvarchar(20) CONSTRAINT [financial_dda_inbox_status_default] DEFAULT ('PENDING'),
	[matched_payable_id] int,
	[match_score] int CONSTRAINT [financial_dda_inbox_match_score_default] DEFAULT ((0)),
	[notes] nvarchar(max),
	[dismissed_reason] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [financial_dda_inbox_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [financial_dda_inbox_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	CONSTRAINT [financial_dda_inbox_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [freight_extra_components] (
	[id] int IDENTITY(1, 1),
	[freight_table_id] int NOT NULL,
	[name] nvarchar(100) NOT NULL,
	[code] nvarchar(50),
	[type] nvarchar(30) NOT NULL,
	[value] decimal(18,2) NOT NULL,
	[min_value] decimal(18,2) CONSTRAINT [freight_extra_components_min_value_default] DEFAULT ((0.00)),
	[max_value] decimal(18,2),
	[is_active] nvarchar(10) CONSTRAINT [freight_extra_components_is_active_default] DEFAULT ('true'),
	[apply_order] int CONSTRAINT [freight_extra_components_apply_order_default] DEFAULT ((0)),
	[created_at] datetime2 CONSTRAINT [freight_extra_components_created_at_default] DEFAULT ('2025-12-07 18:01:26.408'),
	[updated_at] datetime2 CONSTRAINT [freight_extra_components_updated_at_default] DEFAULT ('2025-12-07 18:01:26.408'),
	[deleted_at] datetime2,
	CONSTRAINT [freight_extra_components_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [freight_tables] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[name] nvarchar(255) NOT NULL,
	[code] nvarchar(50),
	[type] nvarchar(30) NOT NULL,
	[transport_type] nvarchar(30) NOT NULL,
	[customer_id] int,
	[valid_from] datetime2 NOT NULL,
	[valid_to] datetime2,
	[status] nvarchar(20) CONSTRAINT [freight_tables_status_default] DEFAULT ('ACTIVE'),
	[description] nvarchar(max),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [freight_tables_created_at_default] DEFAULT ('2025-12-07 18:01:26.408'),
	[updated_at] datetime2 CONSTRAINT [freight_tables_updated_at_default] DEFAULT ('2025-12-07 18:01:26.408'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [freight_tables_version_default] DEFAULT ((1)),
	CONSTRAINT [freight_tables_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [freight_weight_ranges] (
	[id] int IDENTITY(1, 1),
	[freight_table_id] int NOT NULL,
	[min_weight] decimal(18,2) NOT NULL,
	[max_weight] decimal(18,2),
	[fixed_price] decimal(18,2) NOT NULL,
	[price_per_kg_exceeded] decimal(18,2) CONSTRAINT [freight_weight_ranges_price_per_kg_exceeded_default] DEFAULT ((0.00)),
	[display_order] int CONSTRAINT [freight_weight_ranges_display_order_default] DEFAULT ((0)),
	[created_at] datetime2 CONSTRAINT [freight_weight_ranges_created_at_default] DEFAULT ('2025-12-07 18:01:26.408'),
	[updated_at] datetime2 CONSTRAINT [freight_weight_ranges_updated_at_default] DEFAULT ('2025-12-07 18:01:26.408'),
	[deleted_at] datetime2,
	CONSTRAINT [freight_weight_ranges_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [tax_rules] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[origin_state] nvarchar(2) NOT NULL,
	[destination_state] nvarchar(2) NOT NULL,
	[icms_rate] decimal(5,2) NOT NULL,
	[cfop_transport] nvarchar(4),
	[notes] nvarchar(max),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [tax_rules_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [tax_rules_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [tax_rules_version_default] DEFAULT ((1)),
	CONSTRAINT [tax_rules_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [vehicles] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[branch_id] int NOT NULL,
	[plate] nvarchar(10) NOT NULL,
	[renavam] nvarchar(20),
	[chassis] nvarchar(30),
	[type] nvarchar(20) NOT NULL,
	[brand] nvarchar(100),
	[model] nvarchar(100),
	[year] int,
	[color] nvarchar(50),
	[capacity_kg] decimal(18,2) CONSTRAINT [vehicles_capacity_kg_default] DEFAULT ((0.00)),
	[capacity_m3] decimal(18,2) CONSTRAINT [vehicles_capacity_m3_default] DEFAULT ((0.00)),
	[tara_kg] decimal(18,2) CONSTRAINT [vehicles_tara_kg_default] DEFAULT ((0.00)),
	[status] nvarchar(20) CONSTRAINT [vehicles_status_default] DEFAULT ('AVAILABLE'),
	[current_km] int CONSTRAINT [vehicles_current_km_default] DEFAULT ((0)),
	[maintenance_status] nvarchar(20) CONSTRAINT [vehicles_maintenance_status_default] DEFAULT ('OK'),
	[last_maintenance_date] datetime2,
	[next_maintenance_km] int,
	[license_plate_expiry] datetime2,
	[insurance_expiry] datetime2,
	[notes] nvarchar(max),
	[created_by] nvarchar(255) NOT NULL,
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [vehicles_created_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[updated_at] datetime2 CONSTRAINT [vehicles_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [vehicles_version_default] DEFAULT ((1)),
	CONSTRAINT [vehicles_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
ALTER TABLE [audit_logs] DROP CONSTRAINT [audit_logs_created_at_default];--> statement-breakpoint
ALTER TABLE [audit_logs] ADD CONSTRAINT [audit_logs_created_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_created_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_created_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_updated_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_created_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_created_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [created_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_updated_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] DROP CONSTRAINT [inbound_invoice_items_created_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] ADD CONSTRAINT [inbound_invoice_items_created_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [created_at];--> statement-breakpoint
ALTER TABLE [inbound_invoices] DROP CONSTRAINT [inbound_invoices_created_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_created_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [created_at];--> statement-breakpoint
ALTER TABLE [inbound_invoices] DROP CONSTRAINT [inbound_invoices_updated_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_created_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_created_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [created_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_updated_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_updated_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_created_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_created_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [created_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_updated_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_updated_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_created_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_created_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [created_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_updated_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_updated_at_default] DEFAULT ('2025-12-07 18:01:26.407') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_created_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_created_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [created_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_updated_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_updated_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [user_branches] DROP CONSTRAINT [user_branches_created_at_default];--> statement-breakpoint
ALTER TABLE [user_branches] ADD CONSTRAINT [user_branches_created_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_created_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_created_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_updated_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_updated_at_default] DEFAULT ('2025-12-07 18:01:26.406') FOR [updated_at];--> statement-breakpoint
CREATE UNIQUE INDEX [drivers_cpf_org_idx] ON [drivers] ([cpf],[organization_id]) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX [tax_rules_route_org_idx] ON [tax_rules] ([origin_state],[destination_state],[organization_id]) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX [vehicles_plate_org_idx] ON [vehicles] ([plate],[organization_id]) WHERE deleted_at IS NULL;