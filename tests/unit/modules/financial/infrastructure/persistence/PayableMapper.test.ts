import { describe, it, expect, beforeEach } from 'vitest';
import { PayableMapper } from '@/modules/financial/infrastructure/persistence/PayableMapper';
import { AccountPayable } from '@/modules/financial/domain/entities/AccountPayable';
import { PaymentTerms } from '@/modules/financial/domain/value-objects/PaymentTerms';
import { Money, Result } from '@/shared/domain';
import type { AccountPayableRow, PaymentRow } from '@/modules/financial/infrastructure/persistence/PayableSchema';

describe('PayableMapper', () => {
  let validPayable: AccountPayable;
  let validMoney: Money;

  beforeEach(() => {
    const moneyResult = Money.create(1000);
    validMoney = moneyResult.value!;

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    const termsResult = PaymentTerms.create({
      dueDate: futureDate,
      amount: validMoney,
    });

    const payableResult = AccountPayable.create({
      id: '550e8400-e29b-41d4-a716-446655440000',
      organizationId: 1,
      branchId: 1,
      supplierId: 100,
      documentNumber: 'NF-12345',
      description: 'Test payable',
      terms: termsResult.value!,
    });

    validPayable = payableResult.value!;
  });

  describe('toPersistence', () => {
    it('should convert domain to persistence model', () => {
      const row = PayableMapper.toPersistence(validPayable);

      expect(row.id).toBe(validPayable.id);
      expect(row.organizationId).toBe(1);
      expect(row.branchId).toBe(1);
      expect(row.supplierId).toBe(100);
      expect(row.documentNumber).toBe('NF-12345');
      expect(row.amount).toBe('1000');
      expect(row.currency).toBe('BRL');
      expect(row.status).toBe('OPEN');
    });
  });

  describe('toDomain', () => {
    it('should convert persistence to domain model', () => {
      const row: AccountPayableRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        amount: '1000.00',
        currency: 'BRL',
        dueDate: new Date('2025-06-30'),
        discountUntil: null,
        discountAmount: null,
        fineRate: '2.00',
        interestRate: '1.00',
        status: 'OPEN',
        categoryId: null,
        costCenterId: null,
        notes: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
        deletedAt: null,
      };

      const result = PayableMapper.toDomain(row, []);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe(row.id);
        expect(result.value.organizationId).toBe(1);
        expect(result.value.status).toBe('OPEN');
        expect(result.value.originalAmount.amount).toBe(1000);
      }
    });

    it('should include payments when provided', () => {
      const payableRow: AccountPayableRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        amount: '1000.00',
        currency: 'BRL',
        dueDate: new Date('2025-06-30'),
        discountUntil: null,
        discountAmount: null,
        fineRate: '2.00',
        interestRate: '1.00',
        status: 'PARTIAL',
        categoryId: null,
        costCenterId: null,
        notes: null,
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
        deletedAt: null,
      };

      const paymentRow: PaymentRow = {
        id: '660e8400-e29b-41d4-a716-446655440001',
        payableId: '550e8400-e29b-41d4-a716-446655440000',
        amount: '500.00',
        currency: 'BRL',
        method: 'PIX',
        status: 'CONFIRMED',
        bankAccountId: null,
        transactionId: 'TXN-123',
        notes: null,
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = PayableMapper.toDomain(payableRow, [paymentRow]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.payments.length).toBe(1);
        expect(result.value.payments[0].amount.amount).toBe(500);
      }
    });
  });
});

