/**
 * BtgBankingAdapter - Implementação real BTG Pactual
 * E7.9 Integrações - Semana 2 (TODO)
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IBankingGateway } from '../../../domain/ports/output/IBankingGateway';
import { Money } from '@/shared/domain/value-objects/Money';

@injectable()
export class BtgBankingAdapter implements IBankingGateway {
  async createBankSlip(request: { amount: Money; dueDate: Date; recipientName: string; recipientDocument: string; description: string; organizationId: number; branchId: number }): Promise<Result<{ id: string; barcode: string; digitableLine: string; dueDate: Date; amount: Money; status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'; qrCodePix?: string; pdfUrl?: string }, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async cancelBankSlip(slipId: string): Promise<Result<void, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async queryBankSlipStatus(slipId: string): Promise<Result<{ id: string; barcode: string; digitableLine: string; dueDate: Date; amount: Money; status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'; qrCodePix?: string; pdfUrl?: string }, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async createPixCharge(request: { amount: Money; recipientName: string; recipientDocument: string; description: string; expirationMinutes?: number }): Promise<Result<{ txId: string; qrCode: string; qrCodeImage: string; amount: Money; expiresAt: Date; status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' }, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async queryPixChargeStatus(txId: string): Promise<Result<{ txId: string; qrCode: string; qrCodeImage: string; amount: Money; expiresAt: Date; status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' }, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async executePayment(request: { type: 'PIX' | 'TED' | 'DOC' | 'BOLETO'; amount: Money; recipientName: string; recipientDocument: string; recipientBankCode?: string; recipientAgency?: string; recipientAccount?: string; pixKey?: string; barcode?: string; description?: string }): Promise<Result<{ id: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; amount: Money; scheduledDate?: Date; completedAt?: Date; failureReason?: string }, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async queryPaymentStatus(paymentId: string): Promise<Result<{ id: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; amount: Money; scheduledDate?: Date; completedAt?: Date; failureReason?: string }, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async queryDdaDebits(cnpj: string): Promise<Result<Array<{ id: string; barcode: string; amount: Money; dueDate: Date; issuerName: string; issuerDocument: string; status: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REJECTED' }>, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async authorizeDdaDebit(debitId: string): Promise<Result<void, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }

  async queryBalance(accountId: string): Promise<Result<Money, string>> {
    return Result.fail('BTG Banking adapter not implemented yet - Semana 2');
  }
}

