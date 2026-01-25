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
   * Pattern: P-DI-LAZY-001 + P-EVENT-COMPLETE-001
   * Reason: Logger pode não estar registrado no constructor, causando crash
   * Solution: Resolve Logger on-demand quando handler é necessário
   * Coverage: ALL domain event types have handlers
   */
  private getHandlers(eventType: string): IDomainEventHandler[] {
    let handlers = this.handlers.get(eventType);
    
    if (!handlers) {
      // ✅ Resolver logger uma única vez (reutilizado para todos handlers)
      const logger = container.resolve<ILogger>(TOKENS.Logger);
      
      // ✅ FIX Bug #1: Criar handlers para TODOS os event types
      switch (eventType) {
        case 'PayableCreated':
          handlers = [new PayableCreatedHandler(logger)];
          break;
        
        case 'PayableCancelled':
          handlers = [new PayableCancelledHandler(logger)];
          break;
        
        case 'PaymentCompleted':
          handlers = [new PaymentCompletedHandler(logger)];
          break;
        
        case 'PayableOverdue':
          handlers = [new PayableOverdueHandler(logger)];
          break;
        
      default:
        // ✅ Log para eventos desconhecidos (debugging)
        console.warn(`[DomainEventDispatcher] No handler registered for event type: ${eventType}`);
        handlers = [];
    }
    
    // ✅ FIX Bug #1 (S1.1-FIX-3): Sempre cacheia, incluindo arrays vazios
    // Previne re-execução do switch para eventos desconhecidos
    // Performance: Logger não é resolvido novamente para mesmo event type
    this.handlers.set(eventType, handlers);
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
 * Handler para PayableCreated event
 * 
 * Responsável por:
 * - Tracking de contas a pagar criadas
 * - (Futuro) Notificar aprovadores
 * - (Futuro) Criar workflow de aprovação
 * - (Futuro) Integrar com sistema contábil
 */
export class PayableCreatedHandler implements IDomainEventHandler {
  constructor(private readonly logger: ILogger) {}

  async handle(event: DomainEvent): Promise<void> {
    this.logger.info('Payable created', {
      eventType: event.eventType,
      payableId: event.aggregateId,
      organizationId: event.payload?.organizationId,
      branchId: event.payload?.branchId,
      supplierId: event.payload?.supplierId,
      amount: event.payload?.amount,
      currency: event.payload?.currency,
      dueDate: event.payload?.dueDate,
      occurredAt: event.occurredAt,
    });
    
    // TODO: Ações de negócio
    // 1. Notificar aprovadores por email
    // 2. Criar tasks no workflow de aprovação
    // 3. Registrar na contabilidade
  }
}

/**
 * Handler para PayableCancelled event
 * 
 * Responsável por:
 * - Tracking de cancelamentos
 * - (Futuro) Notificar stakeholders
 * - (Futuro) Reverter lançamentos contábeis
 * - (Futuro) Cancelar workflows pendentes
 */
export class PayableCancelledHandler implements IDomainEventHandler {
  constructor(private readonly logger: ILogger) {}

  async handle(event: DomainEvent): Promise<void> {
    this.logger.info('Payable cancelled', {
      eventType: event.eventType,
      payableId: event.aggregateId,
      cancelledAt: event.payload?.cancelledAt,
      reason: event.payload?.reason,
      cancelledBy: event.payload?.cancelledBy,
      occurredAt: event.occurredAt,
    });
    
    // TODO: Ações de negócio
    // 1. Notificar aprovadores e solicitante
    // 2. Reverter lançamentos contábeis
    // 3. Cancelar workflows de aprovação pendentes
    // 4. Atualizar dashboards e relatórios
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
 * ✅ FIX Bug #2: Payload fields corrected (paidAmount, paymentMethod)
 */
export class PaymentCompletedHandler implements IDomainEventHandler {
  constructor(private readonly logger: ILogger) {}

  async handle(event: DomainEvent): Promise<void> {
    // ✅ Log estruturado com campos CORRETOS do payload
    this.logger.info('Payment completed', {
      eventType: event.eventType,
      payableId: event.aggregateId,
      paymentId: event.payload?.paymentId,
      paidAmount: event.payload?.paidAmount,       // ✅ CORRETO (era "amount")
      paidAt: event.payload?.paidAt,               // ✅ CORRETO
      paymentMethod: event.payload?.paymentMethod, // ✅ CORRETO (era "method")
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

/**
 * Handler para PayableOverdue event
 * 
 * Responsável por:
 * - Tracking de contas vencidas
 * - (Futuro) Notificar gestores financeiros
 * - (Futuro) Gerar alertas automáticos
 * - (Futuro) Criar cobrança automática
 */
export class PayableOverdueHandler implements IDomainEventHandler {
  constructor(private readonly logger: ILogger) {}

  async handle(event: DomainEvent): Promise<void> {
    this.logger.warn('Payable overdue', {
      eventType: event.eventType,
      payableId: event.aggregateId,
      dueDate: event.payload?.dueDate,
      daysOverdue: event.payload?.daysOverdue,
      totalDue: event.payload?.totalDue,
      occurredAt: event.occurredAt,
    });
    
    // TODO: Ações de negócio
    // 1. Notificar gestores financeiros urgentemente
    // 2. Criar alertas no dashboard
    // 3. Disparar processo de cobrança
    // 4. Escalar para diretoria se muito atrasado
  }
}

