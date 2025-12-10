import { defineRelations, sql } from "drizzle-orm";
import {
  int,
  bigint,
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

// Pivot: Users <-> Roles
export const userRoles = mssqlTable(
  "user_roles",
  {
    userId: nvarchar("user_id", { length: 255 }).notNull(),
    roleId: int("role_id").notNull(),
    organizationId: int("organization_id").notNull(),
    branchId: int("branch_id"),
    createdAt: datetime2("created_at").default(new Date()),
  },
  (t) => ([
    primaryKey({ columns: [t.userId, t.roleId] }),
  ])
);

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
  // CNPJ único por organização (apenas registros não deletados)
  uniqueIndex("branches_document_org_idx")
    .on(table.document, table.organizationId)
    .where(sql`deleted_at IS NULL`),
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
  
  // Conversão de Unidade (ONDA 5.3)
  unitConversionEnabled: nvarchar("unit_conversion_enabled", { length: 1 }).default("N"),
  unitConversionFactor: decimal("unit_conversion_factor", { precision: 10, scale: 4 }),
  primaryUnit: nvarchar("primary_unit", { length: 10 }),
  secondaryUnit: nvarchar("secondary_unit", { length: 10 }),
  
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
  
  // ✅ CLASSIFICAÇÃO AUTOMÁTICA (OPÇÃO A - Bloco 1)
  nfeType: nvarchar("nfe_type", { length: 20 }).default("PURCHASE"),
  // 'PURCHASE' - NFe de compra (somos destinatário)
  // 'CARGO'    - NFe de carga para transporte (somos transportador)
  // 'RETURN'   - NFe de devolução (somos remetente)
  // 'OTHER'    - Outros casos
  
  // Dados do Transportador (se nfeType = 'CARGO')
  carrierCnpj: nvarchar("carrier_cnpj", { length: 14 }),
  carrierName: nvarchar("carrier_name", { length: 255 }),
  
  // Dados do Destinatário (para identificar rota de carga)
  recipientCnpj: nvarchar("recipient_cnpj", { length: 14 }),
  recipientName: nvarchar("recipient_name", { length: 255 }),
  recipientCity: nvarchar("recipient_city", { length: 100 }),
  recipientUf: nvarchar("recipient_uf", { length: 2 }),
  
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

// ==========================================
// MÓDULO FINANCEIRO
// ==========================================

// --- CATEGORIAS FINANCEIRAS (Plano de Contas) ---

export const financialCategories = mssqlTable("financial_categories", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  
  // Dados
  name: nvarchar("name", { length: 255 }).notNull(), // Ex: "Combustível", "Frete", "Fornecedores"
  code: nvarchar("code", { length: 50 }), // Ex: "1.01.02" (Plano de Contas)
  type: nvarchar("type", { length: 20 }).notNull(), // 'INCOME', 'EXPENSE'
  description: nvarchar("description", { length: "max" }),
  
  // Enterprise Base
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'INACTIVE'
  createdBy: nvarchar("created_by", { length: 255 }).notNull(), // FK users
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
});

// --- CONTAS BANCÁRIAS ---

export const bankAccounts = mssqlTable("bank_accounts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  branchId: int("branch_id"), // FK branches (Nullable - Conta pode ser compartilhada)
  
  // Dados Bancários
  name: nvarchar("name", { length: 255 }).notNull(), // Ex: "Itaú Principal"
  bankCode: nvarchar("bank_code", { length: 10 }), // Ex: "341" (Itaú), "208" (BTG)
  bankName: nvarchar("bank_name", { length: 255 }), // Ex: "Itaú Unibanco", "BTG Pactual"
  agency: nvarchar("agency", { length: 20 }), // Agência
  accountNumber: nvarchar("account_number", { length: 50 }), // Número da Conta
  accountDigit: nvarchar("account_digit", { length: 2 }), // Dígito Verificador
  accountType: nvarchar("account_type", { length: 50 }), // 'CHECKING', 'SAVINGS', 'INVESTMENT'
  
  // CNAB - Dados Técnicos para Remessa/Retorno
  wallet: nvarchar("wallet", { length: 20 }), // Carteira (Ex: "09" para BTG)
  agreementNumber: nvarchar("agreement_number", { length: 50 }), // Convênio/Cédente
  cnabLayout: nvarchar("cnab_layout", { length: 20 }).default("CNAB240"), // 'CNAB240', 'CNAB400'
  nextRemittanceNumber: int("next_remittance_number").default(1), // Sequencial de Remessa
  
  // Saldo
  initialBalance: decimal("initial_balance", { precision: 18, scale: 2 }).default("0.00"), // Saldo Inicial
  currentBalance: decimal("current_balance", { precision: 18, scale: 2 }).default("0.00"), // Saldo Atual (Calculado)
  
  // Enterprise Base
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'INACTIVE'
  createdBy: nvarchar("created_by", { length: 255 }).notNull(), // FK users
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
});

// === BANK REMITTANCES (Histórico de Arquivos CNAB) ===
export const bankRemittances = mssqlTable("bank_remittances", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  bankAccountId: int("bank_account_id").notNull(), // FK bank_accounts
  
  // Dados do Arquivo
  fileName: nvarchar("file_name", { length: 255 }).notNull(), // Ex: "REM20231215001.rem"
  content: nvarchar("content", { length: "max" }).notNull(), // Conteúdo do arquivo CNAB
  remittanceNumber: int("remittance_number").notNull(), // Número sequencial
  
  // Tipo e Status
  type: nvarchar("type", { length: 20 }).notNull(), // 'PAYMENT', 'RECEIVABLE'
  status: nvarchar("status", { length: 50 }).default("GENERATED"), // 'GENERATED', 'SENT', 'PROCESSED_BY_BANK', 'ERROR'
  
  // Estatísticas
  totalRecords: int("total_records").default(0), // Quantidade de títulos
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).default("0.00"), // Valor total
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  processedAt: datetime2("processed_at"), // Data de processamento pelo banco
  
  // Enterprise Base (Simplificado - Arquivos não são editáveis)
  createdBy: nvarchar("created_by", { length: 255 }).notNull(), // FK users
  createdAt: datetime2("created_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
});

// === FINANCIAL DDA INBOX (Débito Direto Autorizado) ===
export const financialDdaInbox = mssqlTable("financial_dda_inbox", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  bankAccountId: int("bank_account_id").notNull(), // FK bank_accounts
  
  // Dados do Boleto (vindo do banco)
  externalId: nvarchar("external_id", { length: 255 }).notNull(), // ID único no banco
  beneficiaryName: nvarchar("beneficiary_name", { length: 255 }).notNull(), // Nome do Cedente
  beneficiaryDocument: nvarchar("beneficiary_document", { length: 20 }).notNull(), // CNPJ/CPF do Cedente
  
  // Valores e Datas
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(), // Valor do boleto
  dueDate: datetime2("due_date").notNull(), // Data de Vencimento
  issueDate: datetime2("issue_date"), // Data de Emissão
  
  // Código de Barras
  barcode: nvarchar("barcode", { length: 100 }).notNull(), // Linha digitável
  digitableLine: nvarchar("digitable_line", { length: 100 }), // Linha digitável formatada
  
  // Vinculação e Status
  status: nvarchar("status", { length: 20 }).default("PENDING"), // 'PENDING', 'LINKED', 'DISMISSED', 'PAID'
  matchedPayableId: int("matched_payable_id"), // FK accounts_payable (Nullable)
  matchScore: int("match_score").default(0), // Score de confiança do match (0-100)
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  dismissedReason: nvarchar("dismissed_reason", { length: 255 }), // Motivo da rejeição
  
  // Enterprise Base
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
});

// --- CONTAS A PAGAR ---

export const accountsPayable = mssqlTable("accounts_payable", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  branchId: int("branch_id").notNull(), // FK branches (Filial responsável)
  
  // Relacionamentos
  partnerId: int("partner_id"), // FK business_partners (Fornecedor)
  categoryId: int("category_id"), // FK financial_categories (Categoria de Despesa)
  bankAccountId: int("bank_account_id"), // FK bank_accounts (Conta de Baixa - Nullable até baixar)
  inboundInvoiceId: int("inbound_invoice_id"), // FK inbound_invoices (NFe de compra) - DEPRECATED
  fiscalDocumentId: bigint("fiscal_document_id", { mode: "number" }), // FK fiscal_documents (Novo)
  
  // Controladoria Gerencial
  costCenterId: int("cost_center_id"), // FK cost_centers (Obrigatório ao pagar)
  chartAccountId: int("chart_account_id"), // FK chart_of_accounts (Obrigatório ao pagar)
  
  // Dados do Título
  description: nvarchar("description", { length: "max" }).notNull(), // Ex: "NFe 12345 - Fornecedor XYZ"
  documentNumber: nvarchar("document_number", { length: 100 }), // Ex: "NFe 12345", "Boleto 98765"
  barcode: nvarchar("barcode", { length: 100 }), // Código de barras do boleto (DDA)
  
  // Datas
  issueDate: datetime2("issue_date").notNull(), // Data de Emissão
  dueDate: datetime2("due_date").notNull(), // Data de Vencimento
  payDate: datetime2("pay_date"), // Data de Pagamento (Nullable)
  
  // Valores
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(), // Valor Original
  amountPaid: decimal("amount_paid", { precision: 18, scale: 2 }).default("0.00"), // Valor Pago
  discount: decimal("discount", { precision: 18, scale: 2 }).default("0.00"), // Desconto
  interest: decimal("interest", { precision: 18, scale: 2 }).default("0.00"), // Juros
  fine: decimal("fine", { precision: 18, scale: 2 }).default("0.00"), // Multa
  
  // Status e Origem
  status: nvarchar("status", { length: 20 }).default("OPEN").notNull(), // 'OPEN', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELED'
  origin: nvarchar("origin", { length: 50 }).default("MANUAL"), // 'MANUAL', 'FISCAL_NFE', 'FISCAL_CTE', 'IMPORT'
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(), // FK users
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
});

// --- CONTAS A RECEBER ---

