/**
 * Schema: Domain Event Outbox
 * Tabela para o Transactional Outbox Pattern.
 *
 * Garante entrega confiável de Domain Events: eventos são persistidos
 * na mesma transação que a mutação de estado, e publicados assincronamente
 * por um background processor.
 *
 * @module shared/infrastructure/events/outbox
 * @see OutboxProcessor  — componente que consome PENDING e publica
 * @see saveToOutbox     — helper para inserir na mesma transação
 */
import { sql } from 'drizzle-orm';
import { varchar, int, datetime2, text, index, mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Status possíveis de um evento no outbox.
 *
 * - PENDING:   aguardando publicação
 * - PUBLISHED: publicado com sucesso
 * - FAILED:    falhou após maxRetries tentativas
 */
export type OutboxEventStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export const domainEventOutboxTable = mssqlTable(
  'domain_event_outbox',
  {
    /** UUID v4 único do registro de outbox */
    id: varchar('id', { length: 36 }).primaryKey(),

    /** Tipo do evento (ex: 'ORDER_CREATED', 'INVOICE_SUBMITTED') */
    eventType: varchar('event_type', { length: 255 }).notNull(),

    /** ID do aggregate que originou o evento */
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),

    /** Tipo do aggregate (ex: 'Order', 'FiscalDocument') */
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),

    /** Payload do evento serializado como JSON */
    payload: text('payload').notNull(),

    /** Status do evento: PENDING, PUBLISHED, FAILED */
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),

    /** Número de tentativas de publicação realizadas */
    retryCount: int('retry_count').notNull().default(0),

    /** Número máximo de tentativas antes de marcar como FAILED */
    maxRetries: int('max_retries').notNull().default(5),

    /** Data/hora de criação do registro */
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),

    /** Data/hora em que o evento foi publicado com sucesso */
    publishedAt: datetime2('published_at'),

    /** Data/hora da última tentativa de publicação */
    lastAttemptAt: datetime2('last_attempt_at'),

    /** Mensagem de erro da última tentativa falhada */
    errorMessage: text('error_message'),

    /** Metadados JSON: userId, organizationId, branchId, correlationId */
    metadata: text('metadata'),
  },
  (table) => ([
    /** Índice para buscar eventos pendentes (polling do processor) */
    index('idx_outbox_status').on(table.status),

    /** Índice para ordenação cronológica e cleanup */
    index('idx_outbox_created').on(table.createdAt),

    /** Índice para busca por aggregate (debug/auditoria) */
    index('idx_outbox_aggregate').on(table.aggregateType, table.aggregateId),
  ])
);

export type OutboxEventRow = typeof domainEventOutboxTable.$inferSelect;
export type OutboxEventInsert = typeof domainEventOutboxTable.$inferInsert;
