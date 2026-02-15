// Coisas genéricas (sql) vêm de "drizzle-orm"
import { sql } from "drizzle-orm"; 

// Coisas específicas do SQL Server (tabelas, tipos) vêm de "drizzle-orm/mssql-core"
import { 
  int, 
  bigint, 
  bit, // E11.1: TOTP boolean fields
  nvarchar, 
  datetime2, 
  decimal, 
  mssqlTable, 
  uniqueIndex, 
  primaryKey,
  index, // E9.1.1: Para índices compostos SCHEMA-003
} from "drizzle-orm/mssql-core";

import { type AdapterAccount } from "next-auth/adapters";

// ============================================================================
// RE-EXPORTS FROM DDD MODULES (Source of Truth)
// Os módulos DDD são a fonte canônica das definições de schema.
// Este arquivo re-exporta para manter backward-compat com consumidores legados.
// ============================================================================

// Financial Module
import {
  financialCategories as _financialCategories,
  bankAccounts as _bankAccounts,
  bankRemittances as _bankRemittances,
  financialDdaInbox as _financialDdaInbox,
  paymentTerms as _paymentTerms,
  taxCredits as _taxCredits,
  billingInvoices as _billingInvoices,
  billingItems as _billingItems,
  btgBoletos as _btgBoletos,
  btgPayments as _btgPayments,
} from '@/modules/financial/infrastructure/persistence/schemas';

// Fiscal Module
import {
  cteHeader as _cteHeader,
  cteCargoDocuments as _cteCargoDocuments,
  cteValueComponents as _cteValueComponents,
  cteInutilization as _cteInutilization,
  cteCorrectionLetters as _cteCorrectionLetters,
  mdfeHeader as _mdfeHeader,
  mdfeDocuments as _mdfeDocuments,
  taxRules as _taxRules,
  taxMatrix as _taxMatrix,
  nfeManifestationEvents as _nfeManifestationEvents,
  fiscalSettings as _fiscalSettings,
  externalCtes as _externalCtes,
} from '@/modules/fiscal/infrastructure/persistence/schemas';


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
  
  // Dados Fiscais
  ie: nvarchar("ie", { length: 20 }), // Inscrição Estadual
  im: nvarchar("im", { length: 20 }), // Inscrição Municipal

  // Dados do Contabilista (obrigatório para SPED)
  accountantName: nvarchar("accountant_name", { length: 100 }),
  accountantDocument: nvarchar("accountant_document", { length: 14 }), // CPF
  accountantCrcState: nvarchar("accountant_crc_state", { length: 2 }), // UF
  accountantCrc: nvarchar("accountant_crc", { length: 20 }), // Número do CRC

  // Enterprise Base
  status: nvarchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'SUSPENDED', 'CANCELED'
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  
  // 2FA/TOTP (E11.1 - GAP-SEC-003)
  totpSecret: nvarchar("totp_secret", { length: 500 }), // AES-256-GCM encrypted (format: iv:encrypted:authTag in hex)
  totpEnabled: bit("totp_enabled").default(false).notNull(), // Whether 2FA is active
  totpBackupCodes: nvarchar("totp_backup_codes", { length: "max" }), // JSON array of hashed backup codes
  totpVerifiedAt: datetime2("totp_verified_at", { precision: 3 }), // When 2FA was successfully set up

  // Enterprise Base
  createdAt: datetime2("created_at", { precision: 3 }).default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at", { precision: 3 }).default(sql`GETDATE()`),
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
    createdAt: datetime2("created_at").default(sql`GETDATE()`),
  },
  (t) => ([
    primaryKey({ columns: [t.userId, t.branchId] }),
  ])
);

