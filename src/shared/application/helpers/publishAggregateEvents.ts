/**
 * Helper para publicar eventos de Aggregate Roots apos persistencia.
 *
 * Use Cases devem chamar esta funcao apos repository.save() para garantir
 * que os Domain Events coletados no aggregate sejam efetivamente publicados.
 *
 * @example
 * ```typescript
 * // No Use Case, apos salvar:
 * await this.repository.save(entity);
 * await publishAggregateEvents(entity, this.eventPublisher, this.logger);
 * ```
 *
 * @module shared/application/helpers
 * @see AggregateRoot.clearDomainEvents()
 * @see IEventPublisher.publishBatch()
 */
import type { AggregateRoot } from '@/shared/domain/entities/AggregateRoot';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';

/**
 * Extrai e publica todos os domain events pendentes de um aggregate.
 *
 * @param aggregate - O aggregate root com eventos pendentes
 * @param eventPublisher - Publisher para despachar os eventos
 * @param logger - Logger para registro (opcional)
 * @returns Numero de eventos publicados
 */
export async function publishAggregateEvents(
  aggregate: AggregateRoot<string>,
  eventPublisher: IEventPublisher,
  logger?: ILogger
): Promise<number> {
  const events = aggregate.clearDomainEvents();

  if (events.length === 0) {
    return 0;
  }

  try {
    await eventPublisher.publishBatch(events);

    if (logger) {
      logger.info(`Published ${events.length} domain event(s)`, {
        aggregateId: aggregate.id,
        eventTypes: events.map((e) => e.eventType),
      });
    }

    return events.length;
  } catch (error: unknown) {
    // Log mas nao propaga - eventos sao best-effort por enquanto
    // Para garantia, implementar Transactional Outbox Pattern no futuro
    if (logger) {
      logger.error(
        `Failed to publish ${events.length} event(s) for aggregate ${aggregate.id}`,
        error instanceof Error ? error : undefined
      );
    }

    return 0;
  }
}
