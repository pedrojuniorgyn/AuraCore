import { sql } from 'drizzle-orm';
import { varchar, int, decimal, datetime } from 'drizzle-orm/mssql-core';
import { mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: romaneios
 * 
 * Persistence model para RomaneioDocument
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. Schema DEVE espelhar Domain Model COMPLETO
 * 2. Campos opcionais = .nullable()
 * 3. Multi-tenancy: organizationId + branchId (obrigatórios)
 * 4. Soft delete: deletedAt
 * 5. Decimals com precision e scale corretos:
 *    - Pesos: decimal(10, 3) para kg
 *    - Cubagem: decimal(10, 6) para m³
 */
export const romaneios = mssqlTable('romaneios', {
  // Identificação
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Numeração
  numero: varchar('numero', { length: 20 }).notNull(),
  dataEmissao: datetime('data_emissao').notNull(),
  
  // Partes (Business Partner IDs)
  remetenteId: varchar('remetente_id', { length: 36 }).notNull(),
  destinatarioId: varchar('destinatario_id', { length: 36 }).notNull(),
  transportadorId: varchar('transportador_id', { length: 36 }),
  
  // Vinculações TMS (opcionais)
  tripId: varchar('trip_id', { length: 36 }),
  deliveryId: varchar('delivery_id', { length: 36 }),
  
  // Documentos fiscais vinculados (JSON arrays serializados como strings)
  cteNumbers: varchar('cte_numbers', { length: 2000 }).notNull().default('[]'),
  nfeNumbers: varchar('nfe_numbers', { length: 2000 }).notNull().default('[]'),
  
  // Totais (calculados dos itens)
  totalVolumes: int('total_volumes').notNull().default(0),
  pesoLiquidoTotal: decimal('peso_liquido_total', { precision: 10, scale: 3 }).notNull().default('0'),
  pesoBrutoTotal: decimal('peso_bruto_total', { precision: 10, scale: 3 }).notNull().default('0'),
  cubagemTotal: decimal('cubagem_total', { precision: 10, scale: 6 }).notNull().default('0'),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  
  // Conferência (preenchido na entrega)
  conferidoPor: varchar('conferido_por', { length: 36 }),
  dataConferencia: datetime('data_conferencia'),
  observacoesConferencia: varchar('observacoes_conferencia', { length: 2000 }),
  
  // Auditoria
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  updatedAt: datetime('updated_at').notNull().default(sql`GETDATE()`),
  updatedBy: varchar('updated_by', { length: 36 }).notNull(),
  deletedAt: datetime('deleted_at'), // Soft delete
});

/**
 * Índices recomendados para performance e multi-tenancy:
 * 
 * CREATE UNIQUE INDEX idx_romaneios_numero 
 *   ON romaneios(organization_id, branch_id, numero) 
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_romaneios_org_status 
 *   ON romaneios(organization_id, branch_id, status, data_emissao) 
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_romaneios_trip 
 *   ON romaneios(trip_id) 
 *   WHERE trip_id IS NOT NULL AND deleted_at IS NULL;
 * 
 * CREATE INDEX idx_romaneios_delivery 
 *   ON romaneios(delivery_id) 
 *   WHERE delivery_id IS NOT NULL AND deleted_at IS NULL;
 * 
 * CREATE INDEX idx_romaneios_remetente 
 *   ON romaneios(remetente_id, organization_id) 
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_romaneios_destinatario 
 *   ON romaneios(destinatario_id, organization_id) 
 *   WHERE deleted_at IS NULL;
 */

