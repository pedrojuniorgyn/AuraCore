import { defineRelations, sql } from "drizzle-orm";
import {
  int,
  nvarchar,
  datetime2,
  decimal,
  mssqlTable,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/mssql-core";
import { type AdapterAccount } from "next-auth/adapters";

// ==========================================
// AURACORE ENTERPRISE BASE PATTERN
// ==========================================
// Todas as tabelas de negócio seguem:
// 1. Multi-Tenancy: organization_id (FK)
// 2. Auditoria: created_by, updated_by (FK users)
// 3. Soft Delete: deleted_at (nullable)
// 4. Optimistic Locking: version (int)
// 5. Timestamps: created_at, updated_at
// ==========================================

// --- MULTI-TENANT: ORGANIZATIONS (Inquilinos SaaS) ---

export const organizations = mssqlTable("organizations", {
  id: int("id").primaryKey().identity(),
  name: nvarchar("name", { length: 255 }).notNull(), // Razão Social do Cliente SaaS
  slug: nvarchar("slug", { length: 100 }).notNull(), // URL amigável (ex: 'transportadora-abc')
  document: nvarchar("document", { length: 20 }).notNull(), // CNPJ da empresa contratante
  plan: nvarchar("plan", { length: 20 }).default("FREE"), // 'FREE', 'PRO', 'ENTERPRISE'
  stripeCustomerId: nvarchar("stripe_customer_id", { length: 100 }), // Futuro: Stripe
  
  // Enterprise Base
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'SUSPENDED', 'CANCELED'
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
}, (table) => ([
  uniqueIndex("organizations_slug_idx").on(table.slug),
  uniqueIndex("organizations_document_idx").on(table.document),
]));

// --- AUTHENTICATION (Auth.js Compatible) ---

export const users = mssqlTable("users", {
  id: nvarchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // Multi-Tenant
  name: nvarchar("name", { length: 255 }),
  email: nvarchar("email", { length: 255 }).notNull(),
  emailVerified: datetime2("emailVerified", { precision: 3 }),
  image: nvarchar("image", { length: "max" }),
  passwordHash: nvarchar("password_hash", { length: "max" }), // Para Credentials Auth
  role: nvarchar("role", { length: 50 }).default("USER"), // Role primária
  
  // Data Scoping por Filial
  defaultBranchId: int("default_branch_id"), // Filial padrão ao logar (FK removida para evitar dependência circular)
  
  // Enterprise Base
  createdAt: datetime2("created_at", { precision: 3 }).default(new Date()),
  updatedAt: datetime2("updated_at", { precision: 3 }).default(new Date()),
  deletedAt: datetime2("deleted_at", { precision: 3 }), // Soft Delete
}, (table) => ([
  uniqueIndex("users_email_org_idx").on(table.email, table.organizationId), // Email único por organização
]));

// === USER BRANCHES (Data Scoping - Controle de Acesso por Filial) ===
export const userBranches = mssqlTable(
  "user_branches",
  {
    userId: nvarchar("user_id", { length: 255 }).notNull(),
    branchId: int("branch_id").notNull(),
    createdAt: datetime2("created_at").default(new Date()),
  },
  (t) => ([
    primaryKey({ columns: [t.userId, t.branchId] }),
  ])
);

export const accounts = mssqlTable(
  "accounts",
  {
    userId: nvarchar("userId", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: nvarchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: nvarchar("provider", { length: 255 }).notNull(),
    providerAccountId: nvarchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: nvarchar("refresh_token", { length: "max" }),
    access_token: nvarchar("access_token", { length: "max" }),
    expires_at: int("expires_at"),
    token_type: nvarchar("token_type", { length: 255 }),
    scope: nvarchar("scope", { length: "max" }),
    id_token: nvarchar("id_token", { length: "max" }),
    session_state: nvarchar("session_state", { length: "max" }),
  },
  (account) => ([
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ])
);

export const sessions = mssqlTable("sessions", {
  sessionToken: nvarchar("sessionToken", { length: 255 }).primaryKey(),
  userId: nvarchar("userId", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: datetime2("expires", { precision: 3 }).notNull(),
});

export const verificationTokens = mssqlTable(
  "verificationToken",
  {
    identifier: nvarchar("identifier", { length: 255 }).notNull(),
    token: nvarchar("token", { length: 255 }).notNull(),
    expires: datetime2("expires", { precision: 3 }).notNull(),
  },
  (vt) => ([
    primaryKey({ columns: [vt.identifier, vt.token] }),
  ])
);

// --- RBAC EXTENDIDO (Enterprise) ---

export const roles = mssqlTable("roles", {
  id: int("id").primaryKey().identity(),
  name: nvarchar("name", { length: 50 }).notNull(), // 'Admin', 'Financeiro'
  description: nvarchar("description", { length: 255 }),
  
  // Enterprise Base (simplificado - roles são globais)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
});

export const permissions = mssqlTable("permissions", {
  id: int("id").primaryKey().identity(),
  slug: nvarchar("slug", { length: 100 }).notNull(), // 'tms.create'
  description: nvarchar("description", { length: 255 }),
  
  // Enterprise Base (simplificado - permissions são globais)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
}, (table) => ([
  uniqueIndex("permissions_slug_idx").on(table.slug),
]));

// Pivot: Roles <-> Permissions
export const rolePermissions = mssqlTable(
  "role_permissions",
  {
    roleId: int("role_id").notNull(),
    permissionId: int("permission_id").notNull(),
  },
  (t) => ([
    primaryKey({ columns: [t.roleId, t.permissionId] }),
  ])
);

// Pivot: Users <-> Roles (Removemos pois agora user_roles está fora deste escopo inicial)
// Será tratado no módulo de RBAC avançado

// --- MASTER DATA (Cadastros Gerais) ---

// === BRANCHES (Matriz e Filiais - Emissores de NFe/CTe) ===
export const branches = mssqlTable("branches", {
  // === IDENTIFICAÇÃO ===
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // 🔑 Multi-Tenant
  name: nvarchar("name", { length: 255 }).notNull(), // Razão Social
  tradeName: nvarchar("trade_name", { length: 255 }).notNull(), // Nome Fantasia
  document: nvarchar("document", { length: 20 }).notNull(), // CNPJ
  email: nvarchar("email", { length: 255 }).notNull(),
  phone: nvarchar("phone", { length: 20 }).notNull(),

  // === FISCAL (Emissor de NFe/CTe) ===
  ie: nvarchar("ie", { length: 20 }).notNull(), // Inscrição Estadual
  im: nvarchar("im", { length: 20 }), // Inscrição Municipal
  cClassTrib: nvarchar("c_class_trib", { length: 10 }), // Classificação Tributária
  crt: nvarchar("crt", { length: 1 }).notNull().default("1"), // 1=Simples, 2=Simples Excesso, 3=Normal

  // === ENDEREÇO (Rigoroso - Emissor) ===
  zipCode: nvarchar("zip_code", { length: 10 }).notNull(),
  street: nvarchar("street", { length: 255 }).notNull(),
  number: nvarchar("number", { length: 20 }).notNull(),
  complement: nvarchar("complement", { length: 100 }),
  district: nvarchar("district", { length: 100 }).notNull(),
  cityCode: nvarchar("city_code", { length: 7 }).notNull(), // Código IBGE 7 dígitos
  cityName: nvarchar("city_name", { length: 100 }).notNull(),
  state: nvarchar("state", { length: 2 }).notNull(), // UF

  // === CONFIGURAÇÕES ===
  timeZone: nvarchar("time_zone", { length: 50 }).default("America/Sao_Paulo"),
  logoUrl: nvarchar("logo_url", { length: 500 }),

  // === CERTIFICADO DIGITAL & SEFAZ (NFe/CTe) ===
  certificatePfx: nvarchar("certificate_pfx", { length: "max" }), // Certificado A1 em Base64
  certificatePassword: nvarchar("certificate_password", { length: 255 }), // Senha do certificado
  certificateExpiry: datetime2("certificate_expiry"), // Data de validade
  lastNsu: nvarchar("last_nsu", { length: 15 }).default("0"), // Último NSU baixado (DistribuicaoDFe)
  environment: nvarchar("environment", { length: 20 }).default("HOMOLOGATION"), // 'HOMOLOGATION', 'PRODUCTION'

  // === ENTERPRISE BASE (Auditoria + Segurança) ===
  createdBy: nvarchar("created_by", { length: 255 }), // Quem criou (FK removida para evitar dependência circular)
  updatedBy: nvarchar("updated_by", { length: 255 }), // Quem atualizou (FK removida para evitar dependência circular)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'INACTIVE'
}, (table) => ([
  uniqueIndex("branches_document_org_idx").on(table.document, table.organizationId), // CNPJ único por organização
]));

// === BUSINESS PARTNERS (Clientes/Fornecedores/Transportadoras) ===
export const businessPartners = mssqlTable("business_partners", {
  // === IDENTIFICAÇÃO ===
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // 🔑 Multi-Tenant
  type: nvarchar("type", { length: 20 }).notNull(), // 'CLIENT', 'PROVIDER', 'CARRIER', 'BOTH'
  document: nvarchar("document", { length: 20 }).notNull(), // CPF/CNPJ
  name: nvarchar("name", { length: 255 }).notNull(), // Razão Social
  tradeName: nvarchar("trade_name", { length: 255 }), // Nome Fantasia
  email: nvarchar("email", { length: 255 }), // Nullable - Suporte a importação XML
  phone: nvarchar("phone", { length: 20 }), // Nullable - Suporte a importação XML
  dataSource: nvarchar("data_source", { length: 20 }).default("MANUAL"), // 'MANUAL', 'XML_IMPORT'

  // === FISCAL (Compliance NFe/CTe 4.0 + Reforma Tributária) ===
  taxRegime: nvarchar("tax_regime", { length: 20 }).notNull(), // 'SIMPLE', 'NORMAL', 'PRESUMED'
  ie: nvarchar("ie", { length: 20 }), // Inscrição Estadual (aceita 'ISENTO')
  im: nvarchar("im", { length: 20 }), // Inscrição Municipal
  cClassTrib: nvarchar("c_class_trib", { length: 10 }), // Classificação Tributária (Reforma/eSocial)
  indIeDest: nvarchar("ind_iedest", { length: 1 }).default("9"), // 1=Contribuinte, 2=Isento, 9=Não Contribuinte

  // === ENDEREÇO (Validação Rigorosa para Impostos) ===
  zipCode: nvarchar("zip_code", { length: 10 }).notNull(),
  street: nvarchar("street", { length: 255 }).notNull(),
  number: nvarchar("number", { length: 20 }).notNull(),
  complement: nvarchar("complement", { length: 100 }),
  district: nvarchar("district", { length: 100 }).notNull(),
  cityCode: nvarchar("city_code", { length: 7 }).notNull(), // Código IBGE 7 dígitos - CRUCIAL
  cityName: nvarchar("city_name", { length: 100 }).notNull(),
  state: nvarchar("state", { length: 2 }).notNull(), // UF

  // === ENTERPRISE BASE (Auditoria + Segurança) ===
  createdBy: nvarchar("created_by", { length: 255 }), // Quem criou (FK removida para evitar dependência circular)
  updatedBy: nvarchar("updated_by", { length: 255 }), // Quem atualizou (FK removida para evitar dependência circular)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'INACTIVE'
}, (table) => ([
  uniqueIndex("business_partners_document_org_idx").on(table.document, table.organizationId), // Documento único por organização
]));

// === PRODUCTS (Produtos/Materiais) ===
export const products = mssqlTable("products", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // 🔑 Multi-Tenant
  
  // Identificação do Produto
  sku: nvarchar("sku", { length: 50 }).notNull(),
  name: nvarchar("name", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }),
  unit: nvarchar("unit", { length: 10 }).notNull(), // 'UN', 'KG', 'CX', 'LT'
  
  // Fiscal (NFe/CTe Compliance)
  ncm: nvarchar("ncm", { length: 8 }).notNull(), // 8 dígitos (ex: 84714100)
  origin: nvarchar("origin", { length: 1 }).notNull().default("0"), // 0=Nacional, 1=Importada...
  
  // Logística & Precificação
  weightKg: decimal("weight_kg", { precision: 10, scale: 3 }), // Peso Bruto (KG) - Crítico para Frete
  priceCost: decimal("price_cost", { precision: 18, scale: 2 }), // Preço de Custo
  priceSale: decimal("price_sale", { precision: 18, scale: 2 }), // Preço de Venda
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }), // FK removida para evitar dependência circular
  updatedBy: nvarchar("updated_by", { length: 255 }), // FK removida para evitar dependência circular
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
}, (table) => ([
  uniqueIndex("products_sku_org_idx").on(table.sku, table.organizationId), // SKU único por organização
]));

