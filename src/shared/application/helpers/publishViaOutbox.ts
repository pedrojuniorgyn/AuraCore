/**
 * Helper: publishViaOutbox
 * 
 * Drop-in replacement para publishAggregateEvents que persiste eventos
 * na tabela outbox ao invés de publicar diretamente.
 * O OutboxProcessor (background) lê a tabela e publica via InMemoryEventPublisher.
 * 
 * Vantagem: Garante que eventos são persistidos na mesma transação que
 * a mudança de estado (atomicidade). Se o publish falhar depois, o processor
 * faz retry automático.
 * 
 * Fallback: Se o saveToOutbox falhar (ex: tabela não existe), faz publish direto
 * via IEventPublisher para não bloquear o fluxo.
 * 
 * @module shared/application/helpers
 * @see saveToOutbox — helper de baixo nível para inserir na tabela outbox
 * @see OutboxProcessor — background job que consome e publica
 * @see publishAggregateEvents — versão direta (sem outbox)
 * 
 * @example
 * ```typescript
 * // No Use Case, após salvar:
 * await this.repository.save(entity);
 * await publishViaOutbox(entity, this.eventPublisher);
 * ```
 */
import type { AggregateRoot } from '@/shared/domain/entities/AggregateRoot';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';

/**
 * Extrai domain events de um aggregate e os persiste na tabela outbox.
 * Se a persistência falhar, faz fallback para publish direto.
 * 
 * @param aggregate - O aggregate root com eventos pendentes
 * @param eventPublisher - Publisher para fallback direto (caso outbox falhe)
 * @param logger - Logger opcional
 * @returns Número de eventos persistidos/publicados
 */
export async function publishViaOutbox(
  aggregate: AggregateRoot<string>,
  eventPublisher: IEventPublisher,
  logger?: ILogger
): Promise<number> {
  const events = aggregate.clearDomainEvents();

  if (events.length === 0) {
    return 0;
  }

  try {
    // Tentar salvar na tabela outbox
    await saveToOutbox(events, db);

    if (logger) {
      logger.info(`Saved ${events.length} event(s) to outbox`, {
        aggregateId: aggregate.id,
        eventTypes: events.map(e => e.eventType),
      });
    }

    return events.length;
  } catch (outboxError: unknown) {
    // Fallback: publicar diretamente via InMemoryEventPublisher
    if (logger) {
      logger.warn(
        `Outbox save failed, falling back to direct publish for ${events.length} event(s)`,
        { aggregateId: aggregate.id, error: outboxError instanceof Error ? outboxError.message : String(outboxError) }
      );
    }

    try {
      await eventPublisher.publishBatch(events);
      return events.length;
    } catch (publishError: unknown) {
      if (logger) {
        logger.error(
          `Both outbox and direct publish failed for aggregate ${aggregate.id}`,
          publishError instanceof Error ? publishError : undefined
        );
      }
      return 0;
    }
  }
}
