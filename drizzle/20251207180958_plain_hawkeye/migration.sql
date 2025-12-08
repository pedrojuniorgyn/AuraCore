ALTER TABLE [accounts_payable] DROP CONSTRAINT [accounts_payable_created_at_default];--> statement-breakpoint
ALTER TABLE [accounts_payable] ADD CONSTRAINT [accounts_payable_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [accounts_payable] DROP CONSTRAINT [accounts_payable_updated_at_default];--> statement-breakpoint
ALTER TABLE [accounts_payable] ADD CONSTRAINT [accounts_payable_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [accounts_receivable] DROP CONSTRAINT [accounts_receivable_created_at_default];--> statement-breakpoint
ALTER TABLE [accounts_receivable] ADD CONSTRAINT [accounts_receivable_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [accounts_receivable] DROP CONSTRAINT [accounts_receivable_updated_at_default];--> statement-breakpoint
ALTER TABLE [accounts_receivable] ADD CONSTRAINT [accounts_receivable_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [audit_logs] DROP CONSTRAINT [audit_logs_created_at_default];--> statement-breakpoint
ALTER TABLE [audit_logs] ADD CONSTRAINT [audit_logs_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [bank_accounts] DROP CONSTRAINT [bank_accounts_created_at_default];--> statement-breakpoint
ALTER TABLE [bank_accounts] ADD CONSTRAINT [bank_accounts_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [bank_accounts] DROP CONSTRAINT [bank_accounts_updated_at_default];--> statement-breakpoint
ALTER TABLE [bank_accounts] ADD CONSTRAINT [bank_accounts_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [bank_remittances] DROP CONSTRAINT [bank_remittances_created_at_default];--> statement-breakpoint
ALTER TABLE [bank_remittances] ADD CONSTRAINT [bank_remittances_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_created_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_updated_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_created_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_updated_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [drivers] DROP CONSTRAINT [drivers_created_at_default];--> statement-breakpoint
ALTER TABLE [drivers] ADD CONSTRAINT [drivers_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [drivers] DROP CONSTRAINT [drivers_updated_at_default];--> statement-breakpoint
ALTER TABLE [drivers] ADD CONSTRAINT [drivers_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [financial_categories] DROP CONSTRAINT [financial_categories_created_at_default];--> statement-breakpoint
ALTER TABLE [financial_categories] ADD CONSTRAINT [financial_categories_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [financial_categories] DROP CONSTRAINT [financial_categories_updated_at_default];--> statement-breakpoint
ALTER TABLE [financial_categories] ADD CONSTRAINT [financial_categories_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [financial_dda_inbox] DROP CONSTRAINT [financial_dda_inbox_created_at_default];--> statement-breakpoint
ALTER TABLE [financial_dda_inbox] ADD CONSTRAINT [financial_dda_inbox_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [financial_dda_inbox] DROP CONSTRAINT [financial_dda_inbox_updated_at_default];--> statement-breakpoint
ALTER TABLE [financial_dda_inbox] ADD CONSTRAINT [financial_dda_inbox_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [freight_extra_components] DROP CONSTRAINT [freight_extra_components_created_at_default];--> statement-breakpoint
ALTER TABLE [freight_extra_components] ADD CONSTRAINT [freight_extra_components_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [freight_extra_components] DROP CONSTRAINT [freight_extra_components_updated_at_default];--> statement-breakpoint
ALTER TABLE [freight_extra_components] ADD CONSTRAINT [freight_extra_components_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [freight_tables] DROP CONSTRAINT [freight_tables_created_at_default];--> statement-breakpoint
ALTER TABLE [freight_tables] ADD CONSTRAINT [freight_tables_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [freight_tables] DROP CONSTRAINT [freight_tables_updated_at_default];--> statement-breakpoint
ALTER TABLE [freight_tables] ADD CONSTRAINT [freight_tables_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [freight_weight_ranges] DROP CONSTRAINT [freight_weight_ranges_created_at_default];--> statement-breakpoint
ALTER TABLE [freight_weight_ranges] ADD CONSTRAINT [freight_weight_ranges_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [freight_weight_ranges] DROP CONSTRAINT [freight_weight_ranges_updated_at_default];--> statement-breakpoint
ALTER TABLE [freight_weight_ranges] ADD CONSTRAINT [freight_weight_ranges_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] DROP CONSTRAINT [inbound_invoice_items_created_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] ADD CONSTRAINT [inbound_invoice_items_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [inbound_invoices] DROP CONSTRAINT [inbound_invoices_created_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [inbound_invoices] DROP CONSTRAINT [inbound_invoices_updated_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_created_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_created_at_default] DEFAULT ('2025-12-07 18:09:58.184') FOR [created_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_updated_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_updated_at_default] DEFAULT ('2025-12-07 18:09:58.184') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_created_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_updated_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_created_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_updated_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_created_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_updated_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [tax_rules] DROP CONSTRAINT [tax_rules_created_at_default];--> statement-breakpoint
ALTER TABLE [tax_rules] ADD CONSTRAINT [tax_rules_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [tax_rules] DROP CONSTRAINT [tax_rules_updated_at_default];--> statement-breakpoint
ALTER TABLE [tax_rules] ADD CONSTRAINT [tax_rules_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [user_branches] DROP CONSTRAINT [user_branches_created_at_default];--> statement-breakpoint
ALTER TABLE [user_branches] ADD CONSTRAINT [user_branches_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_created_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_created_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_updated_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_updated_at_default] DEFAULT ('2025-12-07 18:09:58.185') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [vehicles] DROP CONSTRAINT [vehicles_created_at_default];--> statement-breakpoint
ALTER TABLE [vehicles] ADD CONSTRAINT [vehicles_created_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [created_at];--> statement-breakpoint
ALTER TABLE [vehicles] DROP CONSTRAINT [vehicles_updated_at_default];--> statement-breakpoint
ALTER TABLE [vehicles] ADD CONSTRAINT [vehicles_updated_at_default] DEFAULT ('2025-12-07 18:09:58.186') FOR [updated_at];