export const accountsReceivable = mssqlTable("accounts_receivable", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  branchId: int("branch_id").notNull(), // FK branches (Filial responsável)
  
  // Relacionamentos
  partnerId: int("partner_id"), // FK business_partners (Cliente)
  categoryId: int("category_id"), // FK financial_categories (Categoria de Receita)
  bankAccountId: int("bank_account_id"), // FK bank_accounts (Conta de Recebimento - Nullable até receber)
  cteDocumentId: int("cte_document_id"), // FK cte_documents (CTe emitido) - DEPRECATED
  fiscalDocumentId: bigint("fiscal_document_id", { mode: "number" }), // FK fiscal_documents (Novo)
  
  // Controladoria Gerencial
  costCenterId: int("cost_center_id"), // FK cost_centers (Obrigatório ao receber)
  chartAccountId: int("chart_account_id"), // FK chart_of_accounts (Obrigatório ao receber)
  
  // Dados do Título
  description: nvarchar("description", { length: "max" }).notNull(), // Ex: "Venda #12345 - Cliente ABC"
  documentNumber: nvarchar("document_number", { length: 100 }), // Ex: "NF 54321"
  
  // Datas
  issueDate: datetime2("issue_date").notNull(), // Data de Emissão
  dueDate: datetime2("due_date").notNull(), // Data de Vencimento
  receiveDate: datetime2("receive_date"), // Data de Recebimento (Nullable)
  
  // Valores
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(), // Valor Original
  amountReceived: decimal("amount_received", { precision: 18, scale: 2 }).default("0.00"), // Valor Recebido
  discount: decimal("discount", { precision: 18, scale: 2 }).default("0.00"), // Desconto
  interest: decimal("interest", { precision: 18, scale: 2 }).default("0.00"), // Juros
  fine: decimal("fine", { precision: 18, scale: 2 }).default("0.00"), // Multa
  
  // Status e Origem
  status: nvarchar("status", { length: 20 }).default("OPEN").notNull(), // 'OPEN', 'RECEIVED', 'PARTIAL', 'OVERDUE', 'CANCELED'
  origin: nvarchar("origin", { length: 50 }).default("MANUAL"), // 'MANUAL', 'FISCAL_NFE_SAIDA', 'SALE', 'IMPORT'
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(), // FK users
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
});

// --- ITENS DAS CONTAS A PAGAR (Detalhamento por NCM) ---

export const payableItems = mssqlTable("payable_items", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  payableId: int("payable_id").notNull(), // FK accounts_payable
  
  // Dados do Item da NFe
  itemNumber: int("item_number").notNull(), // Número do item na NFe (1, 2, 3...)
  ncm: nvarchar("ncm", { length: 10 }).notNull(), // NCM do produto
  productCode: nvarchar("product_code", { length: 100 }), // Código do fornecedor
  productName: nvarchar("product_name", { length: 255 }).notNull(), // Descrição
  ean: nvarchar("ean", { length: 20 }), // Código de barras
  cfop: nvarchar("cfop", { length: 10 }), // CFOP
  cst: nvarchar("cst", { length: 10 }), // CST/CSOSN
  
  // Quantidades e Valores
  unit: nvarchar("unit", { length: 10 }).notNull(), // UN, KG, LT, etc
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 18, scale: 4 }).notNull(),
  totalPrice: decimal("total_price", { precision: 18, scale: 2 }).notNull(),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// --- MATRIZ DE CLASSIFICAÇÃO AUTOMÁTICA (NCM → Categoria Contábil) ---

