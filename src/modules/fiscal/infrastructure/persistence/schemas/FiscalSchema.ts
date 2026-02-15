/**
 * Fiscal Module - Persistence Schemas (Source of Truth)
 *
 * Definições Drizzle para tabelas do módulo Fiscal.
 * Estas definições correspondem à estrutura REAL do banco de dados (INT IDs).
 *
 * Convenção de export:
 * - *Table (sufixo): export principal para DDD repositories e mappers
 * - bare name:       alias para rotas V1 e use cases (backward-compat)
 *
 * @module fiscal/infrastructure/persistence/schemas
 * @see SCHEMA-001 a SCHEMA-010
 */
import {
  int,
  varchar,
  decimal,
  datetime2,
  nvarchar,
  mssqlTable,
  index,
  uniqueIndex,
} from 'drizzle-orm/mssql-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// CTe HEADER (Conhecimento de Transporte Eletrônico)
// ============================================================================

export const cteHeaderTable = mssqlTable("cte_header", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),

  // Identificação
  cteNumber: int("cte_number").notNull(),
  serie: nvarchar("serie", { length: 3 }).default("1"),
  model: nvarchar("model", { length: 2 }).default("57"),
  cteKey: nvarchar("cte_key", { length: 44 }),

  // Datas
  issueDate: datetime2("issue_date").notNull(),

  // Vinculação
  pickupOrderId: int("pickup_order_id"),
  tripId: int("trip_id"),

  // Partes Envolvidas
  senderId: int("sender_id"),
  recipientId: int("recipient_id"),
  shipperId: int("shipper_id"),
  receiverId: int("receiver_id"),
  takerId: int("taker_id").notNull(),
  takerType: nvarchar("taker_type", { length: 20 }),

  // Origem/Destino
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  originCityId: int("origin_city_id"),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),
  destinationCityId: int("destination_city_id"),

  // Valores
  serviceValue: decimal("service_value", { precision: 18, scale: 2 }).notNull(),
  cargoValue: decimal("cargo_value", { precision: 18, scale: 2 }),
  totalValue: decimal("total_value", { precision: 18, scale: 2 }).notNull(),
  receivableValue: decimal("receivable_value", { precision: 18, scale: 2 }),

  // ICMS
  icmsBase: decimal("icms_base", { precision: 18, scale: 2 }),
  icmsRate: decimal("icms_rate", { precision: 5, scale: 2 }),
  icmsValue: decimal("icms_value", { precision: 18, scale: 2 }),
  icmsReduction: decimal("icms_reduction", { precision: 5, scale: 2 }).default("0.00"),

  // Seguro
  insurancePolicy: nvarchar("insurance_policy", { length: 50 }).notNull(),
  insuranceCertificate: nvarchar("insurance_certificate", { length: 50 }).notNull(),
  insuranceCompany: nvarchar("insurance_company", { length: 200 }),

  // Modal
  modal: nvarchar("modal", { length: 2 }).default("01"),

  // Status SEFAZ
  status: nvarchar("status", { length: 20 }).default("DRAFT"),
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

  // Origem do CTe
  cteOrigin: nvarchar("cte_origin", { length: 20 }).notNull().default("INTERNAL"),
  externalEmitter: nvarchar("external_emitter", { length: 255 }),
  importedAt: datetime2("imported_at"),

  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ============================================================================
// CTe CARGO DOCUMENTS (Documentos Transportados)
// ============================================================================

