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
    // ✅ FIX LC-[AUTO]: Constructor vazio - sem DI calls
    // Logger será resolvido apenas quando primeiro evento for disparado (lazy resolution)
    // Previne race condition: Dispatcher pode ser criado ANTES de Logger estar registrado
  }

  /**
   * Lazy resolution de handlers para evitar race condition com Logger DI.
   * Handlers são criados apenas quando primeiro evento do tipo é disparado.
   * 
   * Pattern: P-DI-LAZY-001
   * Reason: Logger pode não estar registrado no constructor, causando crash
   * Solution: Resolve Logger on-demand quando handler é necessário
   */
  private getHandlers(eventType: string): IDomainEventHandler[] {
    let handlers = this.handlers.get(eventType);
    
    if (!handlers) {
      // ✅ Criar handlers sob demanda (lazy)
      if (eventType === 'PaymentCompleted') {
        // ✅ Resolver logger AQUI (quando necessário)
        // Neste ponto, Logger JÁ foi registrado em global dependencies
        const logger = container.resolve<ILogger>(TOKENS.Logger);
        handlers = [new PaymentCompletedHandler(logger)];
        this.handlers.set(eventType, handlers);
      }
      // TODO: Adicionar outros event types aqui conforme necessário
    }
    
    return handlers || [];
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
      // ✅ Usar getHandlers() para lazy resolution
      const handlers = this.getHandlers(event.eventType);
      
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

