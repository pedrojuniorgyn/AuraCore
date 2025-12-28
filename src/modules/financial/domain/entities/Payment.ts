import { Entity, Result, Money } from '@/shared/domain';

export type PaymentMethod = 'PIX' | 'BOLETO' | 'TED' | 'DOC' | 'CHEQUE' | 'CASH' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

interface PaymentProps {
  payableId: string;
  amount: Money;
  method: PaymentMethod;
  paidAt: Date;
  status: PaymentStatus;
  bankAccountId?: string;
  transactionId?: string;
  notes?: string;
}

/**
 * Entity que representa um pagamento/baixa
 */
export class Payment extends Entity<string> {
  private _props: PaymentProps;

  private constructor(id: string, props: PaymentProps, createdAt?: Date) {
    super(id, createdAt);
    this._props = props;
  }

  // Getters
  get payableId(): string { return this._props.payableId; }
  get amount(): Money { return this._props.amount; }
  get method(): PaymentMethod { return this._props.method; }
  get paidAt(): Date { return this._props.paidAt; }
  get status(): PaymentStatus { return this._props.status; }
  get bankAccountId(): string | undefined { return this._props.bankAccountId; }
  get transactionId(): string | undefined { return this._props.transactionId; }
  get notes(): string | undefined { return this._props.notes; }

  /**
   * Factory method
   */
  static create(props: {
    id: string;
    payableId: string;
    amount: Money;
    method: PaymentMethod;
    paidAt?: Date;
    bankAccountId?: string;
    transactionId?: string;
    notes?: string;
  }): Result<Payment, string> {
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Payment id is required');
    }

    if (!props.payableId || props.payableId.trim() === '') {
      return Result.fail('Payable id is required');
    }

    if (!props.amount.isPositive()) {
      return Result.fail('Payment amount must be positive');
    }

    return Result.ok(new Payment(props.id, {
      payableId: props.payableId,
      amount: props.amount,
      method: props.method,
      paidAt: props.paidAt ?? new Date(),
      status: 'PENDING',
      bankAccountId: props.bankAccountId,
      transactionId: props.transactionId,
      notes: props.notes,
    }));
  }

  /**
   * Confirma o pagamento
   */
  confirm(transactionId?: string): Result<void, string> {
    if (this._props.status === 'CANCELLED') {
      return Result.fail('Cannot confirm cancelled payment');
    }

    if (this._props.status === 'CONFIRMED') {
      return Result.fail('Payment already confirmed');
    }

    this._props.status = 'CONFIRMED';
    if (transactionId) {
      this._props.transactionId = transactionId;
    }
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Cancela o pagamento
   */
  cancel(reason: string): Result<void, string> {
    if (this._props.status === 'CONFIRMED') {
      return Result.fail('Cannot cancel confirmed payment');
    }

    if (this._props.status === 'CANCELLED') {
      return Result.fail('Payment already cancelled');
    }

    this._props.status = 'CANCELLED';
    this._props.notes = reason;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Reconstrói do banco
   */
  static reconstitute(
    id: string,
    props: PaymentProps,
    createdAt: Date,
    updatedAt: Date
  ): Payment {
    const payment = new Payment(id, props, createdAt);
    payment._updatedAt = updatedAt;
    return payment;
  }
}