export const cteCargoDocumentsTable = mssqlTable("cte_cargo_documents", {
  id: int("id").primaryKey().identity(),
  cteHeaderId: int("cte_header_id").notNull(),

  documentType: nvarchar("document_type", { length: 10 }).default("NFE"),
  documentKey: nvarchar("document_key", { length: 44 }),
  documentNumber: nvarchar("document_number", { length: 20 }),
  documentSerie: nvarchar("document_serie", { length: 3 }),
  documentDate: datetime2("document_date"),
  documentValue: decimal("document_value", { precision: 18, scale: 2 }),

  // Rastreabilidade
  sourceInvoiceId: int("source_invoice_id"),
  sourceCargoId: int("source_cargo_id"),

  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ============================================================================
// CTe VALUE COMPONENTS (Componentes de Valor)
// ============================================================================

export const cteValueComponentsTable = mssqlTable("cte_value_components", {
  id: int("id").primaryKey().identity(),
  cteHeaderId: int("cte_header_id").notNull(),

  componentName: nvarchar("component_name", { length: 50 }),
  componentValue: decimal("component_value", { precision: 18, scale: 2 }),

  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ============================================================================
// CTe INUTILIZAÇÃO
// ============================================================================

export const cteInutilizationTable = mssqlTable("cte_inutilization", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),

  serie: nvarchar("serie", { length: 3 }).notNull(),
  numberFrom: int("number_from").notNull(),
  numberTo: int("number_to").notNull(),
  year: int("year").notNull(),
  justification: nvarchar("justification", { length: 500 }).notNull(),

  protocolNumber: nvarchar("protocol_number", { length: 20 }),
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  sefazReturnMessage: nvarchar("sefaz_return_message", { length: 500 }),

  inutilizedAt: datetime2("inutilized_at"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// ============================================================================
// CTe CARTA DE CORREÇÃO (CCe)
// ============================================================================

export const cteCorrectionLettersTable = mssqlTable("cte_correction_letters", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  cteHeaderId: int("cte_header_id").notNull(),

  sequenceNumber: int("sequence_number").notNull(),
  corrections: nvarchar("corrections", { length: "max" }).notNull(),

  protocolNumber: nvarchar("protocol_number", { length: 20 }),
  status: nvarchar("status", { length: 20 }).default("PENDING"),
  sefazReturnMessage: nvarchar("sefaz_return_message", { length: 500 }),

  xmlEvent: nvarchar("xml_event", { length: "max" }),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// ============================================================================
// MDFe HEADER (Manifesto de Documentos Fiscais Eletrônicos)
// ============================================================================

export const mdfeHeaderTable = mssqlTable("mdfe_header", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),

  mdfeNumber: int("mdfe_number").notNull(),
  serie: nvarchar("serie", { length: 3 }).default("1"),
  mdfeKey: nvarchar("mdfe_key", { length: 44 }),

  // Viagem
  tripId: int("trip_id"),
  vehicleId: int("vehicle_id").notNull(),
  driverId: int("driver_id").notNull(),

  // Percurso
  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),
  route: nvarchar("route", { length: "max" }),

  // CIOT
  ciotNumber: nvarchar("ciot_number", { length: 50 }),

  // Status
  status: nvarchar("status", { length: 20 }).default("DRAFT"),
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});

// ============================================================================
// MDFe DOCUMENTS (CTes vinculados)
// ============================================================================

export const mdfeDocumentsTable = mssqlTable("mdfe_documents", {
  id: int("id").primaryKey().identity(),
  mdfeHeaderId: int("mdfe_header_id").notNull(),
  cteHeaderId: int("cte_header_id").notNull(),

  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ============================================================================
// TAX RULES (Regras Fiscais ICMS)
// ============================================================================

export const taxRulesTable = mssqlTable("tax_rules", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),

  originState: nvarchar("origin_state", { length: 2 }).notNull(),
  destinationState: nvarchar("destination_state", { length: 2 }).notNull(),

  icmsRate: decimal("icms_rate", { precision: 5, scale: 2 }).notNull(),
  cfopTransport: nvarchar("cfop_transport", { length: 4 }),

  notes: nvarchar("notes", { length: "max" }),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("tax_rules_route_org_idx")
    .on(table.originState, table.destinationState, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// ============================================================================
// TAX MATRIX (Matriz de Tributação Detalhada)
// ============================================================================

export const taxMatrixTable = mssqlTable("tax_matrix", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),

  originUf: nvarchar("origin_uf", { length: 2 }).notNull(),
  destinationUf: nvarchar("destination_uf", { length: 2 }).notNull(),

  icmsRate: decimal("icms_rate", { precision: 5, scale: 2 }).notNull(),
  icmsStRate: decimal("icms_st_rate", { precision: 5, scale: 2 }),
  icmsReduction: decimal("icms_reduction", { precision: 5, scale: 2 }).default("0.00"),
  fcpRate: decimal("fcp_rate", { precision: 5, scale: 2 }).default("0.00"),

  cfopInternal: nvarchar("cfop_internal", { length: 4 }),
  cfopInterstate: nvarchar("cfop_interstate", { length: 4 }),

  cst: nvarchar("cst", { length: 2 }).default("00"),
  regime: nvarchar("regime", { length: 30 }).default("NORMAL"),

  validFrom: datetime2("valid_from").notNull(),
  validTo: datetime2("valid_to"),

  notes: nvarchar("notes", { length: 500 }),
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("tax_matrix_route_regime_org_idx")
    .on(table.originUf, table.destinationUf, table.regime, table.organizationId)
    .where(sql`deleted_at IS NULL`),
]));

// ============================================================================
// NFe MANIFESTATION EVENTS (Eventos de Manifestação NFe)
// ============================================================================

export const nfeManifestationEventsTable = mssqlTable("nfe_manifestation_events", {
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
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// ============================================================================
// FISCAL SETTINGS (Configurações Fiscais)
// ============================================================================

export const fiscalSettingsTable = mssqlTable("fiscal_settings", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),

  nfeEnvironment: nvarchar("nfe_environment", { length: 20 }).notNull().default("production"),
  cteEnvironment: nvarchar("cte_environment", { length: 20 }).notNull().default("homologacao"),
  cteSeries: nvarchar("cte_series", { length: 3 }).default("1"),

  autoImportEnabled: nvarchar("auto_import_enabled", { length: 1 }).default("S"),
  autoImportInterval: int("auto_import_interval").default(1),
  lastAutoImport: datetime2("last_auto_import"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  version: int("version").default(1).notNull(),
  deletedAt: datetime2("deleted_at"),
}, (table) => ([
  index("idx_fiscal_settings_tenant").on(table.organizationId, table.branchId),
]));

// ============================================================================
// EXTERNAL CTes (CTes de Terceiros)
// ============================================================================

export const externalCtesTable = mssqlTable("external_ctes", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),

  accessKey: nvarchar("access_key", { length: 44 }).notNull(),
  cteNumber: nvarchar("cte_number", { length: 20 }),
  series: nvarchar("series", { length: 10 }),
  model: nvarchar("model", { length: 2 }).default("57"),
  issueDate: datetime2("issue_date").notNull(),

  issuerCnpj: nvarchar("issuer_cnpj", { length: 14 }).notNull(),
  issuerName: nvarchar("issuer_name", { length: 255 }).notNull(),
  issuerIe: nvarchar("issuer_ie", { length: 20 }),

  senderCnpj: nvarchar("sender_cnpj", { length: 14 }),
  senderName: nvarchar("sender_name", { length: 255 }),
  recipientCnpj: nvarchar("recipient_cnpj", { length: 14 }),
  recipientName: nvarchar("recipient_name", { length: 255 }),
  shipperCnpj: nvarchar("shipper_cnpj", { length: 14 }),
  shipperName: nvarchar("shipper_name", { length: 255 }),
  receiverCnpj: nvarchar("receiver_cnpj", { length: 14 }),
  receiverName: nvarchar("receiver_name", { length: 255 }),

  originCity: nvarchar("origin_city", { length: 100 }),
  originUf: nvarchar("origin_uf", { length: 2 }),
  destinationCity: nvarchar("destination_city", { length: 100 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }),

  totalValue: decimal("total_value", { precision: 18, scale: 2 }),
  cargoValue: decimal("cargo_value", { precision: 18, scale: 2 }),
  icmsValue: decimal("icms_value", { precision: 18, scale: 2 }),

  weight: decimal("weight", { precision: 10, scale: 3 }),
  volume: decimal("volume", { precision: 10, scale: 3 }),

  linkedNfeKey: nvarchar("linked_nfe_key", { length: 44 }),
  cargoDocumentId: int("cargo_document_id"),

  xmlContent: nvarchar("xml_content", { length: "max" }),
  xmlHash: nvarchar("xml_hash", { length: 64 }),

  status: nvarchar("status", { length: 20 }).default("IMPORTED"),
  importSource: nvarchar("import_source", { length: 50 }).default("SEFAZ_AUTO"),

  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
  deletedAt: datetime2("deleted_at"),
});

// ============================================================================
// ALIASES (backward-compat para rotas V1 e use cases)
// ============================================================================

export const cteHeader = cteHeaderTable;
export const cteCargoDocuments = cteCargoDocumentsTable;
export const cteValueComponents = cteValueComponentsTable;
export const cteInutilization = cteInutilizationTable;
export const cteCorrectionLetters = cteCorrectionLettersTable;
export const mdfeHeader = mdfeHeaderTable;
export const mdfeDocuments = mdfeDocumentsTable;
export const taxRules = taxRulesTable;
export const taxMatrix = taxMatrixTable;
export const nfeManifestationEvents = nfeManifestationEventsTable;
export const fiscalSettings = fiscalSettingsTable;
export const externalCtes = externalCtesTable;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CteHeaderSelect = typeof cteHeaderTable.$inferSelect;
export type CteHeaderInsert = typeof cteHeaderTable.$inferInsert;

export type CteCargoDocumentSelect = typeof cteCargoDocumentsTable.$inferSelect;
export type CteCargoDocumentInsert = typeof cteCargoDocumentsTable.$inferInsert;

export type CteValueComponentSelect = typeof cteValueComponentsTable.$inferSelect;
export type CteValueComponentInsert = typeof cteValueComponentsTable.$inferInsert;

export type CteInutilizationSelect = typeof cteInutilizationTable.$inferSelect;
export type CteInutilizationInsert = typeof cteInutilizationTable.$inferInsert;

export type CteCorrectionLetterSelect = typeof cteCorrectionLettersTable.$inferSelect;
export type CteCorrectionLetterInsert = typeof cteCorrectionLettersTable.$inferInsert;

export type MdfeHeaderSelect = typeof mdfeHeaderTable.$inferSelect;
export type MdfeHeaderInsert = typeof mdfeHeaderTable.$inferInsert;

export type MdfeDocumentSelect = typeof mdfeDocumentsTable.$inferSelect;
export type MdfeDocumentInsert = typeof mdfeDocumentsTable.$inferInsert;

export type TaxRuleSelect = typeof taxRulesTable.$inferSelect;
export type TaxRuleInsert = typeof taxRulesTable.$inferInsert;

export type TaxMatrixSelect = typeof taxMatrixTable.$inferSelect;
export type TaxMatrixInsert = typeof taxMatrixTable.$inferInsert;

export type NfeManifestationEventSelect = typeof nfeManifestationEventsTable.$inferSelect;
export type NfeManifestationEventInsert = typeof nfeManifestationEventsTable.$inferInsert;

export type FiscalSettingsSelect = typeof fiscalSettingsTable.$inferSelect;
export type FiscalSettingsInsert = typeof fiscalSettingsTable.$inferInsert;

export type ExternalCteSelect = typeof externalCtesTable.$inferSelect;
export type ExternalCteInsert = typeof externalCtesTable.$inferInsert;