// === INBOUND INVOICES (Notas Fiscais de Entrada) ===

/**
 * 📥 INBOUND INVOICES (Cabeçalho da NFe de Entrada)
 * 
 * Armazena dados do cabeçalho das NFes importadas via XML.
 * Utilizado para:
 * - Entrada de mercadorias no estoque
 * - Cadastro automático de fornecedores
 * - Cadastro automático de produtos
 * - Conciliação fiscal
 */
export const inboundInvoices = mssqlTable("inbound_invoices", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // 🔑 Multi-Tenant
  
  branchId: int("branch_id")
    .notNull()
    .references(() => branches.id), // Filial que recebeu a nota
  
  partnerId: int("partner_id")
    .references(() => businessPartners.id), // Fornecedor (Emitente da NFe)
  
  // Dados da NFe
  accessKey: nvarchar("access_key", { length: 44 }).notNull(), // Chave de Acesso (44 dígitos)
  series: nvarchar("series", { length: 10 }),
  number: nvarchar("number", { length: 20 }),
  model: nvarchar("model", { length: 2 }).default("55"), // 55=NFe, 65=NFCe
  issueDate: datetime2("issue_date").notNull(), // Data de Emissão
  entryDate: datetime2("entry_date"), // Data de Entrada no Estoque
  
  // Valores
  totalProducts: decimal("total_products", { precision: 18, scale: 2 }), // Total dos Produtos
  totalNfe: decimal("total_nfe", { precision: 18, scale: 2 }), // Total da NFe
  
  // Armazenamento do XML Original
  xmlContent: nvarchar("xml_content", { length: "max" }), // XML completo
  xmlHash: nvarchar("xml_hash", { length: 64 }), // SHA-256 do XML (para detecção de duplicatas)
  
  // Controle de Processamento
  status: nvarchar("status", { length: 20 }).default("DRAFT"), // DRAFT, IMPORTED, CANCELED
  importedBy: nvarchar("imported_by", { length: 255 }), // Usuário que importou
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("inbound_invoices_access_key_idx").on(table.accessKey, table.organizationId), // Chave única por org
]));

