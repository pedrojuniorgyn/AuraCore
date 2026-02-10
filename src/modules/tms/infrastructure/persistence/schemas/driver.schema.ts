/**
 * Driver Schema - Drizzle ORM
 * 
 * Tabela de motoristas do TMS.
 */
import { sql } from 'drizzle-orm';
import { int, nvarchar, datetime2, index, uniqueIndex, mssqlTable } from 'drizzle-orm/mssql-core';

export const driversTable = mssqlTable('drivers', {
  id: int('id').primaryKey().identity(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull().default(1),
  
  // Dados Pessoais
  name: nvarchar('name', { length: 255 }).notNull(),
  cpf: nvarchar('cpf', { length: 14 }).notNull(),
  phone: nvarchar('phone', { length: 20 }),
  email: nvarchar('email', { length: 255 }),
  
  // CNH (Carteira Nacional de Habilitação)
  cnhNumber: nvarchar('cnh_number', { length: 20 }).notNull(),
  cnhCategory: nvarchar('cnh_category', { length: 5 }).notNull(), // A, B, C, D, E, AB, AC, AD, AE
  cnhExpiry: datetime2('cnh_expiry').notNull(),
  cnhIssueDate: datetime2('cnh_issue_date'),
  
  // Relacionamentos
  partnerId: int('partner_id'), // FK business_partners
  
  // Status e Controle
  status: nvarchar('status', { length: 20 }).default('ACTIVE'), // ACTIVE, VACATION, BLOCKED, INACTIVE
  
  // Observações
  notes: nvarchar('notes', { length: 'max' }),
  
  // Enterprise Base
  createdBy: nvarchar('created_by', { length: 255 }).notNull(),
  updatedBy: nvarchar('updated_by', { length: 255 }),
  createdAt: datetime2('created_at').default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
  version: int('version').default(1).notNull(),
}, (table) => ([
  // CPF único por organização (apenas registros não deletados)
  uniqueIndex('drivers_cpf_org_idx')
    .on(table.cpf, table.organizationId)
    .where(sql`deleted_at IS NULL`),
  // Índice multi-tenancy
  index('idx_drivers_tenant').on(table.organizationId, table.branchId),
]));

export type DriverRow = typeof driversTable.$inferSelect;
export type DriverInsert = typeof driversTable.$inferInsert;
