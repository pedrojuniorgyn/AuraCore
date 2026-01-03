/**
 * BankSlip - Value Object para Boleto Bancário
 * E7.9 Integrações - Semana 1
 */

import { ValueObject } from '@/shared/domain/entities/ValueObject';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

interface BankSlipProps {
  id: string;
  barcode: string;
  digitableLine: string;
  qrCodePix?: string;
  dueDate: Date;
  amount: Money;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  pdfUrl?: string;
}

export class BankSlip extends ValueObject<BankSlipProps & Record<string, unknown>> {
  get id(): string {
    return this.props.id;
  }

  get barcode(): string {
    return this.props.barcode;
  }

  get digitableLine(): string {
    return this.props.digitableLine;
  }

  get qrCodePix(): string | undefined {
    return this.props.qrCodePix;
  }

  get dueDate(): Date {
    return this.props.dueDate;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get status(): 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' {
    return this.props.status;
  }

  get pdfUrl(): string | undefined {
    return this.props.pdfUrl;
  }

  get isPaid(): boolean {
    return this.props.status === 'PAID';
  }

  get isExpired(): boolean {
    return this.props.status === 'EXPIRED' || 
           (this.props.status === 'PENDING' && this.props.dueDate < new Date());
  }

  private constructor(props: BankSlipProps) {
    super(props);
    const validationResult = this.validate();
    if (Result.isFail(validationResult)) {
      throw new Error(validationResult.error);
    }
  }

  static create(props: BankSlipProps): Result<BankSlip, string> {
    try {
      const slip = new BankSlip(props);
      return Result.ok(slip);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(errorMessage);
    }
  }

  private validate(): Result<void, string> {
    if (!this.props.id || this.props.id.trim().length === 0) {
      return Result.fail('Bank slip ID is required');
    }

    if (!this.props.barcode || this.props.barcode.trim().length === 0) {
      return Result.fail('Barcode is required');
    }

    if (!this.props.digitableLine || this.props.digitableLine.trim().length === 0) {
      return Result.fail('Digitable line is required');
    }

    if (!this.props.dueDate) {
      return Result.fail('Due date is required');
    }

    if (!this.props.amount) {
      return Result.fail('Amount is required');
    }

    const validStatuses = ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'];
    if (!validStatuses.includes(this.props.status)) {
      return Result.fail('Invalid bank slip status');
    }

    return Result.ok(undefined);
  }
}

