/**
 * BankTransaction - Value Object para Transação Bancária
 * E7.9 Integrações - Semana 1
 */

import { ValueObject } from '@/shared/domain/entities/ValueObject';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

interface BankTransactionProps extends Record<string, unknown> {
  id: string;
  date: Date;
  amount: Money;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  balance?: Money;
  fitId?: string;
  checkNumber?: string;
  memo?: string;
}

export class BankTransaction extends ValueObject<BankTransactionProps & Record<string, unknown>> {
  get id(): string {
    return this.props.id;
  }

  get date(): Date {
    return this.props.date;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get type(): 'CREDIT' | 'DEBIT' {
    return this.props.type;
  }

  get description(): string {
    return this.props.description;
  }

  get balance(): Money | undefined {
    return this.props.balance;
  }

  get fitId(): string | undefined {
    return this.props.fitId;
  }

  get checkNumber(): string | undefined {
    return this.props.checkNumber;
  }

  get memo(): string | undefined {
    return this.props.memo;
  }

  get isCredit(): boolean {
    return this.props.type === 'CREDIT';
  }

  get isDebit(): boolean {
    return this.props.type === 'DEBIT';
  }

  /**
   * ⚠️ S1.3: Constructor privado SEM throw (validação movida para create)
   */
  private constructor(props: BankTransactionProps) {
    super(props);
  }

  /**
   * ⚠️ S1.3: Validação no create() ao invés de throw no constructor
   */
  static create(props: BankTransactionProps): Result<BankTransaction, string> {
    const transaction = new BankTransaction(props);
    const validationResult = transaction.validate();
    if (Result.isFail(validationResult)) {
      return Result.fail(validationResult.error);
    }
    return Result.ok(transaction);
  }

  private validate(): Result<void, string> {
    if (!this.props.id || this.props.id.trim().length === 0) {
      return Result.fail('Transaction ID is required');
    }

    if (!this.props.date) {
      return Result.fail('Transaction date is required');
    }

    if (!this.props.amount) {
      return Result.fail('Transaction amount is required');
    }

    const validTypes = ['CREDIT', 'DEBIT'];
    if (!validTypes.includes(this.props.type)) {
      return Result.fail('Invalid transaction type');
    }

    if (!this.props.description || this.props.description.trim().length === 0) {
      return Result.fail('Transaction description is required');
    }

    return Result.ok(undefined);
  }
}

