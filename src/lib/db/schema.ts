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