/**
 * 📦 INBOUND INVOICE ITEMS (Itens da NFe de Entrada)
 * 
 * Itens individuais de cada NFe importada.
 * Permite vincular produtos do XML com produtos do cadastro.
 */
export const inboundInvoiceItems = mssqlTable("inbound_invoice_items", {
  id: int("id").primaryKey().identity(),
  invoiceId: int("invoice_id")
    .notNull()
    .references(() => inboundInvoices.id, { onDelete: "cascade" }),
  
  // Vinculação com Produto Cadastrado (pode ser NULL se for produto novo)
  productId: int("product_id")
    .references(() => products.id),
  
  // Dados do Produto no XML (sempre salvos para referência)
  productCodeXml: nvarchar("product_code_xml", { length: 60 }), // Código do fornecedor
  productNameXml: nvarchar("product_name_xml", { length: 500 }), // Descrição no XML
  eanXml: nvarchar("ean_xml", { length: 14 }), // EAN/GTIN
  
  // Fiscal
  ncm: nvarchar("ncm", { length: 8 }),
  cfop: nvarchar("cfop", { length: 4 }), // Código Fiscal de Operação
  cst: nvarchar("cst", { length: 3 }), // Código de Situação Tributária
  
  // Quantidades e Valores
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  unit: nvarchar("unit", { length: 10 }), // Unidade (UN, KG, etc)
  unitPrice: decimal("unit_price", { precision: 18, scale: 6 }), // Preço Unitário
  totalPrice: decimal("total_price", { precision: 18, scale: 2 }), // Total do Item
  
  // Controle
  itemNumber: int("item_number"), // Número sequencial do item na NFe
  
  createdAt: datetime2("created_at").default(new Date()),
});

