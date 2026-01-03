/**
 * PixCharge - Value Object para Cobrança Pix
 * E7.9 Integrações - Semana 1
 */

import { ValueObject } from '@/shared/domain/entities/ValueObject';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

interface PixChargeProps {
  txId: string;
  qrCode: string;
  qrCodeImage: string;
  amount: Money;
  expiresAt: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  completedAt?: Date;
}

export class PixCharge extends ValueObject<PixChargeProps> {
  get txId(): string {
    return this.props.txId;
  }

  get qrCode(): string {
    return this.props.qrCode;
  }

  get qrCodeImage(): string {
    return this.props.qrCodeImage;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get status(): 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' {
    return this.props.status;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get isActive(): boolean {
    return this.props.status === 'ACTIVE' && this.props.expiresAt > new Date();
  }

  get isCompleted(): boolean {
    return this.props.status === 'COMPLETED';
  }

  get isExpired(): boolean {
    return this.props.status === 'EXPIRED' || 
           (this.props.status === 'ACTIVE' && this.props.expiresAt < new Date());
  }

  private constructor(props: PixChargeProps) {
    super(props);
    const validationResult = this.validate();
    if (Result.isFail(validationResult)) {
      throw new Error(validationResult.error);
    }
  }

  static create(props: PixChargeProps): Result<PixCharge, string> {
    try {
      const charge = new PixCharge(props);
      return Result.ok(charge);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(errorMessage);
    }
  }

  private validate(): Result<void, string> {
    if (!this.props.txId || this.props.txId.trim().length === 0) {
      return Result.fail('Transaction ID (txId) is required');
    }

    if (!this.props.qrCode || this.props.qrCode.trim().length === 0) {
      return Result.fail('QR Code is required');
    }

    if (!this.props.qrCodeImage || this.props.qrCodeImage.trim().length === 0) {
      return Result.fail('QR Code image is required');
    }

    if (!this.props.amount) {
      return Result.fail('Amount is required');
    }

    if (!this.props.expiresAt) {
      return Result.fail('Expiration date is required');
    }

    const validStatuses = ['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(this.props.status)) {
      return Result.fail('Invalid Pix charge status');
    }

    if (this.props.status === 'COMPLETED' && !this.props.completedAt) {
      return Result.fail('Completed date is required for completed charges');
    }

    return Result.ok(undefined);
  }
}

