/**
 * Infrastructure: InMemoryEventPublisher
 * Implementação em memória do Event Publisher
 *
 * Para produção, substituir por RabbitMQ, Kafka, etc.
 *
 * @module shared/infrastructure/events
 */
import { injectable } from 'tsyringe';
import type { DomainEvent } from '../../domain/events/DomainEvent';
import type { IEventPublisher, EventHandler } from '../../domain/ports/IEventPublisher';

@injectable()
export class InMemoryEventPublisher implements IEventPublisher {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventLog: DomainEvent<unknown>[] = [];
  private readonly maxLogSize = 1000;

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    // Log do evento
    this.logEvent(event);

    // Obter handlers para este tipo de evento
    const eventHandlers = this.handlers.get(event.eventType);

    if (!eventHandlers || eventHandlers.size === 0) {
      console.debug(`[EventPublisher] No handlers for event: ${event.eventType}`);
      return;
    }

    // Executar handlers em paralelo
    const promises = Array.from(eventHandlers).map(async (handler) => {
      try {
        await handler(event as DomainEvent);
      } catch (error) {
        console.error(
          `[EventPublisher] Handler error for ${event.eventType}:`,
          error
        );
        // Não propagar erro para não afetar outros handlers
      }
    });

    await Promise.all(promises);
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    // Publicar eventos em ordem
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
    console.debug(`[EventPublisher] Subscribed to: ${eventType}`);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }

  getHandlers(eventType: string): EventHandler[] {
    const eventHandlers = this.handlers.get(eventType);
    return eventHandlers ? Array.from(eventHandlers) : [];
  }

  /**
   * Obtém log de eventos (útil para debugging/auditoria)
   */
  getEventLog(): DomainEvent<unknown>[] {
    return [...this.eventLog];
  }

  /**
   * Limpa o log de eventos
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  private logEvent(event: DomainEvent<unknown>): void {
    this.eventLog.push(event);

    // Manter apenas os últimos N eventos
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }
}
