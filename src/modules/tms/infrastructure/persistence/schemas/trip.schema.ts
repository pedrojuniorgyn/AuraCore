/**
 * Trip Schema - Drizzle ORM
 * 
 * Tabela de viagens do TMS.
 */
import { int, nvarchar, decimal, datetime2, index, uniqueIndex, mssqlTable } from 'drizzle-orm/mssql-core';

export const tripsTable = mssqlTable('trips', {
  id: int('id').primaryKey().identity(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Identificação
  tripNumber: nvarchar('trip_number', { length: 20 }).notNull().unique(),
  
  // Origem (Ordens de Coleta)
  pickupOrderIds: nvarchar('pickup_order_ids', { length: 'max' }), // JSON array: [123, 456]
  
  // Alocação
  vehicleId: int('vehicle_id').notNull(),
  driverId: int('driver_id').notNull(),
  driverType: nvarchar('driver_type', { length: 20 }), // OWN, THIRD_PARTY, AGGREGATE
  trailer1Id: int('trailer_1_id'),
  trailer2Id: int('trailer_2_id'),
  
  // Datas
  scheduledStart: datetime2('scheduled_start'),
  actualStart: datetime2('actual_start'),
  scheduledEnd: datetime2('scheduled_end'),
  actualEnd: datetime2('actual_end'),
  
  // Fiscal
  mdfeId: int('mdfe_id'),
  mdfeStatus: nvarchar('mdfe_status', { length: 20 }), // PENDING, AUTHORIZED, CLOSED
  
  // CIOT (Obrigatório para terceiros)
  requiresCiot: nvarchar('requires_ciot', { length: 10 }).default('false'),
  ciotNumber: nvarchar('ciot_number', { length: 50 }),
  ciotValue: decimal('ciot_value', { precision: 18, scale: 2 }),
  ciotIssuedAt: datetime2('ciot_issued_at'),
  
  // Status
  status: nvarchar('status', { length: 20 }).notNull().default('DRAFT'), // DRAFT, ALLOCATED, IN_TRANSIT, COMPLETED, CANCELLED
  
  // Financeiro
  estimatedRevenue: decimal('estimated_revenue', { precision: 18, scale: 2 }),
  actualRevenue: decimal('actual_revenue', { precision: 18, scale: 2 }),
  estimatedCost: decimal('estimated_cost', { precision: 18, scale: 2 }),
  actualCost: decimal('actual_cost', { precision: 18, scale: 2 }),
  
  // Observações
  notes: nvarchar('notes', { length: 1000 }),
  
  // Enterprise Base
  createdBy: nvarchar('created_by', { length: 255 }).notNull(),
  updatedBy: nvarchar('updated_by', { length: 255 }),
  createdAt: datetime2('created_at').default(new Date()),
  updatedAt: datetime2('updated_at').default(new Date()),
  deletedAt: datetime2('deleted_at'),
  version: int('version').default(1).notNull(),
}, (table) => ([
  // Índice multi-tenancy
  index('idx_trips_tenant').on(table.organizationId, table.branchId),
  // Índice por status
  index('idx_trips_status').on(table.organizationId, table.status),
  // Índice por motorista
  index('idx_trips_driver').on(table.driverId),
  // Índice por veículo
  index('idx_trips_vehicle').on(table.vehicleId),
  // Número da viagem único
  uniqueIndex('idx_trips_number').on(table.tripNumber),
]));

export type TripRow = typeof tripsTable.$inferSelect;
export type TripInsert = typeof tripsTable.$inferInsert;
