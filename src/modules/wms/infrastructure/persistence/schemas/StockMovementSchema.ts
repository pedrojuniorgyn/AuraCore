import { sql } from 'drizzle-orm';
import { mssqlTable, char, int, varchar, decimal, datetime } from 'drizzle-orm/mssql-core';

/**
 * StockMovementSchema - E7.8 WMS Semana 2
 * 
 * Schema Drizzle para movimentações de estoque
 * Segue INFRA-001: Schema espelha Domain Model completo
 * Segue INFRA-002: Money = 2 campos (amount + currency)
 */

export const wmsStockMovements = mssqlTable('wms_stock_movements', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  productId: char('product_id', { length: 36 }).notNull(),
  
  // Locations (INFRA-003: opcionais conforme tipo de movimentação)
  fromLocationId: char('from_location_id', { length: 36 }),
  toLocationId: char('to_location_id', { length: 36 }),
  
  // Movement Type
  type: varchar('type', { length: 30 }).notNull(), // ENTRY | EXIT | TRANSFER | ADJUSTMENT_PLUS | ADJUSTMENT_MINUS | RESERVATION | PICKING | RETURN
  
  // Quantity (StockQuantity serializado)
  quantity: decimal('quantity', { precision: 18, scale: 3 }).notNull(),
  quantityUnit: varchar('quantity_unit', { length: 10 }).notNull(),
  
  // Costs (INFRA-002: Money = amount + currency)
  unitCostAmount: decimal('unit_cost_amount', { precision: 18, scale: 2 }).notNull(),
  unitCostCurrency: varchar('unit_cost_currency', { length: 3 }).notNull().default(sql`'BRL'`),
  totalCostAmount: decimal('total_cost_amount', { precision: 18, scale: 2 }).notNull(),
  totalCostCurrency: varchar('total_cost_currency', { length: 3 }).notNull().default(sql`'BRL'`),
  
  // Reference (INFRA-003: campos opcionais = nullable)
  referenceType: varchar('reference_type', { length: 20 }),
  referenceId: char('reference_id', { length: 36 }),
  reason: varchar('reason', { length: 500 }),
  
  // Execution
  executedBy: varchar('executed_by', { length: 50 }).notNull(),
  executedAt: datetime('executed_at', { mode: 'date' }).notNull(),
  
  createdAt: datetime('created_at', { mode: 'date' }).notNull().default(sql`GETDATE()`),
  deletedAt: datetime('deleted_at', { mode: 'date' })
});

export type WmsStockMovementPersistence = typeof wmsStockMovements.$inferSelect;
export type WmsStockMovementInsert = typeof wmsStockMovements.$inferInsert;

