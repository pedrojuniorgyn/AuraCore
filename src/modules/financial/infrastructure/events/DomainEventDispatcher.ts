import { injectable } from '@/shared/infrastructure/di/container';
import { DomainEvent } from '@/shared/domain';

/**
 * Interface para handlers de eventos
 */
export interface IDomainEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Interface para dispatcher de eventos
 */
export interface IEventDispatcher {
  dispatch(events: DomainEvent[]): Promise<void>;
  register<T extends DomainEvent>(
    eventName: string, 
    handler: IDomainEventHandler<T>
  ): void;
}

/**
 * Implementação simples de Event Dispatcher
 * 
 * Em produção, poderia usar:
 * - RabbitMQ
 * - Redis Pub/Sub
 * - AWS EventBridge
 * - etc.
 */
@injectable()
export class DomainEventDispatcher implements IEventDispatcher {
  private handlers: Map<string, IDomainEventHandler[]> = new Map();

  /**
   * Registra handler para um tipo de evento
   */
  register<T extends DomainEvent>(
    eventName: string,
    handler: IDomainEventHandler<T>
  ): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler as IDomainEventHandler);
    this.handlers.set(eventName, existing);
  }

  /**
   * Dispara eventos
   */
  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventType) || [];
      
      for (const handler of handlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          // Log error but don't fail (fire-and-forget)
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error handling event ${event.eventType}:`, errorMessage);
        }
      }
    }
  }
}

/**
 * Exemplo de handler para PaymentCompleted
 */
@injectable()
export class PaymentCompletedHandler implements IDomainEventHandler {
  async handle(event: DomainEvent): Promise<void> {
    // TODO: Implementar ações quando pagamento for completado:
    // - Enviar email
    // - Gerar lançamento contábil
    // - Notificar sistema externo
    // - etc.
    
    // Event data:
    // - payableId: event.aggregateId
    // - payload: event.payload
  }
}

