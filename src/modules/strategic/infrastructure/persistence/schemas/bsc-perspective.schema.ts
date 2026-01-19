/**
 * Schema: BSC Perspective
 * As 4 perspectivas do Balanced Scorecard: FIN, CLI, INT, LRN
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0021
 */
import { sql } from 'drizzle-orm';
import { int, varchar, decimal, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
import { strategyTable } from './strategy.schema';

export const bscPerspectiveTable = mssqlTable('strategic_bsc_perspective', {
  id: varchar('id', { length: 36 }).primaryKey(),
  strategyId: varchar('strategy_id', { length: 36 })
    .notNull()
    .references(() => strategyTable.id),
  
  code: varchar('code', { length: 3 }).notNull(), // FIN, CLI, INT, LRN
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  orderIndex: int('order_index').notNull(),
  weight: decimal('weight', { precision: 5, scale: 2 }).notNull().default('25.00'),
  color: varchar('color', { length: 7 }).notNull(), // Hex color: #fbbf24
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
});

// Índices serão criados via migration:
// CREATE INDEX idx_bsc_perspective_strategy ON strategic_bsc_perspective (strategy_id);
// CREATE UNIQUE INDEX idx_bsc_perspective_code ON strategic_bsc_perspective (strategy_id, code);

export type BSCPerspectiveRow = typeof bscPerspectiveTable.$inferSelect;
export type BSCPerspectiveInsert = typeof bscPerspectiveTable.$inferInsert;
