ALTER TABLE [audit_logs] DROP CONSTRAINT [audit_logs_created_at_default];--> statement-breakpoint
ALTER TABLE [audit_logs] ADD CONSTRAINT [audit_logs_created_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_created_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_created_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_updated_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_updated_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_created_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_created_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [created_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_updated_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_updated_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] DROP CONSTRAINT [inbound_invoice_items_created_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] ADD CONSTRAINT [inbound_invoice_items_created_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [created_at];--> statement-breakpoint
ALTER TABLE [inbound_invoices] DROP CONSTRAINT [inbound_invoices_created_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_created_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [created_at];--> statement-breakpoint
ALTER TABLE [inbound_invoices] DROP CONSTRAINT [inbound_invoices_updated_at_default];--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_updated_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_created_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_created_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [created_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_updated_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_updated_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_created_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_created_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [created_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_updated_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_updated_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_created_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_created_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [created_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_updated_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_updated_at_default] DEFAULT ('2025-12-06 10:55:33.996') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_created_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_created_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [created_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_updated_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_updated_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [user_branches] DROP CONSTRAINT [user_branches_created_at_default];--> statement-breakpoint
ALTER TABLE [user_branches] ADD CONSTRAINT [user_branches_created_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_created_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_created_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_updated_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_updated_at_default] DEFAULT ('2025-12-06 10:55:33.995') FOR [updated_at];--> statement-breakpoint
DROP INDEX [branches_document_org_idx] ON [branches];--> statement-breakpoint
CREATE UNIQUE INDEX [branches_document_org_idx] ON [branches] ([document],[organization_id]) WHERE deleted_at IS NULL;