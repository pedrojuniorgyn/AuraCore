CREATE TABLE [accounts] (
	[userId] nvarchar(255) NOT NULL,
	[type] nvarchar(255) NOT NULL,
	[provider] nvarchar(255) NOT NULL,
	[providerAccountId] nvarchar(255) NOT NULL,
	[refresh_token] nvarchar(max),
	[access_token] nvarchar(max),
	[expires_at] int,
	[token_type] nvarchar(255),
	[scope] nvarchar(max),
	[id_token] nvarchar(max),
	[session_state] nvarchar(max),
	CONSTRAINT [accounts_pkey] PRIMARY KEY([provider],[providerAccountId])
);
--> statement-breakpoint
CREATE TABLE [audit_logs] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[user_id] nvarchar(255),
	[action] nvarchar(50) NOT NULL,
	[entity] nvarchar(50) NOT NULL,
	[entity_id] nvarchar(255),
	[changes] nvarchar(max),
	[ip_address] nvarchar(50),
	[user_agent] nvarchar(500),
	[created_at] datetime2 CONSTRAINT [audit_logs_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	CONSTRAINT [audit_logs_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [branches] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[name] nvarchar(255) NOT NULL,
	[trade_name] nvarchar(255) NOT NULL,
	[document] nvarchar(20) NOT NULL,
	[email] nvarchar(255) NOT NULL,
	[phone] nvarchar(20) NOT NULL,
	[ie] nvarchar(20) NOT NULL,
	[im] nvarchar(20),
	[c_class_trib] nvarchar(10),
	[crt] nvarchar(1) NOT NULL CONSTRAINT [branches_crt_default] DEFAULT ('1'),
	[zip_code] nvarchar(10) NOT NULL,
	[street] nvarchar(255) NOT NULL,
	[number] nvarchar(20) NOT NULL,
	[complement] nvarchar(100),
	[district] nvarchar(100) NOT NULL,
	[city_code] nvarchar(7) NOT NULL,
	[city_name] nvarchar(100) NOT NULL,
	[state] nvarchar(2) NOT NULL,
	[time_zone] nvarchar(50) CONSTRAINT [branches_time_zone_default] DEFAULT ('America/Sao_Paulo'),
	[logo_url] nvarchar(500),
	[created_by] nvarchar(255),
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [branches_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[updated_at] datetime2 CONSTRAINT [branches_updated_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [branches_version_default] DEFAULT ((1)),
	[status] nvarchar(20) CONSTRAINT [branches_status_default] DEFAULT ('ACTIVE'),
	CONSTRAINT [branches_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [business_partners] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[type] nvarchar(20) NOT NULL,
	[document] nvarchar(20) NOT NULL,
	[name] nvarchar(255) NOT NULL,
	[trade_name] nvarchar(255),
	[email] nvarchar(255),
	[phone] nvarchar(20),
	[data_source] nvarchar(20) CONSTRAINT [business_partners_data_source_default] DEFAULT ('MANUAL'),
	[tax_regime] nvarchar(20) NOT NULL,
	[ie] nvarchar(20),
	[im] nvarchar(20),
	[c_class_trib] nvarchar(10),
	[ind_iedest] nvarchar(1) CONSTRAINT [business_partners_ind_iedest_default] DEFAULT ('9'),
	[zip_code] nvarchar(10) NOT NULL,
	[street] nvarchar(255) NOT NULL,
	[number] nvarchar(20) NOT NULL,
	[complement] nvarchar(100),
	[district] nvarchar(100) NOT NULL,
	[city_code] nvarchar(7) NOT NULL,
	[city_name] nvarchar(100) NOT NULL,
	[state] nvarchar(2) NOT NULL,
	[created_by] nvarchar(255),
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [business_partners_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[updated_at] datetime2 CONSTRAINT [business_partners_updated_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [business_partners_version_default] DEFAULT ((1)),
	[status] nvarchar(20) CONSTRAINT [business_partners_status_default] DEFAULT ('ACTIVE'),
	CONSTRAINT [business_partners_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [organizations] (
	[id] int IDENTITY(1, 1),
	[name] nvarchar(255) NOT NULL,
	[slug] nvarchar(100) NOT NULL,
	[document] nvarchar(20) NOT NULL,
	[plan] nvarchar(20) CONSTRAINT [organizations_plan_default] DEFAULT ('FREE'),
	[stripe_customer_id] nvarchar(100),
	[status] nvarchar(20) CONSTRAINT [organizations_status_default] DEFAULT ('ACTIVE'),
	[created_at] datetime2 CONSTRAINT [organizations_created_at_default] DEFAULT ('2025-12-05 12:35:18.374'),
	[updated_at] datetime2 CONSTRAINT [organizations_updated_at_default] DEFAULT ('2025-12-05 12:35:18.374'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [organizations_version_default] DEFAULT ((1)),
	CONSTRAINT [organizations_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [permissions] (
	[id] int IDENTITY(1, 1),
	[slug] nvarchar(100) NOT NULL,
	[description] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [permissions_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[updated_at] datetime2 CONSTRAINT [permissions_updated_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	CONSTRAINT [permissions_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [products] (
	[id] int IDENTITY(1, 1),
	[organization_id] int NOT NULL,
	[sku] nvarchar(50) NOT NULL,
	[name] nvarchar(255) NOT NULL,
	[description] nvarchar(max),
	[unit] nvarchar(10) NOT NULL,
	[created_by] nvarchar(255),
	[updated_by] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [products_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[updated_at] datetime2 CONSTRAINT [products_updated_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[deleted_at] datetime2,
	[version] int NOT NULL CONSTRAINT [products_version_default] DEFAULT ((1)),
	[status] nvarchar(20) CONSTRAINT [products_status_default] DEFAULT ('ACTIVE'),
	CONSTRAINT [products_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [role_permissions] (
	[role_id] int NOT NULL,
	[permission_id] int NOT NULL,
	CONSTRAINT [role_permissions_pkey] PRIMARY KEY([role_id],[permission_id])
);
--> statement-breakpoint
CREATE TABLE [roles] (
	[id] int IDENTITY(1, 1),
	[name] nvarchar(50) NOT NULL,
	[description] nvarchar(255),
	[created_at] datetime2 CONSTRAINT [roles_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[updated_at] datetime2 CONSTRAINT [roles_updated_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	CONSTRAINT [roles_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [sessions] (
	[sessionToken] nvarchar(255) NOT NULL,
	[userId] nvarchar(255) NOT NULL,
	[expires] datetime2(3) NOT NULL,
	CONSTRAINT [sessions_pkey] PRIMARY KEY([sessionToken])
);
--> statement-breakpoint
CREATE TABLE [user_branches] (
	[user_id] nvarchar(255) NOT NULL,
	[branch_id] int NOT NULL,
	[created_at] datetime2 CONSTRAINT [user_branches_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	CONSTRAINT [user_branches_pkey] PRIMARY KEY([user_id],[branch_id])
);
--> statement-breakpoint
CREATE TABLE [users] (
	[id] nvarchar(255) NOT NULL,
	[organization_id] int NOT NULL,
	[name] nvarchar(255),
	[email] nvarchar(255) NOT NULL,
	[emailVerified] datetime2(3),
	[image] nvarchar(max),
	[password_hash] nvarchar(max),
	[role] nvarchar(50) CONSTRAINT [users_role_default] DEFAULT ('USER'),
	[default_branch_id] int,
	[created_at] datetime2(3) CONSTRAINT [users_created_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[updated_at] datetime2(3) CONSTRAINT [users_updated_at_default] DEFAULT ('2025-12-05 12:35:18.375'),
	[deleted_at] datetime2(3),
	CONSTRAINT [users_pkey] PRIMARY KEY([id])
);
--> statement-breakpoint
CREATE TABLE [verificationToken] (
	[identifier] nvarchar(255) NOT NULL,
	[token] nvarchar(255) NOT NULL,
	[expires] datetime2(3) NOT NULL,
	CONSTRAINT [verificationToken_pkey] PRIMARY KEY([identifier],[token])
);
--> statement-breakpoint
ALTER TABLE [accounts] ADD CONSTRAINT [accounts_userId_users_id_fk] FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [audit_logs] ADD CONSTRAINT [audit_logs_organization_id_organizations_id_fk] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [branches] ADD CONSTRAINT [branches_organization_id_organizations_id_fk] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [business_partners] ADD CONSTRAINT [business_partners_organization_id_organizations_id_fk] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [products] ADD CONSTRAINT [products_organization_id_organizations_id_fk] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [sessions] ADD CONSTRAINT [sessions_userId_users_id_fk] FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE [users] ADD CONSTRAINT [users_organization_id_organizations_id_fk] FOREIGN KEY ([organization_id]) REFERENCES [organizations]([id]) ON DELETE CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX [branches_document_org_idx] ON [branches] ([document],[organization_id]);--> statement-breakpoint
CREATE UNIQUE INDEX [business_partners_document_org_idx] ON [business_partners] ([document],[organization_id]);--> statement-breakpoint
CREATE UNIQUE INDEX [organizations_slug_idx] ON [organizations] ([slug]);--> statement-breakpoint
CREATE UNIQUE INDEX [organizations_document_idx] ON [organizations] ([document]);--> statement-breakpoint
CREATE UNIQUE INDEX [permissions_slug_idx] ON [permissions] ([slug]);--> statement-breakpoint
CREATE UNIQUE INDEX [products_sku_org_idx] ON [products] ([sku],[organization_id]);--> statement-breakpoint
CREATE UNIQUE INDEX [users_email_org_idx] ON [users] ([email],[organization_id]);