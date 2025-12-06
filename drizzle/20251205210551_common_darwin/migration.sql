CREATE TABLE [inbound_invoice_items] (
	[id] int IDENTITY(1, 1),
	[invoice_id] int NOT NULL,
	[product_id] int,
	[product_code_xml] nvarchar(60),
	[product_name_xml] nvarchar(500),
	[ean_xml] nvarchar(14),
	[ncm] nvarchar(8),
	[cfop] nvarchar(4),
	[cst] nvarchar(3),
	[quantity] decimal(15,4) NOT NULL,
	[unit] nvarchar(10),
	[unit_price] decimal(18,6),
	[total_price] decimal(18,2),
	[item_number] int,
	[created_at] datetime2 CONSTRAINT [inbound_invoice_items_created_at_default] DEFAULT ('2025-12-05 21:05:51.798'),
	CONSTRAINT [inbound_invoice_items_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [inbound_invoices] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[branch_id] int NOT NULL,
	[partner_id] int,
	[access_key] nvarchar(44) NOT NULL,
	[series] nvarchar(10),
	[number] nvarchar(20),
	[model] nvarchar(2) CONSTRAINT [inbound_invoices_model_default] DEFAULT ('55'),
	[issue_date] datetime2 NOT NULL,
	[entry_date] datetime2,
	[total_products] decimal(18,2),
	[total_nfe] decimal(18,2),
	[xml_content] nvarchar(max),
	[xml_hash] nvarchar(64),
	[status] nvarchar(20) CONSTRAINT [inbound_invoices_status_default] DEFAULT ('DRAFT'),
	[imported_by] nvarchar(255),
	[created_by] nvarchar(255),
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [inbound_invoices_created_at_default] DEFAULT ('2025-12-05 21:05:51.798'),
	[updated_at] datetime2 CONSTRAINT [inbound_invoices_updated_at_default] DEFAULT ('2025-12-05 21:05:51.798'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [inbound_invoices_version_default] DEFAULT ((1)),
	CONSTRAINT [inbound_invoices_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
ALTER TABLE [audit_logs] DROP CONSTRAINT [audit_logs_created_at_default];--> statement-breakpoint
ALTER TABLE [audit_logs] ADD CONSTRAINT [audit_logs_created_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_created_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_created_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [created_at];--> statement-breakpoint
ALTER TABLE [branches] DROP CONSTRAINT [branches_updated_at_default];--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_updated_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_created_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_created_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [created_at];--> statement-breakpoint
ALTER TABLE [business_partners] DROP CONSTRAINT [business_partners_updated_at_default];--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_updated_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_created_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_created_at_default] DEFAULT ('2025-12-05 21:05:51.797') FOR [created_at];--> statement-breakpoint
ALTER TABLE [organizations] DROP CONSTRAINT [organizations_updated_at_default];--> statement-breakpoint
ALTER TABLE [organizations] ADD CONSTRAINT [organizations_updated_at_default] DEFAULT ('2025-12-05 21:05:51.797') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_created_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_created_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [created_at];--> statement-breakpoint
ALTER TABLE [permissions] DROP CONSTRAINT [permissions_updated_at_default];--> statement-breakpoint
ALTER TABLE [permissions] ADD CONSTRAINT [permissions_updated_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_created_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_created_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [created_at];--> statement-breakpoint
ALTER TABLE [products] DROP CONSTRAINT [products_updated_at_default];--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_updated_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_created_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_created_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [created_at];--> statement-breakpoint
ALTER TABLE [roles] DROP CONSTRAINT [roles_updated_at_default];--> statement-breakpoint
ALTER TABLE [roles] ADD CONSTRAINT [roles_updated_at_default] DEFAULT ('2025-12-05 21:05:51.798') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [user_branches] DROP CONSTRAINT [user_branches_created_at_default];--> statement-breakpoint
ALTER TABLE [user_branches] ADD CONSTRAINT [user_branches_created_at_default] DEFAULT ('2025-12-05 21:05:51.797') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_created_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_created_at_default] DEFAULT ('2025-12-05 21:05:51.797') FOR [created_at];--> statement-breakpoint
ALTER TABLE [users] DROP CONSTRAINT [users_updated_at_default];--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_updated_at_default] DEFAULT ('2025-12-05 21:05:51.797') FOR [updated_at];--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] ADD CONSTRAINT [inbound_invoice_items_invoice_id_inbound_invoices_id_fk] FOREIGN KEY ([invoice_id]) REFERENCES [inbound_invoices]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [inbound_invoice_items] ADD CONSTRAINT [inbound_invoice_items_product_id_products_id_fk] FOREIGN KEY ([product_id]) REFERENCES [products]([id]);--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_organization_id_organizations_id_fk] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_branch_id_branches_id_fk] FOREIGN KEY ([branch_id]) REFERENCES [branches]([id]);--> statement-breakpoint
ALTER TABLE [inbound_invoices] ADD CONSTRAINT [inbound_invoices_partner_id_business_partners_id_fk] FOREIGN KEY ([partner_id]) REFERENCES [business_partners]([id]);--> statement-breakpoint
CREATE UNIQUE INDEX [inbound_invoices_access_key_idx] ON [inbound_invoices] ([access_key],[organization_id]);