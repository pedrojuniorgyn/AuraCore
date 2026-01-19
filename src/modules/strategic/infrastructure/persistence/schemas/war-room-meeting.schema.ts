/**
 * Schema: War Room Meeting
 * Reuniões executivas para decisões estratégicas
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0023
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
import { strategyTable } from './strategy.schema';

export const warRoomMeetingTable = mssqlTable('strategic_war_room_meeting', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  strategyId: varchar('strategy_id', { length: 36 })
    .references(() => strategyTable.id),
  
  // Tipo de reunião: BOARD | DIRECTOR | MANAGER | TACTICAL | EMERGENCY
  meetingType: varchar('meeting_type', { length: 20 }).notNull(),
  
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  
  // Agendamento
  scheduledAt: datetime2('scheduled_at').notNull(),
  expectedDuration: int('expected_duration').notNull().default(60), // minutos
  
  // Execução
  startedAt: datetime2('started_at'),
  endedAt: datetime2('ended_at'),
  
  // Participantes (JSON array de userIds)
  participants: text('participants'),
  
  // Pauta (JSON array de itens)
  agendaItems: text('agenda_items'),
  
  // Decisões tomadas (JSON array)
  decisions: text('decisions'),
  
  // Ata gerada
  minutes: text('minutes'),
  minutesGeneratedAt: datetime2('minutes_generated_at'),
  
  // Status: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
  status: varchar('status', { length: 20 }).notNull().default('SCHEDULED'),
  
  // Responsável pela reunião
  facilitatorUserId: varchar('facilitator_user_id', { length: 36 }).notNull(),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
});

// Índices serão criados via migration:
// CREATE INDEX idx_war_room_meeting_tenant ON strategic_war_room_meeting (organization_id, branch_id);
// CREATE INDEX idx_war_room_meeting_strategy ON strategic_war_room_meeting (strategy_id);
// CREATE INDEX idx_war_room_meeting_type ON strategic_war_room_meeting (meeting_type);
// CREATE INDEX idx_war_room_meeting_scheduled ON strategic_war_room_meeting (scheduled_at);
// CREATE INDEX idx_war_room_meeting_status ON strategic_war_room_meeting (status);
// CREATE INDEX idx_war_room_meeting_facilitator ON strategic_war_room_meeting (facilitator_user_id);

export type WarRoomMeetingRow = typeof warRoomMeetingTable.$inferSelect;
export type WarRoomMeetingInsert = typeof warRoomMeetingTable.$inferInsert;
