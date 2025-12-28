import { BaseDomainEvent } from '@/shared/domain';

export class PayableCreatedEvent extends BaseDomainEvent {
  constructor(
    payableId: string,
    payload: {
      organizationId: number;
      branchId: number;
      supplierId: number;
      amount: number;
      currency: string;
      dueDate: string;
    }
  ) {
    super(payableId, 'AccountPayable', 'PayableCreated', payload);
  }
}

export class PaymentCompletedEvent extends BaseDomainEvent {
  constructor(
    payableId: string,
    payload: {
      paymentId: string;
      paidAmount: number;
      paidAt: string;
      paymentMethod: string;
    }
  ) {
    super(payableId, 'AccountPayable', 'PaymentCompleted', payload);
  }
}

export class PayableCancelledEvent extends BaseDomainEvent {
  constructor(
    payableId: string,
    payload: {
      cancelledAt: string;
      reason: string;
      cancelledBy: string;
    }
  ) {
    super(payableId, 'AccountPayable', 'PayableCancelled', payload);
  }
}

export class PayableOverdueEvent extends BaseDomainEvent {
  constructor(
    payableId: string,
    payload: {
      dueDate: string;
      daysOverdue: number;
      totalDue: number;
    }
  ) {
    super(payableId, 'AccountPayable', 'PayableOverdue', payload);
  }
}