export const autoClassificationRules = mssqlTable("auto_classification_rules", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  
  // Prioridade (menor = mais importante)
  priority: int("priority").default(100).notNull(),
  
  // Regras de Match
  matchType: nvarchar("match_type", { length: 30 }).notNull(), 
  // 'NCM', 'NCM_WILDCARD', 'CFOP', 'SUPPLIER', 'NCM_CFOP', 'KEYWORD'
  
  // Valores de Match
  ncmCode: nvarchar("ncm_code", { length: 10 }), // Ex: "2710.12.51" ou "2710.*"
  cfopCode: nvarchar("cfop_code", { length: 10 }), // Ex: "1.102"
  supplierId: int("supplier_id"), // FK business_partners
  keyword: nvarchar("keyword", { length: 100 }), // Ex: "COMBUSTIVEL", "DIESEL"
  
  // Tipo de Operação
  operationType: nvarchar("operation_type", { length: 20 }).notNull(),
  // 'PURCHASE', 'SALE', 'RETURN', 'TRANSPORT'
  
  // Classificação Resultante
  categoryId: int("category_id").notNull(), // FK financial_categories
  chartAccountId: int("chart_account_id").notNull(), // FK chart_of_accounts
  costCenterId: int("cost_center_id"), // FK cost_centers (opcional)
  
  // Descrição
  name: nvarchar("name", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }),
  
  // Status
  isActive: nvarchar("is_active", { length: 10 }).default("true"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ============================================================================
// FLEET MANAGEMENT (Gestão de Frota)
// ============================================================================

// === DRIVERS (Motoristas) ===
export const drivers = mssqlTable("drivers", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  
  // Dados Pessoais
  name: nvarchar("name", { length: 255 }).notNull(), // Nome completo
  cpf: nvarchar("cpf", { length: 14 }).notNull(), // CPF (Unique per org)
  phone: nvarchar("phone", { length: 20 }), // Telefone/Celular
  email: nvarchar("email", { length: 255 }), // Email
  
  // CNH (Carteira Nacional de Habilitação)
  cnhNumber: nvarchar("cnh_number", { length: 20 }).notNull(), // Número da CNH
  cnhCategory: nvarchar("cnh_category", { length: 5 }).notNull(), // Categoria (A, B, C, D, E, AB, AC, AD, AE)
  cnhExpiry: datetime2("cnh_expiry").notNull(), // Data de Vencimento
  cnhIssueDate: datetime2("cnh_issue_date"), // Data de Emissão
  
  // Relacionamentos
  partnerId: int("partner_id"), // FK business_partners (para pagamentos/freelancer)
  
  // Status e Controle
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'VACATION', 'BLOCKED', 'INACTIVE'
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
}, (table) => ([
  // CPF único por organização (apenas registros não deletados)
  uniqueIndex("drivers_cpf_org_idx")
    .on(table.cpf, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// === VEHICLES (Veículos) ===
export const vehicles = mssqlTable("vehicles", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(), // FK organizations
  branchId: int("branch_id").notNull(), // FK branches (Filial responsável)
  
  // Identificação do Veículo
  plate: nvarchar("plate", { length: 10 }).notNull(), // Placa (Mercosul ou antiga)
  renavam: nvarchar("renavam", { length: 20 }), // Renavam
  chassis: nvarchar("chassis", { length: 30 }), // Chassi
  
  // Tipo e Categoria
  type: nvarchar("type", { length: 20 }).notNull(), // 'TRUCK', 'TRAILER', 'VAN', 'MOTORCYCLE', 'CAR'
  
  // Dados do Veículo
  brand: nvarchar("brand", { length: 100 }), // Marca (ex: Scania, Volvo, Mercedes)
  model: nvarchar("model", { length: 100 }), // Modelo
  year: int("year"), // Ano de fabricação
  color: nvarchar("color", { length: 50 }), // Cor
  
  // Capacidades (Logística)
  capacityKg: decimal("capacity_kg", { precision: 18, scale: 2 }).default("0.00"), // Capacidade de carga (kg)
  capacityM3: decimal("capacity_m3", { precision: 18, scale: 2 }).default("0.00"), // Capacidade volumétrica (m³)
  taraKg: decimal("tara_kg", { precision: 18, scale: 2 }).default("0.00"), // Peso vazio (Tara)
  
  // Controle Operacional
  status: nvarchar("status", { length: 20 }).default("AVAILABLE"), // 'AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'INACTIVE'
  currentKm: int("current_km").default(0), // Odômetro atual
  
  // Manutenção
  maintenanceStatus: nvarchar("maintenance_status", { length: 20 }).default("OK"), // 'OK', 'WARNING', 'CRITICAL'
  lastMaintenanceDate: datetime2("last_maintenance_date"), // Data da última manutenção
  nextMaintenanceKm: int("next_maintenance_km"), // Próxima manutenção (km)
  
  // Documentação
  licensePlateExpiry: datetime2("license_plate_expiry"), // Vencimento do licenciamento
  insuranceExpiry: datetime2("insurance_expiry"), // Vencimento do seguro
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
}, (table) => ([
  // Placa única por organização (apenas registros não deletados)
  uniqueIndex("vehicles_plate_org_idx")
    .on(table.plate, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// ==========================================
// CADASTROS AUXILIARES
// ==========================================

// --- CONDIÇÕES DE PAGAMENTO ---

export const paymentTerms = mssqlTable("payment_terms", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação
  code: nvarchar("code", { length: 20 }).notNull(), // Ex: "30/60", "AVISTA"
  name: nvarchar("name", { length: 100 }).notNull(), // Ex: "30/60/90 dias", "À Vista"
  description: nvarchar("description", { length: "max" }),
  
  // Configuração
  installments: int("installments").default(1).notNull(), // Número de parcelas
  daysInterval: int("days_interval").default(0), // Dias entre parcelas
  firstDueDays: int("first_due_days").default(0), // Dias até primeira parcela
  
  // Tipo
  type: nvarchar("type", { length: 20 }).default("TERM"), // 'TERM' (Prazo), 'CASH' (À Vista), 'CUSTOM' (Personalizado)
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("payment_terms_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// --- UNIDADES DE MEDIDA ---

export const unitsOfMeasure = mssqlTable("units_of_measure", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação
  code: nvarchar("code", { length: 10 }).notNull(), // Ex: "UN", "KG", "LT", "M3"
  name: nvarchar("name", { length: 100 }).notNull(), // Ex: "Unidade", "Quilograma"
  symbol: nvarchar("symbol", { length: 10 }), // Ex: "kg", "L", "m³"
  
  // Tipo
  type: nvarchar("type", { length: 20 }).notNull(), // 'WEIGHT', 'VOLUME', 'LENGTH', 'QUANTITY', 'TIME'
  
  // Conversão (para unidade base do tipo)
  conversionFactor: decimal("conversion_factor", { precision: 18, scale: 6 }).default("1.000000"), // Ex: 1kg = 1000g (fator 0.001)
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("units_of_measure_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// --- TIPOS DE VEÍCULO PADRONIZADOS ---

export const vehicleTypes = mssqlTable("vehicle_types", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação
  code: nvarchar("code", { length: 20 }).notNull(), // Ex: "TRUCK", "CARRETA", "VAN"
  name: nvarchar("name", { length: 100 }).notNull(), // Ex: "Caminhão Toco", "Carreta LS"
  description: nvarchar("description", { length: "max" }),
  
  // Categoria
  category: nvarchar("category", { length: 30 }).notNull(), // 'LIGHT' (Leve), 'MEDIUM' (Médio), 'HEAVY' (Pesado)
  
  // Capacidades Padrão
  capacityKg: decimal("capacity_kg", { precision: 18, scale: 2 }).default("0.00"), // Capacidade em kg
  capacityM3: decimal("capacity_m3", { precision: 18, scale: 2 }).default("0.00"), // Capacidade em m³
  
  // Eixos e Características
  axles: int("axles").default(0), // Número de eixos
  maxLength: decimal("max_length", { precision: 18, scale: 2 }), // Comprimento máximo (metros)
  maxHeight: decimal("max_height", { precision: 18, scale: 2 }), // Altura máxima (metros)
  maxWidth: decimal("max_width", { precision: 18, scale: 2 }), // Largura máxima (metros)
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("vehicle_types_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// ==========================================
// COMERCIAL & FISCAL
// ==========================================

// --- GEOGRAFIA: REGIÕES ---

export const geoRegions = mssqlTable("geo_regions", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação
  code: nvarchar("code", { length: 20 }).notNull(), // Ex: "GRANDE_SP", "INTERIOR_SP"
  name: nvarchar("name", { length: 100 }).notNull(), // Ex: "Grande São Paulo"
  description: nvarchar("description", { length: "max" }),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("geo_regions_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// ==========================================
// COMERCIAL & FISCAL
// ==========================================

// --- FISCAL: TAX RULES (Regras de ICMS por UF) ---

export const taxRules = mssqlTable("tax_rules", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Rota Fiscal
  originState: nvarchar("origin_state", { length: 2 }).notNull(), // UF origem (ex: SP)
  destinationState: nvarchar("destination_state", { length: 2 }).notNull(), // UF destino (ex: RJ)
  
  // Alíquotas e CFOP
  icmsRate: decimal("icms_rate", { precision: 5, scale: 2 }).notNull(), // Ex: 12.00 (%)
  cfopTransport: nvarchar("cfop_transport", { length: 4 }), // Ex: 5352 (Prestação de serviço de transporte)
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  // Regra única por rota e organização
  uniqueIndex("tax_rules_route_org_idx")
    .on(table.originState, table.destinationState, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// --- COMERCIAL: FREIGHT TABLES (Tabelas de Frete) ---

export const freightTables = mssqlTable("freight_tables", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação
  name: nvarchar("name", { length: 255 }).notNull(), // Ex: "Tabela SP Interior 2024"
  code: nvarchar("code", { length: 50 }), // Código interno
  
  // Tipo de Tabela
  type: nvarchar("type", { length: 30 }).notNull(), // 'GENERAL' (Padrão), 'CLIENT_SPECIFIC' (Cliente específico)
  transportType: nvarchar("transport_type", { length: 30 }).notNull(), // 'FTL_LOTACAO', 'LTL_FRACIONADO'
  
  // Tipo de Cálculo
  calculationType: nvarchar("calculation_type", { length: 30 }).default("WEIGHT_RANGE"), // 'WEIGHT_RANGE', 'PER_KM', 'PER_VEHICLE_TYPE'
  
  // Cliente Específico (Nullable)
  customerId: int("customer_id"), // FK business_partners (se tipo = CLIENT_SPECIFIC)
  
  // Valores Mínimos
  minFreightValue: decimal("min_freight_value", { precision: 18, scale: 2 }).default("0.00"), // Frete mínimo global
  
  // Vigência
  validFrom: datetime2("valid_from").notNull(),
  validTo: datetime2("valid_to"),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'INACTIVE', 'EXPIRED'
  
  // Descrição
  description: nvarchar("description", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// --- COMERCIAL: FREIGHT WEIGHT RANGES (Faixas de Peso/Preço) ---

export const freightWeightRanges = mssqlTable("freight_weight_ranges", {
  id: int("id").primaryKey().identity(),
  freightTableId: int("freight_table_id").notNull(), // FK freight_tables
  
  // Faixa de Peso
  minWeight: decimal("min_weight", { precision: 18, scale: 2 }).notNull(), // Ex: 0.00 kg
  maxWeight: decimal("max_weight", { precision: 18, scale: 2 }), // Ex: 10.00 kg (NULL = ilimitado)
  
  // Precificação
  fixedPrice: decimal("fixed_price", { precision: 18, scale: 2 }).notNull(), // Preço fixo da faixa
  pricePerKgExceeded: decimal("price_per_kg_exceeded", { precision: 18, scale: 2 }).default("0.00"), // Preço por kg excedente
  
  // Ordem de Exibição
  displayOrder: int("display_order").default(0),
  
  // Enterprise Base (Simplificado - sem multi-tenancy pois herda da tabela)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// --- COMERCIAL: FREIGHT EXTRA COMPONENTS (Componentes Adicionais) ---

export const freightExtraComponents = mssqlTable("freight_extra_components", {
  id: int("id").primaryKey().identity(),
  freightTableId: int("freight_table_id").notNull(), // FK freight_tables
  
  // Identificação
  name: nvarchar("name", { length: 100 }).notNull(), // Ex: 'Ad Valorem', 'GRIS', 'Despacho', 'Pedágio'
  code: nvarchar("code", { length: 50 }), // Código interno
  
  // Tipo de Cobrança
  type: nvarchar("type", { length: 30 }).notNull(), // 'PERCENTAGE' (% sobre valor NF), 'FIXED_VALUE', 'PER_KG'
  
  // Valores
  value: decimal("value", { precision: 18, scale: 2 }).notNull(), // Ex: 0.30 (0,3% para Ad Valorem) ou 50.00 (R$ 50,00 fixo)
  minValue: decimal("min_value", { precision: 18, scale: 2 }).default("0.00"), // Valor mínimo a cobrar
  maxValue: decimal("max_value", { precision: 18, scale: 2 }), // Valor máximo (opcional)
  
  // Ativo?
  isActive: nvarchar("is_active", { length: 10 }).default("true"), // 'true', 'false'
  
  // Ordem de Aplicação
  applyOrder: int("apply_order").default(0), // Ordem de cálculo (importante para cascata)
  
  // Enterprise Base (Simplificado)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// --- COMERCIAL: FREIGHT TABLE ROUTES (Rotas Geográficas) ---

export const freightTableRoutes = mssqlTable("freight_table_routes", {
  id: int("id").primaryKey().identity(),
  freightTableId: int("freight_table_id").notNull(), // FK freight_tables
  
  // Rota Geográfica
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(), // UF origem (ex: SP)
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(), // UF destino (ex: RJ)
  
  // Praças Específicas (Opcional)
  originCityId: int("origin_city_id"), // FK cities (NULL = vale para todo o estado)
  destinationCityId: int("destination_city_id"), // FK cities (NULL = vale para todo o estado)
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  
  // Ordem de Exibição
  displayOrder: int("display_order").default(0),
  
  // Enterprise Base (Simplificado)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// ==========================================
// FINANCEIRO GERENCIAL (CONTROLADORIA)
// ==========================================

// --- CENTROS DE CUSTO (Entidades Vivas) ---

export const costCenters = mssqlTable("cost_centers", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação Hierárquica
  code: nvarchar("code", { length: 50 }).notNull(), // Ex: "01.01.001"
  name: nvarchar("name", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }),
  
  // Tipo (Sintético = Agrupador, Analítico = Recebe Lançamentos)
  type: nvarchar("type", { length: 20 }).notNull(), // 'ANALYTIC', 'SYNTHETIC'
  
  // Hierarquia
  parentId: int("parent_id"), // FK cost_centers (NULL = raiz)
  level: int("level").default(0),
  isAnalytical: nvarchar("is_analytical", { length: 10 }).default("false"),
  
  // Vínculos com Entidades
  linkedVehicleId: int("linked_vehicle_id"), // FK vehicles
  linkedPartnerId: int("linked_partner_id"), // FK business_partners
  linkedBranchId: int("linked_branch_id"), // FK branches

  // Classe (Receita/Despesa/Ambos) - ✅ FASE 2: MEL-4
  // TODO: Descomentar após executar migration para adicionar coluna no banco
  // class: nvarchar("class", { length: 20 }).default("BOTH"), // 'REVENUE', 'EXPENSE', 'BOTH'

  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("cost_centers_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// --- PLANO DE CONTAS GERENCIAL (Dimensional) ---

export const chartOfAccounts = mssqlTable("chart_of_accounts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação Hierárquica
  code: nvarchar("code", { length: 50 }).notNull(), // Ex: "4.1.01.001"
  name: nvarchar("name", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }),
  
  // Tipo Contábil
  type: nvarchar("type", { length: 30 }).notNull(), // 'REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY'
  
  // Categoria Dimensional (Logística)
  category: nvarchar("category", { length: 50 }).notNull(), // 'OPERATIONAL_OWN_FLEET', 'OPERATIONAL_THIRD_PARTY', 'ADMINISTRATIVE', 'FINANCIAL', 'TAX', 'SALES'
  
  // Hierarquia
  parentId: int("parent_id"), // FK chart_of_accounts
  level: int("level").default(0),
  isAnalytical: nvarchar("is_analytical", { length: 10 }).default("false"),
  
  // Regras de Centro de Custo
  acceptsCostCenter: nvarchar("accepts_cost_center", { length: 10 }).default("false"),
  requiresCostCenter: nvarchar("requires_cost_center", { length: 10 }).default("false"),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("chart_of_accounts_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// ==========================================
// FISCAL - MATRIZ TRIBUTÁRIA (Expandida)
// ==========================================

export const taxMatrix = mssqlTable("tax_matrix", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Geografia
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),
  
  // ICMS
  icmsRate: decimal("icms_rate", { precision: 5, scale: 2 }).notNull(), // 12.00
  icmsStRate: decimal("icms_st_rate", { precision: 5, scale: 2 }), // ICMS-ST (se aplicável)
  icmsReduction: decimal("icms_reduction", { precision: 5, scale: 2 }).default("0.00"), // Redução de base
  fcpRate: decimal("fcp_rate", { precision: 5, scale: 2 }).default("0.00"), // Fundo de Combate à Pobreza
  
  // CFOP
  cfopInternal: nvarchar("cfop_internal", { length: 4 }), // 5353 (dentro do estado)
  cfopInterstate: nvarchar("cfop_interstate", { length: 4 }), // 6353 (fora do estado)
  
  // CST (Código de Situação Tributária)
  cst: nvarchar("cst", { length: 2 }).default("00"), // 00, 20, 40, 41, 51, 60, 90
  
  // Regime Tributário
  regime: nvarchar("regime", { length: 30 }).default("NORMAL"), // NORMAL, SIMPLES_NACIONAL
  
  // Vigência
  validFrom: datetime2("valid_from").notNull(),
  validTo: datetime2("valid_to"),
  
  // Observações
  notes: nvarchar("notes", { length: 500 }),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("tax_matrix_route_regime_org_idx")
    .on(table.originUf, table.destinationUf, table.regime, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// ==========================================
// COMERCIAL - NOVA ESTRUTURA DE PRICING
// ==========================================

// --- FREIGHT TABLE PRICES (Preços por Rota) ---

export const freightTablePrices = mssqlTable("freight_table_prices", {
  id: int("id").primaryKey().identity(),
  freightTableRouteId: int("freight_table_route_id").notNull(), // FK freight_table_routes
  
  // Faixa de Peso (ou Veículo)
  minWeight: decimal("min_weight", { precision: 18, scale: 2 }), // 0.00 kg
  maxWeight: decimal("max_weight", { precision: 18, scale: 2 }), // 10.00 kg
  vehicleTypeId: int("vehicle_type_id"), // FK vehicle_types (se cálculo for PER_VEHICLE_TYPE)
  
  // Preço
  price: decimal("price", { precision: 18, scale: 2 }).notNull(), // Preço da faixa ou do veículo
  excessPrice: decimal("excess_price", { precision: 18, scale: 2 }).default("0.00"), // Preço por kg excedente
  
  // Enterprise Base (Simplificado)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// --- FREIGHT GENERALITIES (Generalidades - Taxas Extras) ---

export const freightGeneralities = mssqlTable("freight_generalities", {
  id: int("id").primaryKey().identity(),
  freightTableId: int("freight_table_id").notNull(), // FK freight_tables
  
  // Identificação
  name: nvarchar("name", { length: 100 }).notNull(), // Ex: 'Ad Valorem', 'GRIS'
  code: nvarchar("code", { length: 50 }), // Código interno
  
  // Tipo de Cobrança
  type: nvarchar("type", { length: 30 }).notNull(), // 'PERCENTAGE', 'FIXED', 'PER_KG'
  
  // Valores
  value: decimal("value", { precision: 18, scale: 2 }).notNull(), // Ex: 0.30 (0,3%) ou 50.00 (R$)
  minValue: decimal("min_value", { precision: 18, scale: 2 }).default("0.00"),
  maxValue: decimal("max_value", { precision: 18, scale: 2 }),
  
  // Incidência
  incidence: nvarchar("incidence", { length: 30 }).default("ALWAYS"), // 'ALWAYS', 'ON_WEIGHT', 'ON_VALUE'
  
  // Ativo?
  isActive: nvarchar("is_active", { length: 10 }).default("true"),
  
  // Ordem de Aplicação
  applyOrder: int("apply_order").default(0),
  
  // Enterprise Base (Simplificado)
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// ==========================================
// COMERCIAL - TORRE DE CONTROLE
// ==========================================

// --- FREIGHT QUOTES (Cotações/Demandas) ---

export const freightQuotes = mssqlTable("freight_quotes", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Identificação
  quoteNumber: nvarchar("quote_number", { length: 20 }).notNull().unique(), // COT-2024-001
  
  // Cliente
  customerId: int("customer_id").notNull(), // FK business_partners
  contactName: nvarchar("contact_name", { length: 100 }),
  contactPhone: nvarchar("contact_phone", { length: 20 }),
  contactEmail: nvarchar("contact_email", { length: 100 }),
  
  // Origem/Destino
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  originCityId: int("origin_city_id"),
  originAddress: nvarchar("origin_address", { length: 500 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),
  destinationCityId: int("destination_city_id"),
  destinationAddress: nvarchar("destination_address", { length: 500 }),
  
  // Carga
  cargoDescription: nvarchar("cargo_description", { length: 500 }),
  weightKg: decimal("weight_kg", { precision: 18, scale: 2 }),
  volumeM3: decimal("volume_m3", { precision: 18, scale: 2 }),
  invoiceValue: decimal("invoice_value", { precision: 18, scale: 2 }),
  
  // Tipo de Serviço
  transportType: nvarchar("transport_type", { length: 20 }), // FTL, LTL
  serviceLevel: nvarchar("service_level", { length: 20 }), // NORMAL, EXPRESS
  
  // Datas
  pickupDate: datetime2("pickup_date"),
  deliveryDeadline: datetime2("delivery_deadline"),
  
  // Preços
  customerTargetPrice: decimal("customer_target_price", { precision: 18, scale: 2 }), // Preço que cliente quer
  calculatedPrice: decimal("calculated_price", { precision: 18, scale: 2 }), // Preço calculado
  quotedPrice: decimal("quoted_price", { precision: 18, scale: 2 }), // Preço final oferecido
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
  discountReason: nvarchar("discount_reason", { length: 200 }),
  
  // Breakdown (JSON)
  priceBreakdown: nvarchar("price_breakdown", { length: "max" }), // JSON com detalhamento
  
  // Status Comercial
  status: nvarchar("status", { length: 20 }).notNull().default("NEW"), // NEW, QUOTED, ACCEPTED, REJECTED, EXPIRED
  rejectionReason: nvarchar("rejection_reason", { length: 200 }),
  
  // Aprovação
  quotedBy: nvarchar("quoted_by", { length: 100 }),
  quotedAt: datetime2("quoted_at"),
  approvedBy: nvarchar("approved_by", { length: 100 }),
  approvedAt: datetime2("approved_at"),
  acceptedByCustomer: nvarchar("accepted_by_customer", { length: 100 }),
  acceptedAt: datetime2("accepted_at"),
  
  // Conversão
  pickupOrderId: int("pickup_order_id"), // FK pickup_orders
  
  // Observações
  notes: nvarchar("notes", { length: 1000 }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ==========================================
// TMS - PRÉ-OPERAÇÃO
// ==========================================

// --- PICKUP ORDERS (Ordens de Coleta) ---

export const pickupOrders = mssqlTable("pickup_orders", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Identificação
  orderNumber: nvarchar("order_number", { length: 20 }).notNull().unique(), // OC-2024-001
  
  // Origem (Cotação)
  quoteId: int("quote_id"), // FK freight_quotes
  
  // Cliente
  customerId: int("customer_id").notNull(),
  
  // Origem/Destino
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  originCityId: int("origin_city_id"),
  originAddress: nvarchar("origin_address", { length: 500 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),
  destinationCityId: int("destination_city_id"),
  destinationAddress: nvarchar("destination_address", { length: 500 }),
  
  // Carga
  cargoDescription: nvarchar("cargo_description", { length: 500 }),
  weightKg: decimal("weight_kg", { precision: 18, scale: 2 }),
  volumeM3: decimal("volume_m3", { precision: 18, scale: 2 }),
  invoiceValue: decimal("invoice_value", { precision: 18, scale: 2 }),
  
  // Preço Acordado
  agreedPrice: decimal("agreed_price", { precision: 18, scale: 2 }),
  
  // Alocação
  vehicleId: int("vehicle_id"), // FK vehicles
  driverId: int("driver_id"), // FK drivers
  allocatedAt: datetime2("allocated_at"),
  allocatedBy: nvarchar("allocated_by", { length: 100 }),
  
  // Agendamento
  scheduledPickupDate: datetime2("scheduled_pickup_date"),
  actualPickupDatetime: datetime2("actual_pickup_datetime"),
  
  // Seguro (OBRIGATÓRIO para CTe)
  insurancePolicy: nvarchar("insurance_policy", { length: 50 }), // Número da apólice
  insuranceCertificate: nvarchar("insurance_certificate", { length: 50 }), // Número da averbação
  insuranceCompany: nvarchar("insurance_company", { length: 200 }),
  
  // Status
  status: nvarchar("status", { length: 20 }).notNull().default("PENDING_ALLOCATION"), // PENDING_ALLOCATION, ALLOCATED, COLLECTED, CTE_ISSUED, CANCELLED
  
  // Conversão
  cteId: int("cte_id"), // FK cte_header
  tripId: int("trip_id"), // FK trips
  
  // Observações
  notes: nvarchar("notes", { length: 1000 }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ==========================================
// FISCAL - CTe (Conhecimento de Transporte Eletrônico)
// ==========================================

export const cteHeader = mssqlTable("cte_header", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Identificação
  cteNumber: int("cte_number").notNull(), // Número sequencial
  serie: nvarchar("serie", { length: 3 }).default("1"),
  model: nvarchar("model", { length: 2 }).default("57"), // Modelo 57 = CTe
  cteKey: nvarchar("cte_key", { length: 44 }), // Chave de acesso (44 dígitos)
  
  // Datas
  issueDate: datetime2("issue_date").notNull(),
  
  // Vinculação
  pickupOrderId: int("pickup_order_id"), // FK pickup_orders
  tripId: int("trip_id"), // FK trips
  
  // Partes Envolvidas
  senderId: int("sender_id"), // FK business_partners (Remetente)
  recipientId: int("recipient_id"), // FK business_partners (Destinatário)
  shipperId: int("shipper_id"), // FK business_partners (Expedidor)
  receiverId: int("receiver_id"), // FK business_partners (Recebedor)
  takerId: int("taker_id").notNull(), // FK business_partners (Tomador - quem paga)
  takerType: nvarchar("taker_type", { length: 20 }), // SENDER, RECIPIENT, OTHER
  
  // Origem/Destino
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  originCityId: int("origin_city_id"),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),
  destinationCityId: int("destination_city_id"),
  
  // Valores
  serviceValue: decimal("service_value", { precision: 18, scale: 2 }).notNull(), // Valor do frete
  cargoValue: decimal("cargo_value", { precision: 18, scale: 2 }), // Valor da mercadoria
  totalValue: decimal("total_value", { precision: 18, scale: 2 }).notNull(), // Valor total do CTe
  receivableValue: decimal("receivable_value", { precision: 18, scale: 2 }), // Valor a receber
  
  // ICMS
  icmsBase: decimal("icms_base", { precision: 18, scale: 2 }),
  icmsRate: decimal("icms_rate", { precision: 5, scale: 2 }),
  icmsValue: decimal("icms_value", { precision: 18, scale: 2 }),
  icmsReduction: decimal("icms_reduction", { precision: 5, scale: 2 }).default("0.00"),
  
  // Seguro (OBRIGATÓRIO)
  insurancePolicy: nvarchar("insurance_policy", { length: 50 }).notNull(),
  insuranceCertificate: nvarchar("insurance_certificate", { length: 50 }).notNull(),
  insuranceCompany: nvarchar("insurance_company", { length: 200 }),
  
  // Modal
  modal: nvarchar("modal", { length: 2 }).default("01"), // 01=Rodoviário
  
  // Status SEFAZ
  status: nvarchar("status", { length: 20 }).default("DRAFT"), // DRAFT, SIGNED, SENT, AUTHORIZED, REJECTED, CANCELLED
  protocolNumber: nvarchar("protocol_number", { length: 20 }),
  authorizationDate: datetime2("authorization_date"),
  cancellationDate: datetime2("cancellation_date"),
  cancellationReason: nvarchar("cancellation_reason", { length: 500 }),
  
  // XML
  xmlSigned: nvarchar("xml_signed", { length: "max" }),
  xmlAuthorized: nvarchar("xml_authorized", { length: "max" }),
  
  // Rejeição
  rejectionCode: nvarchar("rejection_code", { length: 10 }),
  rejectionMessage: nvarchar("rejection_message", { length: 500 }),
  
  // ✅ ORIGEM DO CTe (OPÇÃO A - Bloco 4: Multicte)
  cteOrigin: nvarchar("cte_origin", { length: 20 }).notNull().default("INTERNAL"),
  // 'INTERNAL' - Emitido pelo Aura Core
  // 'EXTERNAL' - Emitido por cliente (Multicte/bsoft)
  
  externalEmitter: nvarchar("external_emitter", { length: 255 }),
  // Ex: "Sistema Multicte - Unilever"
  
  importedAt: datetime2("imported_at"),
  // Data de importação (se CTe externo)
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// --- CTe: CARGO DOCUMENTS (Documentos Transportados) ---

export const cteCargoDocuments = mssqlTable("cte_cargo_documents", {
  id: int("id").primaryKey().identity(),
  cteHeaderId: int("cte_header_id").notNull(), // FK cte_header
  
  documentType: nvarchar("document_type", { length: 10 }).default("NFE"),
  documentKey: nvarchar("document_key", { length: 44 }),
  documentNumber: nvarchar("document_number", { length: 20 }),
  documentSerie: nvarchar("document_serie", { length: 3 }),
  documentDate: datetime2("document_date"),
  documentValue: decimal("document_value", { precision: 18, scale: 2 }),
  
  // ✅ RASTREABILIDADE (OPÇÃO A - Bloco 3)
  sourceInvoiceId: int("source_invoice_id").references(() => inboundInvoices.id),
  // Rastreabilidade: De qual NFe importada veio este documento
  
  sourceCargoId: int("source_cargo_id").references(() => cargoDocuments.id),
  // Rastreabilidade: De qual cargo do repositório veio este documento
  
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// --- CTe: VALUE COMPONENTS (Componentes de Valor) ---

export const cteValueComponents = mssqlTable("cte_value_components", {
  id: int("id").primaryKey().identity(),
  cteHeaderId: int("cte_header_id").notNull(), // FK cte_header
  
  componentName: nvarchar("component_name", { length: 50 }), // FRETE_PESO, AD_VALOREM, GRIS, etc.
  componentValue: decimal("component_value", { precision: 18, scale: 2 }),
  
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// ==========================================
// FISCAL - MDFe (Manifesto de Documentos Fiscais Eletrônicos)
// ==========================================

export const mdfeHeader = mssqlTable("mdfe_header", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Identificação
  mdfeNumber: int("mdfe_number").notNull(),
  serie: nvarchar("serie", { length: 3 }).default("1"),
  mdfeKey: nvarchar("mdfe_key", { length: 44 }),
  
  // Viagem
  tripId: int("trip_id"), // FK trips
  vehicleId: int("vehicle_id").notNull(), // FK vehicles
  driverId: int("driver_id").notNull(), // FK drivers
  
  // Percurso
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),
  route: nvarchar("route", { length: "max" }), // JSON: ["SP", "RJ", "MG"]
  
  // CIOT (Obrigatório para terceiros)
  ciotNumber: nvarchar("ciot_number", { length: 50 }),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("DRAFT"), // DRAFT, AUTHORIZED, CLOSED, CANCELLED
  issueDate: datetime2("issue_date").notNull(),
  closeDate: datetime2("close_date"),
  
  // SEFAZ
  protocolNumber: nvarchar("protocol_number", { length: 20 }),
  authorizationDate: datetime2("authorization_date"),
  xmlSigned: nvarchar("xml_signed", { length: "max" }),
  xmlAuthorized: nvarchar("xml_authorized", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// --- MDFe: DOCUMENTS (CTes vinculados) ---

export const mdfeDocuments = mssqlTable("mdfe_documents", {
  id: int("id").primaryKey().identity(),
  mdfeHeaderId: int("mdfe_header_id").notNull(), // FK mdfe_header
  cteHeaderId: int("cte_header_id").notNull(), // FK cte_header
  
  createdAt: datetime2("created_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// ==========================================
// TMS - OPERAÇÃO (Viagens)
// ==========================================

export const trips = mssqlTable("trips", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Identificação
  tripNumber: nvarchar("trip_number", { length: 20 }).notNull().unique(), // VIA-2024-001
  
  // Origem (Ordens de Coleta)
  pickupOrderIds: nvarchar("pickup_order_ids", { length: "max" }), // JSON array: [123, 456]
  
  // Alocação
  vehicleId: int("vehicle_id").notNull(),
  driverId: int("driver_id").notNull(),
  driverType: nvarchar("driver_type", { length: 20 }), // OWN, THIRD_PARTY, AGGREGATE
  trailer1Id: int("trailer_1_id"), // FK vehicles (Reboque 1)
  trailer2Id: int("trailer_2_id"), // FK vehicles (Reboque 2)
  
  // Datas
  scheduledStart: datetime2("scheduled_start"),
  actualStart: datetime2("actual_start"),
  scheduledEnd: datetime2("scheduled_end"),
  actualEnd: datetime2("actual_end"),
  
  // Fiscal
  mdfeId: int("mdfe_id"), // FK mdfe_header
  mdfeStatus: nvarchar("mdfe_status", { length: 20 }), // PENDING, AUTHORIZED, CLOSED
  
  // CIOT (Obrigatório para terceiros)
  requiresCiot: nvarchar("requires_ciot", { length: 10 }).default("false"),
  ciotNumber: nvarchar("ciot_number", { length: 50 }),
  ciotValue: decimal("ciot_value", { precision: 18, scale: 2 }),
  ciotIssuedAt: datetime2("ciot_issued_at"),
  
  // Status
  status: nvarchar("status", { length: 20 }).notNull().default("DRAFT"), // DRAFT, ALLOCATED, IN_TRANSIT, COMPLETED, CANCELLED
  
  // Financeiro
  estimatedRevenue: decimal("estimated_revenue", { precision: 18, scale: 2 }),
  actualRevenue: decimal("actual_revenue", { precision: 18, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 18, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 18, scale: 2 }),
  
  // Observações
  notes: nvarchar("notes", { length: 1000 }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// --- TRIPS: CHECKPOINTS (Timeline de Eventos) ---

export const tripCheckpoints = mssqlTable("trip_checkpoints", {
  id: int("id").primaryKey().identity(),
  tripId: int("trip_id").notNull(),
  
  checkpointType: nvarchar("checkpoint_type", { length: 50 }).notNull(),
  // 'ORDER_CREATED', 'PICKED', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'ISSUE'
  
  description: nvarchar("description", { length: 500 }),
  
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  locationAddress: nvarchar("location_address", { length: 500 }),
  
  recordedAt: datetime2("recorded_at").notNull(),
  recordedBy: nvarchar("recorded_by", { length: 255 }),
  
  createdAt: datetime2("created_at").default(new Date()),
});

// --- TRIPS: STOPS (Paradas de Coleta/Entrega) ---

export const tripStops = mssqlTable("trip_stops", {
  id: int("id").primaryKey().identity(),
  tripId: int("trip_id").notNull(), // FK trips
  
  stopType: nvarchar("stop_type", { length: 20 }).notNull(), // PICKUP, DELIVERY
  sequence: int("sequence").notNull(), // Ordem da parada
  
  // Local
  businessPartnerId: int("business_partner_id"),
  address: nvarchar("address", { length: 500 }),
  cityId: int("city_id"),
  uf: nvarchar("uf", { length: 2 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Agendamento
  scheduledDatetime: datetime2("scheduled_datetime"),
  actualArrival: datetime2("actual_arrival"),
  actualDeparture: datetime2("actual_departure"),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("PENDING"), // PENDING, ARRIVED, IN_PROGRESS, COMPLETED
  
  // Comprovante
  proofPhotoUrl: nvarchar("proof_photo_url", { length: 500 }),
  signatureUrl: nvarchar("signature_url", { length: 500 }),
  notes: nvarchar("notes", { length: 500 }),
  
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// --- TRIPS: DOCUMENTS (CTes vinculados à viagem) ---

export const tripDocuments = mssqlTable("trip_documents", {
  id: int("id").primaryKey().identity(),
  tripId: int("trip_id").notNull(), // FK trips
  tripStopId: int("trip_stop_id"), // FK trip_stops (qual parada é relativa)
  
  documentType: nvarchar("document_type", { length: 10 }).default("CTE"),
  cteId: int("cte_id"), // FK cte_header
  
  createdAt: datetime2("created_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

// ==========================================
// ✅ CARGO DOCUMENTS (REPOSITÓRIO DE CARGAS)
// OPÇÃO A - Bloco 2
// ==========================================

/**
 * 📦 CARGO DOCUMENTS (Repositório de Cargas)
 * 
 * Tabela intermediária para gerenciar NFes de carga (clientes).
 * Workflow: NFe importada → Classificada como CARGO → Entra aqui → 
 *           Operador aloca em viagem → Gera CTe → Entrega
 * 
 * Status workflow:
 * PENDING           - Aguardando alocação em viagem
 * ASSIGNED_TO_TRIP  - Vinculada a viagem, aguarda CTe
 * IN_TRANSIT        - CTe emitido, em trânsito
 * DELIVERED         - Entregue
 * CANCELED          - Cancelada
 */
export const cargoDocuments = mssqlTable("cargo_documents", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // ✅ Vínculo com NFe Original
  nfeInvoiceId: int("nfe_invoice_id").references(() => inboundInvoices.id),
  
  // ✅ Dados Resumidos da Carga (cache para performance)
  accessKey: nvarchar("access_key", { length: 44 }).notNull(),
  nfeNumber: nvarchar("nfe_number", { length: 20 }),
  nfeSeries: nvarchar("nfe_series", { length: 10 }),
  
  issuerCnpj: nvarchar("issuer_cnpj", { length: 14 }).notNull(),
  issuerName: nvarchar("issuer_name", { length: 255 }).notNull(),
  
  recipientCnpj: nvarchar("recipient_cnpj", { length: 14 }).notNull(),
  recipientName: nvarchar("recipient_name", { length: 255 }).notNull(),
  
  // ✅ Rota (para agrupar por região)
  originUf: nvarchar("origin_uf", { length: 2 }),
  originCity: nvarchar("origin_city", { length: 100 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }),
  destinationCity: nvarchar("destination_city", { length: 100 }),
  
  // ✅ Valores
  cargoValue: decimal("cargo_value", { precision: 18, scale: 2 }),
  weight: decimal("weight", { precision: 10, scale: 3 }),
  volume: decimal("volume", { precision: 10, scale: 3 }),
  
  // ✅ Status no Workflow
  status: nvarchar("status", { length: 20 }).notNull().default("PENDING"),
  
  // ✅ Prazo
  issueDate: datetime2("issue_date").notNull(),
  deliveryDeadline: datetime2("delivery_deadline"),
  
  // ✅ Vínculos TMS/Fiscal
  tripId: int("trip_id").references(() => trips.id),
  cteId: int("cte_id").references(() => cteHeader.id),
  
  // ✅ Flag CTe Externo (Multicte) - Bloco 4
  hasExternalCte: nvarchar("has_external_cte", { length: 1 }).default("N"),
  // 'S' = Cliente já emitiu CTe (Multicte/bsoft)
  // 'N' = TCL precisa emitir CTe
  
  // ✅ Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ==========================================
// 📊 BILLING (FATURAMENTO AGRUPADO)
// SPRINT 2
// ==========================================

/**
 * 💰 BILLING INVOICES (Faturas Agrupadas)
 * 
 * Agrupa múltiplos CTes em uma única fatura para grandes clientes.
 * 
 * Workflow:
 * 1. Período fecha (semanal/quinzenal/mensal)
 * 2. Sistema agrupa CTes autorizados do cliente
 * 3. Gera fatura consolidada
 * 4. Cria título no Contas a Receber
 * 5. Gera boleto bancário
 */
export const billingInvoices = mssqlTable("billing_invoices", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Identificação
  invoiceNumber: nvarchar("invoice_number", { length: 50 }).notNull(),
  
  // Cliente
  customerId: int("customer_id").notNull().references(() => businessPartners.id),
  
  // Período
  periodStart: datetime2("period_start").notNull(),
  periodEnd: datetime2("period_end").notNull(),
  
  // Frequência
  billingFrequency: nvarchar("billing_frequency", { length: 20 }).notNull(),
  
  // Valores
  totalCtes: int("total_ctes").notNull(),
  grossValue: decimal("gross_value", { precision: 18, scale: 2 }).notNull(),
  discountValue: decimal("discount_value", { precision: 18, scale: 2 }).default("0.00"),
  netValue: decimal("net_value", { precision: 18, scale: 2 }).notNull(),
  
  // Vencimento
  issueDate: datetime2("issue_date").notNull(),
  dueDate: datetime2("due_date").notNull(),
  
  // Status
  status: nvarchar("status", { length: 20 }).notNull().default("DRAFT"),
  
  // Integração Financeira
  accountsReceivableId: int("accounts_receivable_id"),
  
  // Boleto
  barcodeNumber: nvarchar("barcode_number", { length: 54 }),
  pixKey: nvarchar("pix_key", { length: 500 }),
  
  // Documentos
  pdfUrl: nvarchar("pdf_url", { length: 500 }),
  
  // Envio
  sentAt: datetime2("sent_at"),
  sentTo: nvarchar("sent_to", { length: 255 }),
  
  // Observações
  notes: nvarchar("notes", { length: "max" }),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

export const billingItems = mssqlTable("billing_items", {
  id: int("id").primaryKey().identity(),
  
  billingInvoiceId: int("billing_invoice_id").notNull().references(() => billingInvoices.id, { onDelete: "cascade" }),
  cteId: int("cte_id").notNull().references(() => cteHeader.id),
  
  // Cache
  cteNumber: int("cte_number").notNull(),
  cteSeries: nvarchar("cte_series", { length: 3 }),
  cteKey: nvarchar("cte_key", { length: 44 }),
  cteIssueDate: datetime2("cte_issue_date").notNull(),
  cteValue: decimal("cte_value", { precision: 18, scale: 2 }).notNull(),
  
  originUf: nvarchar("origin_uf", { length: 2 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }),
  
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 📄 FLEET DOCUMENTATION
// SPRINT 3
// ==========================================

export const vehicleDocuments = mssqlTable("vehicle_documents", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  vehicleId: int("vehicle_id").notNull(),
  documentType: nvarchar("document_type", { length: 50 }).notNull(),
  documentNumber: nvarchar("document_number", { length: 100 }),
  issueDate: datetime2("issue_date"),
  expiryDate: datetime2("expiry_date").notNull(),
  insuranceCompany: nvarchar("insurance_company", { length: 255 }),
  policyNumber: nvarchar("policy_number", { length: 100 }),
  insuredValue: decimal("insured_value", { precision: 18, scale: 2 }),
  fileUrl: nvarchar("file_url", { length: 500 }),
  status: nvarchar("status", { length: 20 }).default("VALID"),
  alertSentAt: datetime2("alert_sent_at"),
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

export const driverDocuments = mssqlTable("driver_documents", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  driverId: int("driver_id").notNull(),
  documentType: nvarchar("document_type", { length: 50 }).notNull(),
  documentNumber: nvarchar("document_number", { length: 100 }),
  issueDate: datetime2("issue_date"),
  expiryDate: datetime2("expiry_date").notNull(),
  cnhCategory: nvarchar("cnh_category", { length: 5 }),
  fileUrl: nvarchar("file_url", { length: 500 }),
  status: nvarchar("status", { length: 20 }).default("VALID"),
  alertSentAt: datetime2("alert_sent_at"),
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

export const tripOccurrences = mssqlTable("trip_occurrences", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  tripId: int("trip_id").notNull(),
  occurrenceType: nvarchar("occurrence_type", { length: 50 }).notNull(),
  severity: nvarchar("severity", { length: 20 }).notNull(),
  title: nvarchar("title", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  address: nvarchar("address", { length: 500 }),
  photosUrls: nvarchar("photos_urls", { length: "max" }),
  documentsUrls: nvarchar("documents_urls", { length: "max" }),
  responsibleParty: nvarchar("responsible_party", { length: 50 }),
  actionsTaken: nvarchar("actions_taken", { length: "max" }),
  estimatedLoss: decimal("estimated_loss", { precision: 18, scale: 2 }),
  insuranceClaim: nvarchar("insurance_claim", { length: 1 }).default("N"),
  insuranceClaimNumber: nvarchar("insurance_claim_number", { length: 100 }),
  status: nvarchar("status", { length: 20 }).default("OPEN"),
  resolvedAt: datetime2("resolved_at"),
  resolutionNotes: nvarchar("resolution_notes", { length: "max" }),
  clientNotified: nvarchar("client_notified", { length: 1 }).default("N"),
  clientNotifiedAt: datetime2("client_notified_at"),
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

export const taxCredits = mssqlTable("tax_credits", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  invoiceId: int("invoice_id").notNull(),
  taxType: nvarchar("tax_type", { length: 20 }).notNull(),
  taxBase: decimal("tax_base", { precision: 18, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  taxValue: decimal("tax_value", { precision: 18, scale: 2 }).notNull(),
  isRecoverable: nvarchar("is_recoverable", { length: 1 }).default("S"),
  recoverabilityReason: nvarchar("recoverability_reason", { length: 500 }),
  recoveredAt: datetime2("recovered_at"),
  recoveredInPeriod: nvarchar("recovered_in_period", { length: 7 }),
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ==========================================
// 📄 CTe INUTILIZAÇÃO
// ==========================================

export const cteInutilization = mssqlTable("cte_inutilization", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  serie: nvarchar("serie", { length: 3 }).notNull(),
  numberFrom: int("number_from").notNull(),
  numberTo: int("number_to").notNull(),
  year: int("year").notNull(),
  justification: nvarchar("justification", { length: 500 }).notNull(),
  
  // Sefaz
  protocolNumber: nvarchar("protocol_number", { length: 20 }),
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  sefazReturnMessage: nvarchar("sefaz_return_message", { length: 500 }),
  
  inutilizedAt: datetime2("inutilized_at"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 📄 CTe CARTA DE CORREÇÃO (CCe)
// ==========================================

export const cteCorrectionLetters = mssqlTable("cte_correction_letters", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  cteHeaderId: int("cte_header_id").notNull(),
  
  sequenceNumber: int("sequence_number").notNull(), // Pode haver múltiplas CCe
  corrections: nvarchar("corrections", { length: "max" }).notNull(), // JSON
  
  // Sefaz
  protocolNumber: nvarchar("protocol_number", { length: 20 }),
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  sefazReturnMessage: nvarchar("sefaz_return_message", { length: 500 }),
  
  xmlEvent: nvarchar("xml_event", { length: "max" }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 🎯 CRM COMERCIAL (ONDA 3)
// ==========================================

export const crmLeads = mssqlTable("crm_leads", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  companyName: nvarchar("company_name", { length: 255 }).notNull(),
  cnpj: nvarchar("cnpj", { length: 18 }),
  contactName: nvarchar("contact_name", { length: 255 }),
  contactEmail: nvarchar("contact_email", { length: 255 }),
  contactPhone: nvarchar("contact_phone", { length: 20 }),
  
  segment: nvarchar("segment", { length: 50 }),
  source: nvarchar("source", { length: 50 }),
  
  stage: nvarchar("stage", { length: 50 }).notNull().default("PROSPECTING"),
  score: int("score").default(0),
  
  estimatedValue: decimal("estimated_value", { precision: 18, scale: 2 }),
  estimatedMonthlyShipments: int("estimated_monthly_shipments"),
  expectedCloseDate: datetime2("expected_close_date"),
  probability: int("probability"),
  
  ownerId: nvarchar("owner_id", { length: 255 }).notNull(),
  
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  lostReason: nvarchar("lost_reason", { length: 500 }),
  wonDate: datetime2("won_date"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

export const crmActivities = mssqlTable("crm_activities", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  leadId: int("lead_id"),
  partnerId: int("partner_id"),
  
  type: nvarchar("type", { length: 50 }).notNull(),
  subject: nvarchar("subject", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }),
  
  scheduledAt: datetime2("scheduled_at"),
  completedAt: datetime2("completed_at"),
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  
  assignedTo: nvarchar("assigned_to", { length: 255 }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

export const commercialProposals = mssqlTable("commercial_proposals", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  proposalNumber: nvarchar("proposal_number", { length: 20 }).notNull(),
  leadId: int("lead_id"),
  partnerId: int("partner_id"),
  
  status: nvarchar("status", { length: 20 }).default("DRAFT"),
  
  routes: nvarchar("routes", { length: "max" }),
  prices: nvarchar("prices", { length: "max" }),
  conditions: nvarchar("conditions", { length: "max" }),
  validityDays: int("validity_days").default(15),
  
  pdfUrl: nvarchar("pdf_url", { length: 500 }),
  
  sentAt: datetime2("sent_at"),
  sentToEmail: nvarchar("sent_to_email", { length: 255 }),
  
  acceptedAt: datetime2("accepted_at"),
  rejectedAt: datetime2("rejected_at"),
  rejectionReason: nvarchar("rejection_reason", { length: 500 }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 🚗 GESTÃO DE PNEUS (ONDA 4.1)
// ==========================================

export const tires = mssqlTable("tires", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  serialNumber: nvarchar("serial_number", { length: 50 }).notNull(),
  brandId: int("brand_id"),
  model: nvarchar("model", { length: 100 }),
  size: nvarchar("size", { length: 20 }),
  
  purchaseDate: datetime2("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 18, scale: 2 }),
  
  status: nvarchar("status", { length: 20 }).default("STOCK"),
  
  currentVehicleId: int("current_vehicle_id"),
  position: nvarchar("position", { length: 20 }),
  
  initialMileage: int("initial_mileage"),
  currentMileage: int("current_mileage"),
  totalKmUsed: int("total_km_used"),
  
  recappingCount: int("recapping_count").default(0),
  
  createdAt: datetime2("created_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

export const tireMovements = mssqlTable("tire_movements", {
  id: int("id").primaryKey().identity(),
  tireId: int("tire_id").notNull(),
  
  movementType: nvarchar("movement_type", { length: 20 }).notNull(),
  
  fromVehicleId: int("from_vehicle_id"),
  fromPosition: nvarchar("from_position", { length: 20 }),
  toVehicleId: int("to_vehicle_id"),
  toPosition: nvarchar("to_position", { length: 20 }),
  
  mileageAtMovement: int("mileage_at_movement"),
  
  notes: nvarchar("notes", { length: 500 }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

export const fuelTransactions = mssqlTable("fuel_transactions", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  vehicleId: int("vehicle_id").notNull(),
  driverId: int("driver_id"),
  
  transactionDate: datetime2("transaction_date").notNull(),
  
  fuelType: nvarchar("fuel_type", { length: 20 }),
  liters: decimal("liters", { precision: 10, scale: 2 }).notNull(),
  pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }),
  totalValue: decimal("total_value", { precision: 18, scale: 2 }).notNull(),
  
  odometer: int("odometer"),
  
  stationName: nvarchar("station_name", { length: 255 }),
  stationCnpj: nvarchar("station_cnpj", { length: 18 }),
  
  source: nvarchar("source", { length: 20 }),
  nfeKey: nvarchar("nfe_key", { length: 44 }),
  
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 👨‍🔧 JORNADA MOTORISTA (ONDA 5.1)
// ==========================================

export const driverWorkShifts = mssqlTable("driver_work_shifts", {
  id: int("id").primaryKey().identity(),
  driverId: int("driver_id").notNull(),
  tripId: int("trip_id"),
  
  shiftDate: datetime2("shift_date").notNull(),
  
  startedAt: datetime2("started_at"),
  endedAt: datetime2("ended_at"),
  
  totalDrivingHours: decimal("total_driving_hours", { precision: 5, scale: 2 }),
  totalRestHours: decimal("total_rest_hours", { precision: 5, scale: 2 }),
  totalWaitingHours: decimal("total_waiting_hours", { precision: 5, scale: 2 }),
  
  status: nvarchar("status", { length: 20 }).default("IN_PROGRESS"),
  
  violations: nvarchar("violations", { length: "max" }),
  
  createdAt: datetime2("created_at").default(new Date()),
});

export const driverShiftEvents = mssqlTable("driver_shift_events", {
  id: int("id").primaryKey().identity(),
  workShiftId: int("work_shift_id").notNull(),
  
  eventType: nvarchar("event_type", { length: 20 }).notNull(),
  
  eventTime: datetime2("event_time").notNull(),
  
  source: nvarchar("source", { length: 20 }).default("MANUAL"),
  
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 📦 WMS (ONDA 6)
// ==========================================

export const warehouseZones = mssqlTable("warehouse_zones", {
  id: int("id").primaryKey().identity(),
  warehouseId: int("warehouse_id").notNull(),
  zoneName: nvarchar("zone_name", { length: 100 }).notNull(),
  zoneType: nvarchar("zone_type", { length: 20 }),
  createdAt: datetime2("created_at").default(new Date()),
});

export const warehouseLocations = mssqlTable("warehouse_locations", {
  id: int("id").primaryKey().identity(),
  zoneId: int("zone_id").notNull(),
  
  code: nvarchar("code", { length: 20 }).notNull(),
  
  locationType: nvarchar("location_type", { length: 20 }),
  maxWeightKg: decimal("max_weight_kg", { precision: 10, scale: 2 }),
  
  status: nvarchar("status", { length: 20 }).default("AVAILABLE"),
  
  createdAt: datetime2("created_at").default(new Date()),
});

export const stockLocations = mssqlTable("stock_locations", {
  id: int("id").primaryKey().identity(),
  locationId: int("location_id").notNull(),
  productId: int("product_id").notNull(),
  
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  lotNumber: nvarchar("lot_number", { length: 50 }),
  expiryDate: datetime2("expiry_date"),
  
  receivedAt: datetime2("received_at"),
});

export const warehouseMovements = mssqlTable("warehouse_movements", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  movementType: nvarchar("movement_type", { length: 20 }).notNull(),
  
  productId: int("product_id").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  
  fromLocationId: int("from_location_id"),
  toLocationId: int("to_location_id"),
  
  referenceType: nvarchar("reference_type", { length: 50 }),
  referenceId: int("reference_id"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 💰 CONCILIAÇÃO BANCÁRIA (ONDA 2.3)
// ==========================================

export const bankTransactions = mssqlTable("bank_transactions", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  bankAccountId: int("bank_account_id").notNull(),
  
  transactionDate: datetime2("transaction_date").notNull(),
  description: nvarchar("description", { length: 500 }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 18, scale: 2 }),
  
  transactionType: nvarchar("transaction_type", { length: 20 }),
  
  // Conciliação
  reconciled: nvarchar("reconciled", { length: 1 }).default("N"),
  reconciledAt: datetime2("reconciled_at"),
  reconciledBy: nvarchar("reconciled_by", { length: 255 }),
  
  accountsPayableId: int("accounts_payable_id"),
  accountsReceivableId: int("accounts_receivable_id"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
});

// ==========================================
// 🔧 PLANO DE MANUTENÇÃO (ONDA 4.2)
// ==========================================

export const vehicleMaintenancePlans = mssqlTable("vehicle_maintenance_plans", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  vehicleModel: nvarchar("vehicle_model", { length: 100 }),
  
  serviceName: nvarchar("service_name", { length: 255 }).notNull(),
  serviceDescription: nvarchar("service_description", { length: 500 }),
  
  triggerType: nvarchar("trigger_type", { length: 20 }).notNull(),
  
  mileageInterval: int("mileage_interval"),
  timeIntervalMonths: int("time_interval_months"),
  
  advanceWarningKm: int("advance_warning_km"),
  advanceWarningDays: int("advance_warning_days"),
  
  isActive: nvarchar("is_active", { length: 1 }).default("S"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
});

export const maintenanceAlerts = mssqlTable("maintenance_alerts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  vehicleId: int("vehicle_id").notNull(),
  maintenancePlanId: int("maintenance_plan_id").notNull(),
  
  alertType: nvarchar("alert_type", { length: 20 }).notNull(),
  alertMessage: nvarchar("alert_message", { length: 500 }).notNull(),
  
  currentOdometer: int("current_odometer"),
  nextServiceOdometer: int("next_service_odometer"),
  
  currentCheckDate: datetime2("current_check_date"),
  nextServiceDate: datetime2("next_service_date"),
  
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  dismissedAt: datetime2("dismissed_at"),
  dismissedBy: nvarchar("dismissed_by", { length: 255 }),
  
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 🛠️ ORDENS DE SERVIÇO (ONDA 4.4)
// ==========================================

export const mechanics = mssqlTable("mechanics", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  name: nvarchar("name", { length: 255 }).notNull(),
  specialty: nvarchar("specialty", { length: 100 }),
  
  hourlyRate: decimal("hourly_rate", { precision: 18, scale: 2 }),
  
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

export const maintenanceProviders = mssqlTable("maintenance_providers", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  name: nvarchar("name", { length: 255 }).notNull(),
  cnpj: nvarchar("cnpj", { length: 18 }),
  contactName: nvarchar("contact_name", { length: 255 }),
  phone: nvarchar("phone", { length: 20 }),
  
  specialty: nvarchar("specialty", { length: 100 }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

export const maintenanceWorkOrders = mssqlTable("maintenance_work_orders", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  woNumber: nvarchar("wo_number", { length: 20 }).notNull(),
  
  vehicleId: int("vehicle_id").notNull(),
  
  woType: nvarchar("wo_type", { length: 20 }).notNull(),
  
  priority: nvarchar("priority", { length: 20 }).default("NORMAL"),
  
  reportedByDriverId: int("reported_by_driver_id"),
  reportedIssue: nvarchar("reported_issue", { length: 500 }),
  
  odometer: int("odometer"),
  
  status: nvarchar("status", { length: 20 }).default("OPEN"),
  
  providerType: nvarchar("provider_type", { length: 20 }),
  providerId: int("provider_id"),
  
  openedAt: datetime2("opened_at").default(new Date()),
  startedAt: datetime2("started_at"),
  completedAt: datetime2("completed_at"),
  
  totalLaborCost: decimal("total_labor_cost", { precision: 18, scale: 2 }),
  totalPartsCost: decimal("total_parts_cost", { precision: 18, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 18, scale: 2 }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
});

export const workOrderItems = mssqlTable("work_order_items", {
  id: int("id").primaryKey().identity(),
  workOrderId: int("work_order_id").notNull(),
  
  itemType: nvarchar("item_type", { length: 20 }).notNull(),
  
  productId: int("product_id"),
  serviceDescription: nvarchar("service_description", { length: 255 }),
  
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 18, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 18, scale: 2 }),
  
  createdAt: datetime2("created_at").default(new Date()),
});

export const workOrderMechanics = mssqlTable("work_order_mechanics", {
  id: int("id").primaryKey().identity(),
  workOrderId: int("work_order_id").notNull(),
  mechanicId: int("mechanic_id").notNull(),
  
  assignedAt: datetime2("assigned_at").default(new Date()),
  startedAt: datetime2("started_at"),
  completedAt: datetime2("completed_at"),
  
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 18, scale: 2 }),
  
  notes: nvarchar("notes", { length: 500 }),
});

// ==========================================
// 📜 MANIFESTAÇÃO NFE (ONDA 5.2)
// ==========================================

export const nfeManifestationEvents = mssqlTable("nfe_manifestation_events", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  inboundInvoiceId: int("inbound_invoice_id").notNull(),
  
  eventType: nvarchar("event_type", { length: 10 }).notNull(),
  eventDescription: nvarchar("event_description", { length: 100 }),
  justification: nvarchar("justification", { length: 500 }),
  
  protocolNumber: nvarchar("protocol_number", { length: 20 }),
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  sefazReturnCode: nvarchar("sefaz_return_code", { length: 10 }),
  sefazReturnMessage: nvarchar("sefaz_return_message", { length: 500 }),
  
  sentAt: datetime2("sent_at"),
  confirmedAt: datetime2("confirmed_at"),
  
  xmlEvent: nvarchar("xml_event", { length: "max" }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
});

// ==========================================
// 📐 CONVERSÃO DE UNIDADE (ONDA 5.3)
// ==========================================

export const productUnitConversions = mssqlTable("product_unit_conversions", {
  id: int("id").primaryKey().identity(),
  productId: int("product_id").notNull(),
  
  fromUnit: nvarchar("from_unit", { length: 10 }).notNull(),
  toUnit: nvarchar("to_unit", { length: 10 }).notNull(),
  factor: decimal("factor", { precision: 10, scale: 4 }).notNull(),
  
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// 📦 INVENTÁRIO WMS (ONDA 6.3)
// ==========================================

export const warehouseInventoryCounts = mssqlTable("warehouse_inventory_counts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  warehouseId: int("warehouse_id").notNull(),
  
  countNumber: nvarchar("count_number", { length: 20 }).notNull(),
  countDate: datetime2("count_date").notNull(),
  
  countType: nvarchar("count_type", { length: 20 }).notNull(),
  
  status: nvarchar("status", { length: 20 }).default("IN_PROGRESS"),
  
  notes: nvarchar("notes", { length: 500 }),
  
  startedBy: nvarchar("started_by", { length: 255 }).notNull(),
  startedAt: datetime2("started_at").default(new Date()),
  completedAt: datetime2("completed_at"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
});

export const inventoryCountItems = mssqlTable("inventory_count_items", {
  id: int("id").primaryKey().identity(),
  countId: int("count_id").notNull(),
  
  locationId: int("location_id"),
  productId: int("product_id").notNull(),
  
  systemQuantity: decimal("system_quantity", { precision: 18, scale: 4 }),
  countedQuantity: decimal("counted_quantity", { precision: 18, scale: 4 }),
  difference: decimal("difference", { precision: 18, scale: 4 }),
  
  lotNumber: nvarchar("lot_number", { length: 50 }),
  expiryDate: datetime2("expiry_date"),
  
  countedBy: nvarchar("counted_by", { length: 255 }),
  countedAt: datetime2("counted_at"),
  
  notes: nvarchar("notes", { length: 500 }),
  
  createdAt: datetime2("created_at").default(new Date()),
});

export const inventoryAdjustments = mssqlTable("inventory_adjustments", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  countId: int("count_id"),
  
  adjustmentNumber: nvarchar("adjustment_number", { length: 20 }).notNull(),
  adjustmentDate: datetime2("adjustment_date").notNull(),
  
  productId: int("product_id").notNull(),
  locationId: int("location_id"),
  
  quantityBefore: decimal("quantity_before", { precision: 18, scale: 4 }),
  quantityAdjusted: decimal("quantity_adjusted", { precision: 18, scale: 4 }),
  quantityAfter: decimal("quantity_after", { precision: 18, scale: 4 }),
  
  reason: nvarchar("reason", { length: 20 }).notNull(),
  
  notes: nvarchar("notes", { length: 500 }),
  
  approvedBy: nvarchar("approved_by", { length: 255 }),
  approvedAt: datetime2("approved_at"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// ⚙️ CONFIGURAÇÕES FISCAIS
// ==========================================

export const fiscalSettings = mssqlTable("fiscal_settings", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Ambiente NFe (Importação Sefaz)
  nfeEnvironment: nvarchar("nfe_environment", { length: 20 }).notNull().default("production"),
  // "production" ou "homologacao"
  
  // Ambiente CTe (Emissão)
  cteEnvironment: nvarchar("cte_environment", { length: 20 }).notNull().default("homologacao"),
  // "production" ou "homologacao"
  
  // Série CTe
  cteSeries: nvarchar("cte_series", { length: 3 }).default("1"),
  
  // Importação Automática
  autoImportEnabled: nvarchar("auto_import_enabled", { length: 1 }).default("S"),
  // "S" = Ativo, "N" = Desativado
  autoImportInterval: int("auto_import_interval").default(1),
  // Intervalo em horas (1, 2, 4, 6, 12, 24)
  lastAutoImport: datetime2("last_auto_import"),
  // Última importação automática
  
  // Empresa de auditoria
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  version: int("version").default(1).notNull(),
});

// ==========================================
// 🏦 BTG PACTUAL INTEGRATION
// ==========================================

// Boletos BTG
export const btgBoletos = mssqlTable("btg_boletos", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Identificação
  nossoNumero: nvarchar("nosso_numero", { length: 20 }).notNull(),
  seuNumero: nvarchar("seu_numero", { length: 20 }),
  
  // Pagador
  customerId: int("customer_id"),
  payerName: nvarchar("payer_name", { length: 255 }).notNull(),
  payerDocument: nvarchar("payer_document", { length: 18 }).notNull(),
  
  // Valores
  valorNominal: decimal("valor_nominal", { precision: 18, scale: 2 }).notNull(),
  valorDesconto: decimal("valor_desconto", { precision: 18, scale: 2 }),
  valorMulta: decimal("valor_multa", { precision: 18, scale: 2 }),
  valorJuros: decimal("valor_juros", { precision: 18, scale: 2 }),
  valorPago: decimal("valor_pago", { precision: 18, scale: 2 }),
  
  // Datas
  dataEmissao: datetime2("data_emissao").notNull(),
  dataVencimento: datetime2("data_vencimento").notNull(),
  dataPagamento: datetime2("data_pagamento"),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  
  // Dados BTG
  btgId: nvarchar("btg_id", { length: 50 }),
  linhaDigitavel: nvarchar("linha_digitavel", { length: 100 }),
  codigoBarras: nvarchar("codigo_barras", { length: 100 }),
  pdfUrl: nvarchar("pdf_url", { length: 500 }),
  
  // Vinculação
  accountsReceivableId: int("accounts_receivable_id"),
  billingInvoiceId: int("billing_invoice_id"),
  
  // Webhook
  webhookReceivedAt: datetime2("webhook_received_at"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
});

// Pix Cobranças BTG
export const btgPixCharges = mssqlTable("btg_pix_charges", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  txid: nvarchar("txid", { length: 50 }).notNull(),
  
  // Pagador
  customerId: int("customer_id"),
  payerName: nvarchar("payer_name", { length: 255 }),
  payerDocument: nvarchar("payer_document", { length: 18 }),
  
  // Cobrança
  valor: decimal("valor", { precision: 18, scale: 2 }).notNull(),
  chavePix: nvarchar("chave_pix", { length: 100 }),
  
  // QR Code
  qrCode: nvarchar("qr_code", { length: "max" }),
  qrCodeImageUrl: nvarchar("qr_code_image_url", { length: 500 }),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Datas
  dataCriacao: datetime2("data_criacao").default(new Date()),
  dataExpiracao: datetime2("data_expiracao"),
  dataPagamento: datetime2("data_pagamento"),
  
  // Vinculação
  accountsReceivableId: int("accounts_receivable_id"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// Pagamentos BTG (Pix/TED/DOC)
export const btgPayments = mssqlTable("btg_payments", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  paymentType: nvarchar("payment_type", { length: 10 }).notNull(),
  
  // Favorecido
  beneficiaryName: nvarchar("beneficiary_name", { length: 255 }).notNull(),
  beneficiaryDocument: nvarchar("beneficiary_document", { length: 18 }).notNull(),
  beneficiaryBank: nvarchar("beneficiary_bank", { length: 10 }),
  beneficiaryAgency: nvarchar("beneficiary_agency", { length: 10 }),
  beneficiaryAccount: nvarchar("beneficiary_account", { length: 20 }),
  beneficiaryPixKey: nvarchar("beneficiary_pix_key", { length: 100 }),
  
  // Valor
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  
  btgTransactionId: nvarchar("btg_transaction_id", { length: 50 }),
  errorMessage: nvarchar("error_message", { length: 500 }),
  
  scheduledDate: datetime2("scheduled_date"),
  processedAt: datetime2("processed_at"),
  
  // Vinculação
  accountsPayableId: int("accounts_payable_id"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

/**
 * ============================================================================
 * 🚚 FISCAL - CTe EXTERNO (MULTICTE/BSOFT)
 * ============================================================================
 * 
 * Armazena CTes emitidos por terceiros (Multicte, bsoft, etc) que foram
 * importados automaticamente via SEFAZ DistribuicaoDFe
 */
export const externalCtes = mssqlTable("external_ctes", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  
  branchId: int("branch_id")
    .notNull()
    .references(() => branches.id),
  
  // Dados do CTe
  accessKey: nvarchar("access_key", { length: 44 }).notNull(), // Chave de Acesso
  cteNumber: nvarchar("cte_number", { length: 20 }),
  series: nvarchar("series", { length: 10 }),
  model: nvarchar("model", { length: 2 }).default("57"), // 57=CTe
  issueDate: datetime2("issue_date").notNull(),
  
  // Emitente (Transportadora externa)
  issuerCnpj: nvarchar("issuer_cnpj", { length: 14 }).notNull(),
  issuerName: nvarchar("issuer_name", { length: 255 }).notNull(),
  issuerIe: nvarchar("issuer_ie", { length: 20 }),
  
  // Remetente
  senderCnpj: nvarchar("sender_cnpj", { length: 14 }),
  senderName: nvarchar("sender_name", { length: 255 }),
  
  // Destinatário
  recipientCnpj: nvarchar("recipient_cnpj", { length: 14 }),
  recipientName: nvarchar("recipient_name", { length: 255 }),
  
  // Expedidor (se diferente do remetente)
  shipperCnpj: nvarchar("shipper_cnpj", { length: 14 }),
  shipperName: nvarchar("shipper_name", { length: 255 }),
  
  // Recebedor (se diferente do destinatário)
  receiverCnpj: nvarchar("receiver_cnpj", { length: 14 }),
  receiverName: nvarchar("receiver_name", { length: 255 }),
  
  // Origem e Destino
  originCity: nvarchar("origin_city", { length: 100 }),
  originUf: nvarchar("origin_uf", { length: 2 }),
  destinationCity: nvarchar("destination_city", { length: 100 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }),
  
  // Valores
  totalValue: decimal("total_value", { precision: 18, scale: 2 }),
  cargoValue: decimal("cargo_value", { precision: 18, scale: 2 }),
  icmsValue: decimal("icms_value", { precision: 18, scale: 2 }),
  
  // Carga
  weight: decimal("weight", { precision: 10, scale: 3 }),
  volume: decimal("volume", { precision: 10, scale: 3 }),
  
  // NFe vinculada (chave de acesso da NFe)
  linkedNfeKey: nvarchar("linked_nfe_key", { length: 44 }),
  
  // Vínculo com cargo_documents (se encontrado)
  cargoDocumentId: int("cargo_document_id").references(() => cargoDocuments.id),
  
  // XML Original
  xmlContent: nvarchar("xml_content", { length: "max" }),
  xmlHash: nvarchar("xml_hash", { length: 64 }),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("IMPORTED"), // IMPORTED, LINKED, ERROR
  
  // Origem da importação
  importSource: nvarchar("import_source", { length: 50 }).default("SEFAZ_AUTO"), // SEFAZ_AUTO, UPLOAD_MANUAL
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1),
});

// --- NOTIFICATIONS (Sistema de Notificações) ---

export const notifications = mssqlTable("notifications", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id"),
  userId: nvarchar("user_id", { length: 255 }), // NULL = todos usuários

  // Tipo e Evento
  type: nvarchar("type", { length: 20 }).notNull(), // SUCCESS, ERROR, WARNING, INFO
  event: nvarchar("event", { length: 100 }).notNull(),

  // Conteúdo
  title: nvarchar("title", { length: 200 }).notNull(),
  message: nvarchar("message", { length: "max" }),

  // Dados extras (JSON)
  data: nvarchar("data", { length: "max" }),

  // Link para ação
  actionUrl: nvarchar("action_url", { length: 500 }),

  // Controle
  isRead: int("is_read").default(0), // 0 = não lido, 1 = lido
  readAt: datetime2("read_at"),

  // Auditoria
  createdAt: datetime2("created_at").default(new Date()),
});

// ==========================================
// ACCOUNTING MODULE (Fiscal → Contábil → Financeiro)
// ==========================================
export * from "./schema/accounting";

