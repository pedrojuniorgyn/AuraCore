/**
 * Value Objects Tests
 * E7.9 Integrações - Semana 1
 */

import { describe, it, expect } from 'vitest';
import { SefazResponse } from '../domain/value-objects/SefazResponse';
import { BankSlip } from '../domain/value-objects/BankSlip';
import { PixCharge } from '../domain/value-objects/PixCharge';
import { BankTransaction } from '../domain/value-objects/BankTransaction';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

describe('Value Objects', () => {
  describe('SefazResponse', () => {
    it('should create successful response', () => {
      const result = SefazResponse.success(
        '100',
        'Autorizado',
        'PROT123',
        new Date()
      );

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.isSuccess).toBe(true);
      expect(result.value.code).toBe('100');
      expect(result.value.protocol).toBe('PROT123');
    });

    it('should create failure response', () => {
      const result = SefazResponse.failure('539', 'Duplicidade de CTe');

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.isSuccess).toBe(false);
      expect(result.value.code).toBe('539');
      expect(result.value.protocol).toBeUndefined();
    });

    it('should fail when code is empty', () => {
      const result = SefazResponse.failure('', 'Invalid');

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('BankSlip', () => {
    it('should create bank slip successfully', () => {
      const moneyResult = Money.create(10000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);

      const result = BankSlip.create({
        id: 'SLIP-123',
        barcode: '23790001192110001210904475617405975870000010000',
        digitableLine: '23790.00119 21100.012109 04475.617405 9 75870000010000',
        dueDate: new Date('2024-12-31'),
        amount: moneyResult.value,
        status: 'PENDING',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.id).toBe('SLIP-123');
      expect(result.value.isPaid).toBe(false);
    });

    it('should fail when required fields are missing', () => {
      const moneyResult = Money.create(10000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);
      if (!Result.isOk(moneyResult)) return;

      const result = BankSlip.create({
        id: '',
        barcode: '',
        digitableLine: '',
        dueDate: new Date(),
        amount: moneyResult.value,
        status: 'PENDING',
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('PixCharge', () => {
    it('should create Pix charge successfully', () => {
      const moneyResult = Money.create(5000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      const result = PixCharge.create({
        txId: 'PIX-123',
        qrCode: '00020126580014br.gov.bcb.pix...',
        qrCodeImage: 'data:image/png;base64,...',
        amount: moneyResult.value,
        expiresAt,
        status: 'ACTIVE',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.txId).toBe('PIX-123');
      expect(result.value.isActive).toBe(true);
      expect(result.value.isCompleted).toBe(false);
    });

    it('should fail when status is COMPLETED but completedAt is missing', () => {
      const moneyResult = Money.create(5000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);
      if (!Result.isOk(moneyResult)) return;

      const result = PixCharge.create({
        txId: 'PIX-123',
        qrCode: '00020126580014br.gov.bcb.pix...',
        qrCodeImage: 'data:image/png;base64,...',
        amount: moneyResult.value,
        expiresAt: new Date(),
        status: 'COMPLETED',
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('BankTransaction', () => {
    it('should create bank transaction successfully', () => {
      const moneyResult = Money.create(50000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);

      const result = BankTransaction.create({
        id: 'TXN-001',
        date: new Date('2024-01-15'),
        amount: moneyResult.value,
        type: 'CREDIT',
        description: 'Payment received',
        fitId: 'FIT-001',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.id).toBe('TXN-001');
      expect(result.value.isCredit).toBe(true);
      expect(result.value.isDebit).toBe(false);
    });

    it('should create debit transaction', () => {
      const moneyResult = Money.create(20000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);
      if (!Result.isOk(moneyResult)) return;

      const result = BankTransaction.create({
        id: 'TXN-002',
        date: new Date('2024-01-16'),
        amount: moneyResult.value,
        type: 'DEBIT',
        description: 'Payment made',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.isCredit).toBe(false);
      expect(result.value.isDebit).toBe(true);
    });

    it('should fail when required fields are missing', () => {
      const moneyResult = Money.create(10000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);
      if (!Result.isOk(moneyResult)) return;

      const result = BankTransaction.create({
        id: '',
        date: new Date(),
        amount: moneyResult.value,
        type: 'CREDIT',
        description: '',
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });
});

