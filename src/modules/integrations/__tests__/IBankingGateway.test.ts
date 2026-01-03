/**
 * IBankingGateway Tests
 * E7.9 Integrações - Semana 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockBankingGateway } from '../infrastructure/adapters/banking/MockBankingGateway';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

describe('IBankingGateway (Mock)', () => {
  let gateway: MockBankingGateway;

  beforeEach(() => {
    gateway = new MockBankingGateway();
    gateway.resetFailure();
  });

  describe('createBankSlip', () => {
    it('should create bank slip successfully', async () => {
      const moneyResult = Money.create(10000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);

      const result = await gateway.createBankSlip({
        amount: moneyResult.value,
        dueDate: new Date('2024-12-31'),
        recipientName: 'John Doe',
        recipientDocument: '12345678900',
        description: 'Test payment',
        organizationId: 1,
        branchId: 1,
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.id).toContain('MOCK-SLIP');
      expect(result.value.barcode).toBeDefined();
      expect(result.value.digitableLine).toBeDefined();
      expect(result.value.status).toBe('PENDING');
    });

    it('should fail when configured to fail', async () => {
      gateway.setFailure('Bank slip creation failed');

      const moneyResult = Money.create(10000, 'BRL');
      const result = await gateway.createBankSlip({
        amount: moneyResult.value,
        dueDate: new Date('2024-12-31'),
        recipientName: 'John Doe',
        recipientDocument: '12345678900',
        description: 'Test payment',
        organizationId: 1,
        branchId: 1,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('cancelBankSlip', () => {
    it('should cancel bank slip successfully', async () => {
      const result = await gateway.cancelBankSlip('MOCK-SLIP-123');

      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('queryBankSlipStatus', () => {
    it('should query bank slip status successfully', async () => {
      const result = await gateway.queryBankSlipStatus('MOCK-SLIP-123');

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.status).toBe('PENDING');
    });
  });

  describe('createPixCharge', () => {
    it('should create Pix charge successfully', async () => {
      const moneyResult = Money.create(5000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);

      const result = await gateway.createPixCharge({
        amount: moneyResult.value,
        recipientName: 'Jane Doe',
        recipientDocument: '98765432100',
        description: 'Pix test',
        expirationMinutes: 30,
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.txId).toContain('MOCK-PIX');
      expect(result.value.qrCode).toBeDefined();
      expect(result.value.status).toBe('ACTIVE');
    });

    it('should fail when configured to fail', async () => {
      gateway.setFailure('Pix charge creation failed');

      const moneyResult = Money.create(5000, 'BRL');
      const result = await gateway.createPixCharge({
        amount: moneyResult.value,
        recipientName: 'Jane Doe',
        recipientDocument: '98765432100',
        description: 'Pix test',
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('executePayment', () => {
    it('should execute payment successfully', async () => {
      const moneyResult = Money.create(15000, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);

      const result = await gateway.executePayment({
        type: 'PIX',
        amount: moneyResult.value,
        recipientName: 'Supplier Corp',
        recipientDocument: '12345678000199',
        pixKey: 'supplier@example.com',
        description: 'Invoice payment',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.id).toContain('MOCK-PAY');
      expect(result.value.status).toBe('COMPLETED');
    });
  });

  describe('queryDdaDebits', () => {
    it('should query DDA debits successfully', async () => {
      const result = await gateway.queryDdaDebits('12345678000199');

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBeInstanceOf(Array);
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].id).toBe('DDA-001');
    });
  });

  describe('queryBalance', () => {
    it('should query balance successfully', async () => {
      const result = await gateway.queryBalance('ACC-123');

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBeInstanceOf(Money);
    });
  });
});

