import { DomainError } from '@/shared/domain';

export class PayableNotFoundError extends DomainError {
  readonly code = 'PAYABLE_NOT_FOUND';
  constructor(id: string) {
    super(`Account payable with id ${id} not found`);
  }
}

export class PayableAlreadyPaidError extends DomainError {
  readonly code = 'PAYABLE_ALREADY_PAID';
  constructor(id: string) {
    super(`Account payable ${id} is already paid`);
  }
}

export class PayableCancelledError extends DomainError {
  readonly code = 'PAYABLE_CANCELLED';
  constructor(id: string) {
    super(`Account payable ${id} is cancelled and cannot be modified`);
  }
}

export class InsufficientPaymentError extends DomainError {
  readonly code = 'INSUFFICIENT_PAYMENT';
  constructor(expected: number, received: number) {
    super(`Insufficient payment: expected ${expected}, received ${received}`);
  }
}

export class OverpaymentError extends DomainError {
  readonly code = 'OVERPAYMENT';
  constructor(expected: number, received: number) {
    super(`Payment exceeds amount due: expected ${expected}, received ${received}`);
  }
}

export class InvalidPaymentDateError extends DomainError {
  readonly code = 'INVALID_PAYMENT_DATE';
  constructor(message: string) {
    super(message);
  }
}

export class PayableInProcessingError extends DomainError {
  readonly code = 'PAYABLE_IN_PROCESSING';
  constructor(id: string) {
    super(`Account payable ${id} is in processing and cannot be modified`);
  }
}

