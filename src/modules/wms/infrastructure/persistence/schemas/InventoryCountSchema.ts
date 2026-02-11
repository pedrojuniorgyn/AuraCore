import { sql } from 'drizzle-orm';
import { mssqlTable, char, int, varchar, decimal, datetime, index } from 'drizzle-orm/mssql-core';

/**
 * InventoryCountSchema - E7.8 WMS Semana 2
 * 
 * Schema Drizzle para contagens de inventário
 * Segue INFRA-001: Schema espelha Domain Model completo
 */

export const wmsInventoryCounts = mssqlTable('wms_inventory_counts', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  locationId: char('location_id', { length: 36 }).notNull(),
  productId: char('product_id', { length: 36 }).notNull(),
  
  // System Quantity (StockQuantity serializado)
  systemQuantity: decimal('system_quantity', { precision: 18, scale: 3 }).notNull(),
  systemQuantityUnit: varchar('system_quantity_unit', { length: 10 }).notNull(),
  
  // Counted Quantity (INFRA-003: opcional até contagem ser feita)
  countedQuantity: decimal('counted_quantity', { precision: 18, scale: 3 }),
  countedQuantityUnit: varchar('counted_quantity_unit', { length: 10 }),
  
  // Status
  status: varchar('status', { length: 20 }).notNull(), // PENDING | IN_PROGRESS | COMPLETED | CANCELLED | DIVERGENT
  
  // Count execution (INFRA-003: campos opcionais)
  countedBy: varchar('counted_by', { length: 50 }),
  countedAt: datetime('counted_at', { mode: 'date' }),
  adjustmentMovementId: char('adjustment_movement_id', { length: 36 }),
  
  createdAt: datetime('created_at', { mode: 'date' }).notNull().default(sql`GETDATE()`),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull().default(sql`GETDATE()`),
  deletedAt: datetime('deleted_at', { mode: 'date' })
}, (table) => ([
  index('idx_wms_inventory_counts_tenant').on(table.organizationId, table.branchId), // E13.2: SCHEMA-003
]));

export type WmsInventoryCountPersistence = typeof wmsInventoryCounts.$inferSelect;
export type WmsInventoryCountInsert = typeof wmsInventoryCounts.$inferInsert;

