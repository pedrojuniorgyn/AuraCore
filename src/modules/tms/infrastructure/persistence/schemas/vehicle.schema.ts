/**
 * Vehicle Schema - Drizzle ORM
 * 
 * Tabela de veículos do TMS.
 */
import { sql } from 'drizzle-orm';
import { int, nvarchar, decimal, datetime2, index, uniqueIndex, mssqlTable } from 'drizzle-orm/mssql-core';

export const vehiclesTable = mssqlTable('vehicles', {
  id: int('id').primaryKey().identity(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Identificação do Veículo
  plate: nvarchar('plate', { length: 10 }).notNull(),
  renavam: nvarchar('renavam', { length: 20 }),
  chassis: nvarchar('chassis', { length: 30 }),
  
  // Tipo e Categoria
  type: nvarchar('type', { length: 20 }).notNull(), // TRUCK, TRAILER, VAN, MOTORCYCLE, CAR
  
  // Dados do Veículo
  brand: nvarchar('brand', { length: 100 }),
  model: nvarchar('model', { length: 100 }),
  year: int('year'),
  color: nvarchar('color', { length: 50 }),
  
  // Capacidades (Logística)
  capacityKg: decimal('capacity_kg', { precision: 18, scale: 2 }).default('0.00'),
  capacityM3: decimal('capacity_m3', { precision: 18, scale: 2 }).default('0.00'),
  taraKg: decimal('tara_kg', { precision: 18, scale: 2 }).default('0.00'),
  
  // Controle Operacional
  status: nvarchar('status', { length: 20 }).default('AVAILABLE'), // AVAILABLE, IN_TRANSIT, MAINTENANCE, INACTIVE
  currentKm: int('current_km').default(0),
  
  // Manutenção
  maintenanceStatus: nvarchar('maintenance_status', { length: 20 }).default('OK'), // OK, WARNING, CRITICAL
  lastMaintenanceDate: datetime2('last_maintenance_date'),
  nextMaintenanceKm: int('next_maintenance_km'),
  
  // Documentação
  licensePlateExpiry: datetime2('license_plate_expiry'),
  insuranceExpiry: datetime2('insurance_expiry'),
  
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
  // Placa única por organização (apenas registros não deletados)
  uniqueIndex('vehicles_plate_org_idx')
    .on(table.plate, table.organizationId)
    .where(sql`deleted_at IS NULL`),
  // Índice multi-tenancy
  index('idx_vehicles_tenant').on(table.organizationId, table.branchId),
]));

export type VehicleRow = typeof vehiclesTable.$inferSelect;
export type VehicleInsert = typeof vehiclesTable.$inferInsert;
