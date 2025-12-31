import { sql } from 'drizzle-orm';
import { mssqlTable, char, int, varchar, bit, datetime } from 'drizzle-orm/mssql-core';

/**
 * LocationSchema - E7.8 WMS Semana 2
 * 
 * Schema Drizzle para localizações no armazém
 * Segue INFRA-001: Schema espelha Domain Model completo
 */

export const wmsLocations = mssqlTable('wms_locations', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  warehouseId: char('warehouse_id', { length: 36 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // WAREHOUSE | AISLE | SHELF | POSITION
  parentId: char('parent_id', { length: 36 }),
  
  // Capacity (opcional)
  capacity: varchar('capacity', { length: 50 }), // Serialized StockQuantity
  capacityUnit: varchar('capacity_unit', { length: 10 }),
  
  isActive: bit('is_active').notNull().default(sql`1`),
  
  createdAt: datetime('created_at', { mode: 'date' }).notNull().default(sql`GETDATE()`),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull().default(sql`GETDATE()`),
  deletedAt: datetime('deleted_at', { mode: 'date' })
});

export type WmsLocationPersistence = typeof wmsLocations.$inferSelect;
export type WmsLocationInsert = typeof wmsLocations.$inferInsert;

