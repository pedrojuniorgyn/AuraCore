import type { DomainEvent } from '@/shared/domain';

/**
 * ReceivableCancelledEvent
 * 
 * Emitido quando uma conta a receber é cancelada.
 * 
 * @see F1.4: Event Pipeline
 */
export interface ReceivableCancelledPayload {
  receivableId: string;
  organizationId: number;
  branchId: number;
  cancelledAt: string;
  cancelledBy: string;
  reason: string;
}

export function createReceivableCancelledEvent(
  receivableId: string,
  payload: ReceivableCancelledPayload
): DomainEvent<ReceivableCancelledPayload> {
  return {
    eventId: globalThis.crypto.randomUUID(),
    eventType: 'ReceivableCancelled',
    occurredAt: new Date(),
    aggregateId: receivableId,
    aggregateType: 'AccountReceivable',
    payload,
  };
}
