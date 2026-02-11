/**
 * Infrastructure: DrizzleOutboxRepository
 * Implementação do IOutboxRepository usando Drizzle ORM contra SQL Server.
 *
 * Responsabilidades:
 * - Persistir eventos PENDING (mesma tx que mutação de estado)
 * - Consultar eventos pendentes para o processor (polling)
 * - Atualizar status após publicação (sucesso / falha)
 * - Limpeza de eventos antigos (cleanup)
 *
 * @module shared/infrastructure/events/outbox
 */
import { injectable } from 'tsyringe';
import { eq, and, lt, sql, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  domainEventOutboxTable,
  type OutboxEventRow,
  type OutboxEventInsert,
} from './outbox.schema';
import type { IOutboxRepository } from './IOutboxRepository';

@injectable()
export class DrizzleOutboxRepository implements IOutboxRepository {
  /**
   * Persiste eventos com status PENDING.
   * Projetado para ser chamado dentro da mesma transação
   * que a mutação de estado (via saveToOutbox helper).
   */
  async saveToPending(events: OutboxEventInsert[]): Promise<void> {
    if (events.length === 0) return;

    await db.insert(domainEventOutboxTable).values(events);
  }

  /**
   * Busca eventos pendentes de publicação em ordem FIFO.
   * Apenas retorna eventos cujo retryCount < maxRetries.
   *
   * @param limit - Máximo de eventos a retornar (default: 50)
   */
  async findPendingEvents(limit = 50): Promise<OutboxEventRow[]> {
    const rows = await db.execute<OutboxEventRow>(sql`
      SELECT TOP ${sql.raw(String(limit))} *
      FROM ${domainEventOutboxTable}
      WHERE ${eq(domainEventOutboxTable.status, 'PENDING')}
        AND ${domainEventOutboxTable.retryCount} < ${domainEventOutboxTable.maxRetries}
      ORDER BY ${domainEventOutboxTable.createdAt} ASC
    `);

    const results = Array.isArray(rows)
      ? rows
      : (rows as { recordset?: OutboxEventRow[] }).recordset ?? [];

    return results as OutboxEventRow[];
  }

  /**
   * Marca evento como publicado com sucesso.
   */
  async markAsPublished(id: string): Promise<void> {
    const now = new Date();

    await db
      .update(domainEventOutboxTable)
      .set({
        status: 'PUBLISHED',
        publishedAt: now,
        lastAttemptAt: now,
      })
      .where(eq(domainEventOutboxTable.id, id));
  }

  /**
   * Registra falha de publicação:
   * - Incrementa retryCount
   * - Atualiza lastAttemptAt e errorMessage
   * - Se retryCount + 1 >= maxRetries, muda status para FAILED
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    const now = new Date();

    await db.execute(sql`
      UPDATE ${domainEventOutboxTable}
      SET
        ${domainEventOutboxTable.retryCount} = ${domainEventOutboxTable.retryCount} + 1,
        ${domainEventOutboxTable.lastAttemptAt} = ${now},
        ${domainEventOutboxTable.errorMessage} = ${error},
        ${domainEventOutboxTable.status} = CASE
          WHEN ${domainEventOutboxTable.retryCount} + 1 >= ${domainEventOutboxTable.maxRetries}
          THEN 'FAILED'
          ELSE 'PENDING'
        END
      WHERE ${eq(domainEventOutboxTable.id, id)}
    `);
  }

  /**
   * Remove eventos antigos PUBLISHED ou FAILED para evitar
   * crescimento indefinido da tabela.
   *
   * @param olderThan - Data limite; registros criados antes serão removidos
   * @returns Número de registros removidos
   */
  async cleanup(olderThan: Date): Promise<number> {
    const result = await db.execute(sql`
      DELETE FROM ${domainEventOutboxTable}
      WHERE ${lt(domainEventOutboxTable.createdAt, olderThan)}
        AND (${or(
          eq(domainEventOutboxTable.status, 'PUBLISHED'),
          eq(domainEventOutboxTable.status, 'FAILED')
        )})
    `);

    // SQL Server retorna rowsAffected em result
    const affected = (result as unknown as { rowsAffected?: number[] })
      .rowsAffected;
    return Array.isArray(affected) ? (affected[0] ?? 0) : 0;
  }
}
