/**
 * Helper: saveToOutbox
 * Insere Domain Events na tabela outbox dentro da mesma transação
 * que a mutação de estado.
 *
 * Este é o ponto central do Transactional Outbox Pattern:
 * a gravação dos eventos e a gravação do estado acontecem
 * de forma atômica na mesma transação SQL.
 *
 * @module shared/infrastructure/events/outbox
 *
 * @example
 * ```typescript
 * await withTransaction(async (tx) => {
 *   await tx.insert(ordersTable).values(orderData);
 *   await saveToOutbox(aggregate.getDomainEvents(), tx);
 * });
 * ```
 */
import type { DomainEvent } from '@/shared/domain/events/DomainEvent';
import type { db as DrizzleDb } from '@/lib/db';
import { domainEventOutboxTable, type OutboxEventInsert } from './outbox.schema';

/**
 * Persiste Domain Events na tabela outbox.
 *
 * Deve ser chamado **dentro** da mesma transação que a escrita
 * do aggregate, garantindo atomicidade (all-or-nothing).
 *
 * @param events - Array de DomainEvents coletados do aggregate
 * @param tx     - Instância do Drizzle (db ou tx de transação)
 */
export async function saveToOutbox(
  events: DomainEvent[],
  tx: typeof DrizzleDb,
): Promise<void> {
  if (events.length === 0) return;

  const rows: OutboxEventInsert[] = events.map((event) => ({
    id: event.eventId,
    eventType: event.eventType,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    payload: JSON.stringify(event.payload),
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 5,
    createdAt: event.occurredAt,
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
  }));

  await tx.insert(domainEventOutboxTable).values(rows);
}
