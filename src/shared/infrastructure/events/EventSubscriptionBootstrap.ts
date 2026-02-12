/**
 * EventSubscriptionBootstrap
 * 
 * Registra subscribers cross-module no InMemoryEventPublisher.
 * Executado uma vez no startup (instrumentation.ts).
 * 
 * Fluxo:
 * 1. Resolve o EventPublisher do container DI
 * 2. Resolve os integration services
 * 3. Registra handlers como subscribers de eventos específicos
 * 
 * @see F1.4: Event Pipeline
 */
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import type { DomainEvent } from '@/shared/domain/events/DomainEvent';
import { logger } from '@/shared/infrastructure/logging';

export function bootstrapEventSubscriptions(): void {
  try {
    const eventPublisher = container.resolve<IEventPublisher>(TOKENS.EventPublisher);

    // =============================================
    // Financial → Accounting Integration (F1.2)
    // =============================================
    // O FinancialAccountingIntegration será registrado aqui quando criado.
    // Por enquanto, registramos handlers de logging para confirmar que o pipeline funciona.

    try {
      const financialAccountingIntegration = container.resolve(TOKENS.FinancialAccountingIntegration);

      // Handler: PaymentCompleted → gera lançamento contábil
      eventPublisher.subscribe('PaymentCompleted', async (event: DomainEvent) => {
        try {
          await (financialAccountingIntegration as { onPaymentCompleted(event: DomainEvent): Promise<void> }).onPaymentCompleted(event);
        } catch (error: unknown) {
          logger.error(`[EventBootstrap] Error in onPaymentCompleted handler`, error instanceof Error ? error : undefined);
        }
      });

      // Handler: ReceivableReceived → gera lançamento contábil
      eventPublisher.subscribe('ReceivableReceived', async (event: DomainEvent) => {
        try {
          await (financialAccountingIntegration as { onReceivableReceived(event: DomainEvent): Promise<void> }).onReceivableReceived(event);
        } catch (error: unknown) {
          logger.error(`[EventBootstrap] Error in onReceivableReceived handler`, error instanceof Error ? error : undefined);
        }
      });

      // Handler: BillingFinalized → gera lançamento contábil
      eventPublisher.subscribe('BillingFinalized', async (event: DomainEvent) => {
        try {
          await (financialAccountingIntegration as { onBillingFinalized(event: DomainEvent): Promise<void> }).onBillingFinalized(event);
        } catch (error: unknown) {
          logger.error(`[EventBootstrap] Error in onBillingFinalized handler`, error instanceof Error ? error : undefined);
        }
      });

      // Handler: PayableCancelled → estorno contábil
      eventPublisher.subscribe('PayableCancelled', async (event: DomainEvent) => {
        try {
          await (financialAccountingIntegration as { onPayableCancelled(event: DomainEvent): Promise<void> }).onPayableCancelled(event);
        } catch (error: unknown) {
          logger.error(`[EventBootstrap] Error in onPayableCancelled handler`, error instanceof Error ? error : undefined);
        }
      });

      logger.info('[EventBootstrap] FinancialAccountingIntegration handlers registered (4 event types)');
    } catch {
      // FinancialAccountingIntegration not yet registered — skip
      logger.info('[EventBootstrap] FinancialAccountingIntegration not available yet — skipping handlers');
    }

    // =============================================
    // Logging handlers (para monitoramento)
    // =============================================
    const logEventTypes = [
      'PayableCreated',
      'PaymentCompleted',
      'PayableCancelled',
      'ReceivableReceived',
      'ReceivableCancelled',
      'BillingFinalized',
      'JournalEntryPosted',
      'JournalEntryReversed',
    ];

    for (const eventType of logEventTypes) {
      eventPublisher.subscribe(eventType, async (event: DomainEvent) => {
        logger.info(`[DomainEvent] ${event.eventType}`, {
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventId: event.eventId,
        });
      });
    }

    logger.info(`[EventBootstrap] ✅ Subscriptions registered (${logEventTypes.length} event types + integration handlers)`);
  } catch (error: unknown) {
    logger.error('[EventBootstrap] Failed to bootstrap event subscriptions', error instanceof Error ? error : undefined);
    // Non-fatal: events will just not be handled
  }
}
