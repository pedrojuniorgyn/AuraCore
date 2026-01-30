/**
 * Port: IEventPublisher
 * Interface para publicação de Domain Events
 *
 * @module shared/domain/ports
 */
import type { DomainEvent } from '../events/DomainEvent';

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

export interface IEventPublisher {
  /**
   * Publica um único evento
   */
  publish<T>(event: DomainEvent<T>): Promise<void>;

  /**
   * Publica múltiplos eventos em batch
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Registra um handler para um tipo de evento
   */
  subscribe<T>(
    eventType: string,
    handler: EventHandler<T>
  ): void;

  /**
   * Remove um handler de um tipo de evento
   */
  unsubscribe(eventType: string, handler: EventHandler): void;

  /**
   * Obtém todos os handlers registrados para um tipo de evento
   */
  getHandlers(eventType: string): EventHandler[];
}

/**
 * Interface para aggregates que emitem eventos
 */
export interface IEventEmitter {
  /**
   * Obtém eventos pendentes do aggregate
   */
  getDomainEvents(): DomainEvent[];

  /**
   * Limpa eventos pendentes após publicação
   */
  clearDomainEvents(): void;
}
