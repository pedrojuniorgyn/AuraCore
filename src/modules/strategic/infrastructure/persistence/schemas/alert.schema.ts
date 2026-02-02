/**
 * Schema: Strategic Alert
 * Sistema de alertas automáticos para KPIs críticos, variâncias e action plans
 *
 * @module strategic/infrastructure/persistence/schemas
 * @see SCHEMA-001
 */
import { sql } from 'drizzle-orm';
import {
  int,
  varchar,
  text,
  decimal,
  datetime2,
  bit,
  mssqlTable,
  index,
} from 'drizzle-orm/mssql-core';

// Alert Types
export const AlertType = {
  KPI_CRITICAL: 'KPI_CRITICAL',
  VARIANCE_UNFAVORABLE: 'VARIANCE_UNFAVORABLE',
  ACTION_PLAN_OVERDUE: 'ACTION_PLAN_OVERDUE',
  GOAL_STALE: 'GOAL_STALE',
} as const;

export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const AlertSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const AlertStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  DISMISSED: 'DISMISSED',
} as const;

export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

// Strategic Alert Table
export const strategicAlertTable = mssqlTable('strategic_alert', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  alertType: varchar('alert_type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),

  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 36 }).notNull(),
  entityName: varchar('entity_name', { length: 255 }).notNull(),

  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }),
  thresholdValue: decimal('threshold_value', { precision: 18, scale: 4 }),

  status: varchar('status', { length: 20 }).notNull().default('PENDING'),

  sentAt: datetime2('sent_at'),
  acknowledgedAt: datetime2('acknowledged_at'),
  acknowledgedBy: varchar('acknowledged_by', { length: 36 }),
  dismissedAt: datetime2('dismissed_at'),
  dismissedBy: varchar('dismissed_by', { length: 36 }),
  dismissReason: varchar('dismiss_reason', { length: 500 }),

  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('IX_strategic_alert_org_branch').on(table.organizationId, table.branchId),
  index('IX_strategic_alert_status').on(table.status),
  index('IX_strategic_alert_entity').on(table.entityType, table.entityId),
  index('IX_strategic_alert_created').on(table.createdAt),
]));

// Alert Configuration Table
export const strategicAlertConfigTable = mssqlTable('strategic_alert_config', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  kpiCriticalThreshold: decimal('kpi_critical_threshold', { precision: 5, scale: 2 }).notNull().default('70.00'),
  kpiWarningThreshold: decimal('kpi_warning_threshold', { precision: 5, scale: 2 }).notNull().default('85.00'),
  varianceUnfavorableThreshold: decimal('variance_unfavorable_threshold', { precision: 5, scale: 2 }).notNull().default('15.00'),
  overdueDaysWarning: int('overdue_days_warning').notNull().default(3),
  overdueDaysCritical: int('overdue_days_critical').notNull().default(7),
  staleDaysThreshold: int('stale_days_threshold').notNull().default(14),

  emailEnabled: bit('email_enabled').notNull().default(true),
  inAppEnabled: bit('in_app_enabled').notNull().default(true),
  webhookUrl: varchar('webhook_url', { length: 500 }),

  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('UQ_alert_config_org_branch').on(table.organizationId, table.branchId),
]));

export type StrategicAlertRow = typeof strategicAlertTable.$inferSelect;
export type StrategicAlertInsert = typeof strategicAlertTable.$inferInsert;
export type AlertConfigRow = typeof strategicAlertConfigTable.$inferSelect;
export type AlertConfigInsert = typeof strategicAlertConfigTable.$inferInsert;