// === AUDIT LOGS (Sistema de Auditoria Global) ===
export const auditLogs = mssqlTable("audit_logs", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }), // 🔑 Multi-Tenant
  userId: nvarchar("user_id", { length: 255 }), // Quem fez a ação (FK removida para evitar dependência circular)
  action: nvarchar("action", { length: 50 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE'
  entity: nvarchar("entity", { length: 50 }).notNull(), // 'Product', 'Order', 'Branch'
  entityId: nvarchar("entity_id", { length: 255 }), // ID do recurso afetado
  changes: nvarchar("changes", { length: "max" }), // JSON com diff das alterações
  ipAddress: nvarchar("ip_address", { length: 50 }),
  userAgent: nvarchar("user_agent", { length: 500 }),
  createdAt: datetime2("created_at").default(new Date()),
});

// --- RELATIONS (COMENTADAS - Beta ainda instável para MSSQL) ---
/*
import { defineRelations } from "drizzle-orm";

export const organizationsRelations = defineRelations(organizations as any, ({ many }) => ({
  users: many(users),
  branches: many(branches),
  businessPartners: many(businessPartners),
}));

export const usersRelations = defineRelations(users as any, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  defaultBranch: one(branches, {
    fields: [users.defaultBranchId],
    references: [branches.id],
  }),
  userBranches: many(userBranches),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const branchesRelations = defineRelations(branches as any, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [branches.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [branches.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [branches.updatedBy],
    references: [users.id],
  }),
  userBranches: many(userBranches),
}));

export const businessPartnersRelations = defineRelations(businessPartners as any, ({ one }) => ({
  organization: one(organizations, {
    fields: [businessPartners.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [businessPartners.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [businessPartners.updatedBy],
    references: [users.id],
  }),
}));

export const userBranchesRelations = defineRelations(userBranches as any, ({ one }) => ({
  user: one(users, {
    fields: [userBranches.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [userBranches.branchId],
    references: [branches.id],
  }),
}));
*/
