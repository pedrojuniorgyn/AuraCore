/**
 * MockBankStatementParser - Mock para testes
 * E7.9 Integrações - Semana 1
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IBankStatementParser } from '../../../domain/ports/output/IBankStatementParser';
import { Money } from '@/shared/domain/value-objects/Money';

@injectable()
export class MockBankStatementParser implements IBankStatementParser {
  private shouldFail = false;
  private failureMessage = 'Mock failure';

  setFailure(message: string): void {
    this.shouldFail = true;
    this.failureMessage = message;
  }

  resetFailure(): void {
    this.shouldFail = false;
  }

  async parseOFX(content: string): Promise<Result<{ accountNumber: string; bankCode: string; startDate: Date; endDate: Date; openingBalance: Money; closingBalance: Money; transactions: Array<{ id: string; date: Date; amount: Money; type: 'CREDIT' | 'DEBIT'; description: string; balance?: Money; fitId?: string; checkNumber?: string; memo?: string }> }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const openingBalanceResult = Money.create(100000, 'BRL');
    const closingBalanceResult = Money.create(150000, 'BRL');
    const transaction1AmountResult = Money.create(50000, 'BRL');

    if (Result.isFail(openingBalanceResult)) {
      return Result.fail(openingBalanceResult.error);
    }
    if (Result.isFail(closingBalanceResult)) {
      return Result.fail(closingBalanceResult.error);
    }
    if (Result.isFail(transaction1AmountResult)) {
      return Result.fail(transaction1AmountResult.error);
    }

    return Result.ok({
      accountNumber: '12345-6',
      bankCode: '001',
      startDate,
      endDate,
      openingBalance: openingBalanceResult.value,
      closingBalance: closingBalanceResult.value,
      transactions: [
        {
          id: 'TXN-001',
          date: new Date('2024-01-15'),
          amount: transaction1AmountResult.value,
          type: 'CREDIT',
          description: 'Mock transaction',
          fitId: 'FIT-001',
        },
      ],
    });
  }

  async parseCSV(content: string, bankCode: string): Promise<Result<{ accountNumber: string; bankCode: string; startDate: Date; endDate: Date; openingBalance: Money; closingBalance: Money; transactions: Array<{ id: string; date: Date; amount: Money; type: 'CREDIT' | 'DEBIT'; description: string; balance?: Money; fitId?: string; checkNumber?: string; memo?: string }> }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return this.parseOFX(content);
  }
}

