/**
 * Document Jobs Schema - Drizzle ORM
 * 
 * Tabela para fila de processamento de documentos.
 * Usa lock/claim pattern para evitar race conditions.
 */
import { sql } from 'drizzle-orm';
import { int, nvarchar, datetime2, index, mssqlTable } from 'drizzle-orm/mssql-core';

export const documentJobsTable = mssqlTable(
  'document_jobs',
  {
    id: nvarchar('id', { length: 36 }).primaryKey(),
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    
    // Referência ao documento
    documentId: nvarchar('document_id', { length: 36 }).notNull(),
    
    // Job
    jobType: nvarchar('job_type', { length: 64 }).notNull(),
    status: nvarchar('status', { length: 20 }).notNull().default('QUEUED'),
    
    // Retry
    attempts: int('attempts').notNull().default(0),
    maxAttempts: int('max_attempts').notNull().default(5),
    
    // Scheduling
    scheduledAt: datetime2('scheduled_at').notNull().default(sql`GETDATE()`),
    startedAt: datetime2('started_at'),
    completedAt: datetime2('completed_at'),
    lockedAt: datetime2('locked_at'),
    
    // Payload e Resultado
    payloadJson: nvarchar('payload_json', { length: 4000 }),
    resultJson: nvarchar('result_json', { length: 4000 }),
    lastError: nvarchar('last_error', { length: 4000 }),
    
    // Auditoria
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
    updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  },
  (table) => ([
    // Índice composto multi-tenancy
    index('idx_document_jobs_tenant').on(table.organizationId, table.branchId),
    // Índice para claim de jobs (status + scheduledAt + id)
    index('idx_document_jobs_queue').on(table.status, table.scheduledAt, table.id),
    // Índice por documento
    index('idx_document_jobs_document').on(table.documentId),
    // Índice por data de criação
    index('idx_document_jobs_created_at').on(table.organizationId, table.createdAt),
  ]),
);

export type DocumentJobRow = typeof documentJobsTable.$inferSelect;
export type DocumentJobInsert = typeof documentJobsTable.$inferInsert;
