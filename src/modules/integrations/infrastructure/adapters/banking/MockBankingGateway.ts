/**
 * MockBankingGateway - Mock para testes
 * E7.9 Integrações - Semana 1
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IBankingGateway } from '../../../domain/ports/output/IBankingGateway';
import { Money } from '@/shared/domain/value-objects/Money';

@injectable()
export class MockBankingGateway implements IBankingGateway {
  private shouldFail = false;
  private failureMessage = 'Mock failure';

  setFailure(message: string): void {
    this.shouldFail = true;
    this.failureMessage = message;
  }

  resetFailure(): void {
    this.shouldFail = false;
  }

  async createBankSlip(request: { amount: Money; dueDate: Date; recipientName: string; recipientDocument: string; description: string; organizationId: number; branchId: number }): Promise<Result<{ id: string; barcode: string; digitableLine: string; dueDate: Date; amount: Money; status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'; qrCodePix?: string; pdfUrl?: string }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok({
      id: `MOCK-SLIP-${Date.now()}`,
      barcode: '23790001192110001210904475617405975870000010000',
      digitableLine: '23790.00119 21100.012109 04475.617405 9 75870000010000',
      dueDate: request.dueDate,
      amount: request.amount,
      status: 'PENDING',
      qrCodePix: '00020126580014br.gov.bcb.pix...',
      pdfUrl: 'https://mock.btg.com/slips/123.pdf',
    });
  }

  async cancelBankSlip(slipId: string): Promise<Result<void, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok(undefined);
  }

  async queryBankSlipStatus(slipId: string): Promise<Result<{ id: string; barcode: string; digitableLine: string; dueDate: Date; amount: Money; status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'; qrCodePix?: string; pdfUrl?: string }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const mockMoney = Money.create(10000, 'BRL');
    if (Result.isFail(mockMoney)) {
      return Result.fail(mockMoney.error);
    }

    return Result.ok({
      id: slipId,
      barcode: '23790001192110001210904475617405975870000010000',
      digitableLine: '23790.00119 21100.012109 04475.617405 9 75870000010000',
      dueDate: new Date(),
      amount: mockMoney.value,
      status: 'PENDING',
    });
  }

  async createPixCharge(request: { amount: Money; recipientName: string; recipientDocument: string; description: string; expirationMinutes?: number }): Promise<Result<{ txId: string; qrCode: string; qrCodeImage: string; amount: Money; expiresAt: Date; status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (request.expirationMinutes ?? 30));

    return Result.ok({
      txId: `MOCK-PIX-${Date.now()}`,
      qrCode: '00020126580014br.gov.bcb.pix...',
      qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      amount: request.amount,
      expiresAt,
      status: 'ACTIVE',
    });
  }

  async queryPixChargeStatus(txId: string): Promise<Result<{ txId: string; qrCode: string; qrCodeImage: string; amount: Money; expiresAt: Date; status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const mockMoney = Money.create(5000, 'BRL');
    if (Result.isFail(mockMoney)) {
      return Result.fail(mockMoney.error);
    }

    return Result.ok({
      txId,
      qrCode: '00020126580014br.gov.bcb.pix...',
      qrCodeImage: 'data:image/png;base64,...',
      amount: mockMoney.value,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: 'ACTIVE',
    });
  }

  async executePayment(request: { type: 'PIX' | 'TED' | 'DOC' | 'BOLETO'; amount: Money; recipientName: string; recipientDocument: string; recipientBankCode?: string; recipientAgency?: string; recipientAccount?: string; pixKey?: string; barcode?: string; description?: string }): Promise<Result<{ id: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; amount: Money; scheduledDate?: Date; completedAt?: Date; failureReason?: string }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok({
      id: `MOCK-PAY-${Date.now()}`,
      status: 'COMPLETED',
      amount: request.amount,
      completedAt: new Date(),
    });
  }

  async queryPaymentStatus(paymentId: string): Promise<Result<{ id: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; amount: Money; scheduledDate?: Date; completedAt?: Date; failureReason?: string }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const mockMoney = Money.create(15000, 'BRL');
    if (Result.isFail(mockMoney)) {
      return Result.fail(mockMoney.error);
    }

    return Result.ok({
      id: paymentId,
      status: 'COMPLETED',
      amount: mockMoney.value,
      completedAt: new Date(),
    });
  }

  async queryDdaDebits(cnpj: string): Promise<Result<Array<{ id: string; barcode: string; amount: Money; dueDate: Date; issuerName: string; issuerDocument: string; status: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REJECTED' }>, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const mockMoney = Money.create(25000, 'BRL');
    if (Result.isFail(mockMoney)) {
      return Result.fail(mockMoney.error);
    }

    return Result.ok([
      {
        id: 'DDA-001',
        barcode: '23790001192110001210904475617405975870000025000',
        amount: mockMoney.value,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        issuerName: 'Mock Company LTDA',
        issuerDocument: '12345678000199',
        status: 'PENDING',
      },
    ]);
  }

  async authorizeDdaDebit(debitId: string): Promise<Result<void, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok(undefined);
  }

  async queryBalance(accountId: string): Promise<Result<Money, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const mockMoney = Money.create(100000, 'BRL');
    if (Result.isFail(mockMoney)) {
      return Result.fail(mockMoney.error);
    }

    return Result.ok(mockMoney.value);
  }
}

