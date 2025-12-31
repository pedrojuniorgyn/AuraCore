import { sql } from 'drizzle-orm';
import { mssqlTable, char, int, varchar, decimal, datetime } from 'drizzle-orm/mssql-core';

/**
 * StockItemSchema - E7.8 WMS Semana 2
 * 
 * Schema Drizzle para itens de estoque
 * Segue INFRA-001: Schema espelha Domain Model completo
 * Segue INFRA-002: Money = 2 campos (amount + currency)
 */

export const wmsStockItems = mssqlTable('wms_stock_items', {
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  productId: char('product_id', { length: 36 }).notNull(),
  locationId: char('location_id', { length: 36 }).notNull(),
  
  // Quantities (StockQuantity serializado)
  quantity: decimal('quantity', { precision: 18, scale: 3 }).notNull(),
  quantityUnit: varchar('quantity_unit', { length: 10 }).notNull(),
  reservedQuantity: decimal('reserved_quantity', { precision: 18, scale: 3 }).notNull().default(sql`0`),
  reservedQuantityUnit: varchar('reserved_quantity_unit', { length: 10 }).notNull(),
  
  // Lot control (INFRA-003: campos opcionais = nullable)
  lotNumber: varchar('lot_number', { length: 50 }),
  expirationDate: datetime('expiration_date', { mode: 'date' }),
  
  // Unit Cost (INFRA-002: Money = amount + currency)
  unitCostAmount: decimal('unit_cost_amount', { precision: 18, scale: 2 }).notNull(),
  unitCostCurrency: varchar('unit_cost_currency', { length: 3 }).notNull().default(sql`'BRL'`),
  
  createdAt: datetime('created_at', { mode: 'date' }).notNull().default(sql`GETDATE()`),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull().default(sql`GETDATE()`),
  deletedAt: datetime('deleted_at', { mode: 'date' })
});

export type WmsStockItemPersistence = typeof wmsStockItems.$inferSelect;
export type WmsStockItemInsert = typeof wmsStockItems.$inferInsert;

