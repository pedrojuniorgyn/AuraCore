import type { DomainEvent } from '@/shared/domain';

/**
 * ReceivableReceivedEvent
 * 
 * Emitido quando um recebimento é registrado em uma conta a receber.
 * Usado para gerar lançamento contábil automático (D: Banco / C: Clientes).
 * 
 * @see F1.4: Event Pipeline
 */
export interface ReceivableReceivedPayload {
  receivableId: string;
  organizationId: number;
  branchId: number;
  customerId: number;
  amountReceived: number;
  currency: string;
  bankAccountId: number;
  receivedAt: string;
  receivedBy: string;
}

export function createReceivableReceivedEvent(
  receivableId: string,
  payload: ReceivableReceivedPayload
): DomainEvent<ReceivableReceivedPayload> {
  return {
    eventId: globalThis.crypto.randomUUID(),
    eventType: 'ReceivableReceived',
    occurredAt: new Date(),
    aggregateId: receivableId,
    aggregateType: 'AccountReceivable',
    payload,
  };
}