export const accounts = mssqlTable(
  "accounts",
  {
    userId: nvarchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: nvarchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: nvarchar("provider", { length: 255 }).notNull(),
    providerAccountId: nvarchar("provider_account_id", { length: 255 }).notNull(),
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
  sessionToken: nvarchar("session_token", { length: 255 }).primaryKey(),
  userId: nvarchar("user_id", { length: 255 })
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

export const permissions = mssqlTable("permissions", {
  id: int("id").primaryKey().identity(),
  slug: nvarchar("slug", { length: 100 }).notNull(), // 'tms.create'
  description: nvarchar("description", { length: 255 }),
  module: nvarchar("module", { length: 50 }), // 'admin', 'tms', 'financial', etc
  
  // Enterprise Base (simplificado - permissions são globais)
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
    createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  // Integração (legado): Código da filial no ERP/GlobalTCL (CodigoEmpresaFilial).
  // Nullable: nem toda implantação usa o legado; existe migração idempotente em /api/admin/branches/migrate.
  legacyCompanyBranchCode: int("legacy_company_branch_code"),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  branchId: int("branch_id").notNull().default(1), // E9.1: Multi-tenancy
  
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
}, (table) => ([
  uniqueIndex("products_sku_org_idx").on(table.sku, table.organizationId), // SKU único por organização
  index("idx_products_tenant").on(table.organizationId, table.branchId), // E9.1.1: SCHEMA-003
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// --- RELATIONS (COMENTADAS - Beta ainda instável para MSSQL) ---
/*
import { defineRelations } from "drizzle-orm";

export const organizationsRelations = defineRelations(organizations as unknown, ({ many }) => ({
  users: many(users),
  branches: many(branches),
  businessPartners: many(businessPartners),
}));

export const usersRelations = defineRelations(users as unknown, ({ one, many }) => ({
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

export const branchesRelations = defineRelations(branches as unknown, ({ one, many }) => ({
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

export const businessPartnersRelations = defineRelations(businessPartners as unknown, ({ one }) => ({
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

export const userBranchesRelations = defineRelations(userBranches as unknown, ({ one }) => ({
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
export const financialCategories = _financialCategories;

export const bankAccounts = _bankAccounts;

export const bankRemittances = _bankRemittances;

export const financialDdaInbox = _financialDdaInbox;

// --- CONTAS A PAGAR ---
// REMOVIDO (Fase 0 F0.2): Schema legacy com INT IDENTITY.
// Agora exportado via DDD module: @/modules/financial/infrastructure/persistence/schemas
// O barrel cria alias `accountsPayable` → `accountsPayableTable` (DDD, char(36) UUID).

// --- CONTAS A RECEBER ---
// REMOVIDO (Fase 0 F0.2): Schema legacy com INT IDENTITY.
// Agora exportado via DDD module: @/modules/financial/infrastructure/persistence/schemas
// O barrel cria alias `accountsReceivable` → `accountsReceivableTable` (DDD, char(36) UUID).

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  branchId: int("branch_id").notNull().default(1), // E9.1: Multi-tenancy
  
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
}, (table) => ([
  // CPF único por organização (apenas registros não deletados)
  uniqueIndex("drivers_cpf_org_idx")
    .on(table.cpf, table.organizationId)
    .where(sql`deleted_at IS NULL`),
  index("idx_drivers_tenant").on(table.organizationId, table.branchId), // E9.1.1: SCHEMA-003
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
}, (table) => ([
  // Placa única por organização (apenas registros não deletados)
  uniqueIndex("vehicles_plate_org_idx")
    .on(table.plate, table.organizationId)
    .where(sql`deleted_at IS NULL`),
  index("idx_vehicles_tenant").on(table.organizationId, table.branchId), // E9.1.3: SCHEMA-003
]));

// ==========================================
// CADASTROS AUXILIARES
export const paymentTerms = _paymentTerms;

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("geo_regions_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

export const taxRules = _taxRules;

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ==========================================
// FINANCEIRO GERENCIAL (CONTROLADORIA)
// ==========================================

// --- CENTROS DE CUSTO (Entidades Vivas) ---

export const costCenters = mssqlTable("cost_centers", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull().default(1), // E9.1: Multi-tenancy
  
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
  class: nvarchar("class", { length: 20 }).default("BOTH"), // 'REVENUE', 'EXPENSE', 'BOTH'

  // Status
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("cost_centers_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
  index("idx_cost_centers_tenant").on(table.organizationId, table.branchId), // E9.1.1: SCHEMA-003
]));

// --- PCG NCM RULES (Relacionamento Gerencial x Fiscal) ---

export const pcgNcmRules = mssqlTable("pcg_ncm_rules", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Vinculação
  pcgId: int("pcg_id").notNull(), // FK management_chart_of_accounts
  ncmCode: nvarchar("ncm_code", { length: 10 }).notNull(),
  ncmDescription: nvarchar("ncm_description", { length: 255 }),
  
  // Flags de Inteligência Fiscal
  flagPisCofinsMono: int("flag_pis_cofins_monofasico").default(0).notNull(),
  flagIcmsSt: int("flag_icms_st").default(0).notNull(),
  flagIcmsDif: int("flag_icms_diferimento").default(0).notNull(),
  flagIpiSuspenso: int("flag_ipi_suspenso").default(0).notNull(),
  flagImportacao: int("flag_importacao").default(0).notNull(),
  
  // Prioridade
  priority: int("priority").default(100).notNull(),
  
  // Status
  isActive: int("is_active").default(1).notNull(),
  
  // Enterprise Base
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  createdBy: nvarchar("created_by", { length: 255 }),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("pcg_ncm_rules_org_pcg_ncm_idx")
    .on(table.organizationId, table.pcgId, table.ncmCode)
    .where(sql`deleted_at IS NULL`),
]));

// --- PLANO DE CONTAS GERENCIAL (PCG) ---

export const managementChartOfAccounts = mssqlTable("management_chart_of_accounts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),

  // Identificação
  code: nvarchar("code", { length: 50 }).notNull(),
  name: nvarchar("name", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }),

  // Classificação
  type: nvarchar("type", { length: 20 }).notNull(), // REVENUE, COST, EXPENSE, ASSET, LIABILITY
  category: nvarchar("category", { length: 100 }),

  // Hierarquia
  parentId: int("parent_id"),
  level: int("level").default(0),
  isAnalytical: int("is_analytical").default(0),

  // Link com PCC
  legalAccountId: int("legal_account_id"),

  // Regras de rateio
  allocationRule: nvarchar("allocation_rule", { length: 50 }),
  allocationBase: nvarchar("allocation_base", { length: 50 }),

  // Controle
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),

  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("management_chart_of_accounts_code_org_idx")
    .on(table.organizationId, table.code)
    .where(sql`deleted_at IS NULL`),
]));

// --- PLANO DE CONTAS CONTÁBIL (PCC) ---

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("chart_of_accounts_code_org_idx")
    .on(table.code, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

export const taxMatrix = _taxMatrix;

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

export const cteHeader = _cteHeader;

export const cteCargoDocuments = _cteCargoDocuments;

export const cteValueComponents = _cteValueComponents;

export const mdfeHeader = _mdfeHeader;

export const mdfeDocuments = _mdfeDocuments;

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`), // E13.2: SCHEMA-005
  deletedAt: datetime2("deleted_at"), // E9.2: Soft delete
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
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// --- TRIPS: DOCUMENTS (CTes vinculados à viagem) ---

export const tripDocuments = mssqlTable("trip_documents", {
  id: int("id").primaryKey().identity(),
  tripId: int("trip_id").notNull(), // FK trips
  tripStopId: int("trip_stop_id"), // FK trip_stops (qual parada é relativa)
  
  documentType: nvarchar("document_type", { length: 10 }).default("CTE"),
  cteId: int("cte_id"), // FK cte_header
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
export const billingInvoices = _billingInvoices;

export const billingItems = _billingItems;

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

export const taxCredits = _taxCredits;

export const cteInutilization = _cteInutilization;

export const cteCorrectionLetters = _cteCorrectionLetters;

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

export const fuelTransactions = mssqlTable("fuel_transactions", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull().default(1), // E9.1: Multi-tenancy
  
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
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`), // E13.2: SCHEMA-005
  deletedAt: datetime2("deleted_at"), // E9.2: Soft delete
}, (table) => ([
  index("idx_fuel_transactions_tenant").on(table.organizationId, table.branchId), // E9.1.1: SCHEMA-003
]));

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
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

export const driverShiftEvents = mssqlTable("driver_shift_events", {
  id: int("id").primaryKey().identity(),
  workShiftId: int("work_shift_id").notNull(),
  
  eventType: nvarchar("event_type", { length: 20 }).notNull(),
  
  eventTime: datetime2("event_time").notNull(),
  
  source: nvarchar("source", { length: 20 }).default("MANUAL"),
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// 📦 WMS schemas: use DDD module exports (wms_* tables)
// See: src/modules/wms/infrastructure/persistence/schemas/
// Legacy warehouse_* definitions removed - tables never existed in database

// ==========================================
// 💰 CONCILIAÇÃO BANCÁRIA (ONDA 2.3)
// ==========================================

export const bankTransactions = mssqlTable("bank_transactions", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull().default(1), // E9.1: Multi-tenancy
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"), // E9.2: Soft delete
}, (table) => ([
  index("idx_bank_transactions_tenant").on(table.organizationId, table.branchId), // E9.1.1: SCHEMA-003
]));

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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

export const maintenanceWorkOrders = mssqlTable("maintenance_work_orders", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull().default(1), // E9.1: Multi-tenancy
  
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
  
  openedAt: datetime2("opened_at").default(sql`GETDATE()`),
  startedAt: datetime2("started_at"),
  completedAt: datetime2("completed_at"),
  
  totalLaborCost: decimal("total_labor_cost", { precision: 18, scale: 2 }),
  totalPartsCost: decimal("total_parts_cost", { precision: 18, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 18, scale: 2 }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
}, (table) => ([
  index("idx_maintenance_work_orders_tenant").on(table.organizationId, table.branchId), // E9.1.1: SCHEMA-003
]));

export const workOrderItems = mssqlTable("work_order_items", {
  id: int("id").primaryKey().identity(),
  workOrderId: int("work_order_id").notNull(),
  
  itemType: nvarchar("item_type", { length: 20 }).notNull(),
  
  productId: int("product_id"),
  serviceDescription: nvarchar("service_description", { length: 255 }),
  
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 18, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 18, scale: 2 }),
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

export const workOrderMechanics = mssqlTable("work_order_mechanics", {
  id: int("id").primaryKey().identity(),
  workOrderId: int("work_order_id").notNull(),
  mechanicId: int("mechanic_id").notNull(),
  
  assignedAt: datetime2("assigned_at").default(sql`GETDATE()`),
  startedAt: datetime2("started_at"),
  completedAt: datetime2("completed_at"),
  
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 18, scale: 2 }),
  
  notes: nvarchar("notes", { length: 500 }),
});

export const nfeManifestationEvents = _nfeManifestationEvents;

// ==========================================
// 📐 CONVERSÃO DE UNIDADE (ONDA 5.3)
// ==========================================

export const productUnitConversions = mssqlTable("product_unit_conversions", {
  id: int("id").primaryKey().identity(),
  productId: int("product_id").notNull(),
  
  fromUnit: nvarchar("from_unit", { length: 10 }).notNull(),
  toUnit: nvarchar("to_unit", { length: 10 }).notNull(),
  factor: decimal("factor", { precision: 10, scale: 4 }).notNull(),
  
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// 📦 INVENTÁRIO WMS (ONDA 6.3)
// Legacy warehouse_inventory_counts + inventory_count_items removidos
// Tabelas reais no banco usam prefixo wms_* (via módulo DDD)
// See: src/modules/wms/infrastructure/persistence/schemas/

export const inventoryAdjustments = mssqlTable("inventory_adjustments", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull().default(1), // E9.2: Multi-tenancy
  
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`), // E9.2: Auditoria - server-side timestamp
  deletedAt: datetime2("deleted_at"), // E9.2: Soft delete
}, (table) => ([
  index("idx_inventory_adjustments_tenant").on(table.organizationId, table.branchId), // SCHEMA-003
]));

export const fiscalSettings = _fiscalSettings;

export const btgBoletos = _btgBoletos;

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
  dataCriacao: datetime2("data_criacao").default(sql`GETDATE()`),
  dataExpiracao: datetime2("data_expiracao"),
  dataPagamento: datetime2("data_pagamento"),
  
  // Vinculação
  accountsReceivableId: int("accounts_receivable_id"),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

export const btgPayments = _btgPayments;

/**
 * ============================================================================
 * 🚚 FISCAL - CTe EXTERNO (MULTICTE/BSOFT)
 * ============================================================================
 * 
 * Armazena CTes emitidos por terceiros (Multicte, bsoft, etc) que foram
 * importados automaticamente via SEFAZ DistribuicaoDFe
 */
export const externalCtes = _externalCtes;

// ==========================================
// TABELAS TRANSACIONAIS (THE ENGINE)
// ==========================================
// Tabelas que registram operações diárias e geram lançamentos contábeis

// 1. DIÁRIO CONTÁBIL (Journal/Ledger) - Coração do Sistema Financeiro
export const lancamentosContabeis = mssqlTable("lancamentos_contabeis", {
  id: bigint("id", { mode: "bigint" }).primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Datas
  dataLancamento: datetime2("data_lancamento").notNull().default(sql`GETDATE()`),
  dataCompetencia: datetime2("data_competencia").notNull(),
  
  // Vínculos Obrigatórios com Master Data
  idPlanoContas: int("id_plano_contas").notNull(),
  idPlanoContasGerencial: int("id_plano_contas_gerencial"),
  idCentroCusto: int("id_centro_custo").notNull(),
  
  // Informações do Lançamento
  historico: nvarchar("historico", { length: 500 }).notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  tipoLancamento: nvarchar("tipo_lancamento", { length: 1 }).notNull(),
  
  // Rastreabilidade
  origemModulo: nvarchar("origem_modulo", { length: 20 }),
  idOrigemExterna: bigint("id_origem_externa", { mode: "bigint" }),
  loteContabil: nvarchar("lote_contabil", { length: 50 }),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("PENDENTE"),
  
  // Enterprise Base
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  createdBy: nvarchar("created_by", { length: 255 }),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  deletedAt: datetime2("deleted_at"),
});

// 2. COMPRAS - ITENS (Detalhamento de NF de Compra)
export const comprasEntradaItem = mssqlTable("compras_entrada_item", {
  id: bigint("id", { mode: "bigint" }).primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Header
  idHeader: bigint("id_header", { mode: "bigint" }).notNull(),
  
  // Produto
  descricaoProduto: nvarchar("descricao_produto", { length: 255 }).notNull(),
  ncmUtilizado: nvarchar("ncm_utilizado", { length: 10 }).notNull(),
  
  // Classificação Gerencial
  idPcgItem: int("id_pcg_item").notNull(),
  idCentroCustoAplicacao: int("id_centro_custo_aplicacao").notNull(),
  
  // Valores
  quantidade: decimal("quantidade", { precision: 12, scale: 4 }).notNull(),
  valorUnitario: decimal("valor_unitario", { precision: 15, scale: 4 }).notNull(),
  valorTotalItem: decimal("valor_total_item", { precision: 15, scale: 2 }).notNull(),
  
  // Flags Fiscais
  isMonofasico: int("is_monofasico").default(0),
  isIcmsSt: int("is_icms_st").default(0),
  isIcmsDiferimento: int("is_icms_diferimento").default(0),
  isIpiSuspenso: int("is_ipi_suspenso").default(0),
  
  // Impostos
  valorIcms: decimal("valor_icms", { precision: 15, scale: 2 }),
  valorIpi: decimal("valor_ipi", { precision: 15, scale: 2 }),
  valorPis: decimal("valor_pis", { precision: 15, scale: 2 }),
  valorCofins: decimal("valor_cofins", { precision: 15, scale: 2 }),
  
  // Enterprise Base
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  createdBy: nvarchar("created_by", { length: 255 }),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  deletedAt: datetime2("deleted_at"),
});

// 3. FROTA - ABASTECIMENTOS
export const frotaAbastecimentos = mssqlTable("frota_abastecimentos", {
  id: bigint("id", { mode: "bigint" }).primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Data e Localização
  dataAbastecimento: datetime2("data_abastecimento").notNull().default(sql`GETDATE()`),
  localAbastecimento: nvarchar("local_abastecimento", { length: 255 }),
  
  // Vínculos
  idAtivo: int("id_ativo").notNull(),
  idMotorista: int("id_motorista"),
  
  // Classificação
  idPcgCombustivel: int("id_pcg_combustivel").notNull(),
  
  // Volumes
  litros: decimal("litros", { precision: 10, scale: 3 }).notNull(),
  hodometroAtual: int("hodometro_atual").notNull(),
  hodometroAnterior: int("hodometro_anterior"),
  
  // Valores
  valorLitro: decimal("valor_litro", { precision: 10, scale: 4 }).notNull(),
  valorTotal: decimal("valor_total", { precision: 15, scale: 2 }).notNull(),
  
  // Performance
  kmRodados: int("km_rodados"),
  mediaKmL: decimal("media_km_l", { precision: 5, scale: 2 }),
  
  // Tipo
  tipoAbastecimento: nvarchar("tipo_abastecimento", { length: 20 }).default("INTERNO"),
  numeroCupomFiscal: nvarchar("numero_cupom_fiscal", { length: 50 }),
  
  // Controle
  validado: int("validado").default(0),
  observacoes: nvarchar("observacoes", { length: 500 }),
  
  // Enterprise Base
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  createdBy: nvarchar("created_by", { length: 255 }),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  deletedAt: datetime2("deleted_at"),
});

// --- NOTIFICATIONS (Sistema de Notificações) ---
// ÍNDICES DE PERFORMANCE: Criados via migration 0039_notifications_performance_indexes.sql
// - idx_notifications_user_coverage (userId, organizationId, createdAt DESC) 
//   INCLUDE (id, type, event, title, message, data, actionUrl, isRead, readAt, branchId)
//   → Covering index para query principal (10x-50x mais rápido)
// - idx_notifications_unread (userId, organizationId, isRead) 
//   INCLUDE (id, createdAt)
//   → Index-only scan para contador de não-lidas
// Referência: P1.B.1, BP-SQL-001, migration 0039

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

  // Auditoria (SCHEMA-005, SCHEMA-006)
  createdAt: datetime2("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime2("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: datetime2("deleted_at"), // Soft delete
});

// ==========================================
// ACCOUNTING MODULE LEGACY - REMOVED
// ⚠️ Legacy schemas (INT bigint) foram substituídos por DDD (UUID char(36)).
// Este export foi REMOVIDO. Usar schemas DDD:
//   - @/modules/accounting/infrastructure/persistence/schemas
// 
// Arquivo legacy renomeado: src/lib/db/schema/accounting.legacy.disabled.ts
// ==========================================
// export * from "./schema/accounting"; // REMOVED 2026-02-11

// ==========================================
// DDD MODULES (Domain-Driven Design)
// ==========================================
// Strategic: 100% DDD (em produção: ideas, action-plans, pdca)
export * from '@/modules/strategic/infrastructure/persistence/schemas';

// Financial: Exporta DDD schemas + aliases backward-compat
// (accountsPayable → accountsPayableTable, accountsReceivable → accountsReceivableTable)
export * from '@/modules/financial/infrastructure/persistence/schemas';

// Accounting: DDD schemas (UUID char(36))
export * from '@/modules/accounting/infrastructure/persistence/schemas';

// Fiscal: DDD schemas (UUID char(36))
export * from '@/modules/fiscal/infrastructure/persistence/schemas';

// TMS, WMS, Documents: DDD schemas
export * from '@/modules/documents/infrastructure/persistence/schemas';
export * from '@/modules/tms/infrastructure/persistence/schemas';
export * from '@/modules/wms/infrastructure/persistence/schemas';

// ==========================================
// AGENT MODULE (Sessões e Mensagens IA)
// ==========================================
export * from '@/agent/persistence/schemas/agent-sessions.schema';
export * from '@/agent/persistence/schemas/agent-messages.schema';

// ==========================================
// SHARED INFRASTRUCTURE (Audit, Retention)
// ==========================================
export * from '@/shared/infrastructure/audit/audit.schema';
export * from '@/shared/infrastructure/audit/audit-log.schema';
export * from '@/shared/infrastructure/retention/retention.schema';
export * from '@/shared/infrastructure/events/outbox/outbox.schema';

// 🛑 PARE AQUI! NÃO DEIXE MAIS NADA ABAIXO DESTA LINHA 🛑
