import { injectable } from '@/shared/infrastructure/di/container';
import { container } from 'tsyringe';
import { DomainEvent } from '@/shared/domain';
import type { ILogger } from '@/shared/infrastructure';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

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

  constructor() {
    // ✅ Resolver logger uma vez no constructor e passar aos handlers
    const logger = container.resolve<ILogger>(TOKENS.Logger);
    
    // Registrar handlers com suas dependências resolvidas
    this.handlers.set('PaymentCompleted', [
      new PaymentCompletedHandler(logger),
    ]);
  }

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
 * Handler para PaymentCompleted event
 * 
 * Responsável por:
 * - Tracking estruturado de pagamentos completados
 * - (Futuro) Enviar email de confirmação
 * - (Futuro) Gerar lançamento contábil
 * - (Futuro) Notificar sistema externo
 * 
 * ✅ SEM @injectable: Handler recebe logger via constructor normal
 * ✅ Logger é resolvido no DomainEventDispatcher e passado aqui
 */
export class PaymentCompletedHandler implements IDomainEventHandler {
  constructor(private readonly logger: ILogger) {}

  async handle(event: DomainEvent): Promise<void> {
    // ✅ Log estruturado para tracking e auditoria
    this.logger.info('Payment completed', {
      eventType: event.eventType,
      payableId: event.aggregateId,
      paymentId: event.payload?.paymentId,
      amount: event.payload?.amount,
      currency: event.payload?.currency,
      method: event.payload?.method,
      occurredAt: event.occurredAt,
      metadata: event.payload,
    });
    
    // TODO: Implementar ações de negócio quando estiverem disponíveis:
    // 1. EmailGateway: Disparar email de confirmação de pagamento
    // 2. AccountingService: Gerar lançamento contábil (débito/crédito)
    // 3. IntegrationGateway: Notificar ERP/sistema externo
    // 4. NotificationService: Criar notificação in-app para usuário
    
    // Por enquanto, apenas tracking via logger estruturado
    // Futuras implementações adicionarão lógica aqui
  }
}

