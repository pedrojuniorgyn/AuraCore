/**
 * Integration Tests - Financial Payables
 * E7.27 - Testes de Integração
 *
 * Testa fluxos completos de Contas a Pagar com foco em regras de negócio.
 *
 * @see REPO-005: TODA query filtra organizationId + branchId
 * @see REPO-006: Soft delete: filtrar deletedAt IS NULL
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { AccountPayable } from '@/modules/financial/domain/entities/AccountPayable';
import { Payment } from '@/modules/financial/domain/entities/Payment';
import { PaymentTerms } from '@/modules/financial/domain/value-objects/PaymentTerms';

describe('Financial Payables - Integration Tests', () => {
  // ==================== CREATE PAYABLE TESTS ====================

  describe('Create Payable Flow', () => {
    it('should create a payable with valid input', () => {
      const amountResult = Money.create(1000, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);

      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
      });
      expect(Result.isOk(termsResult)).toBe(true);

      const payableResult = AccountPayable.create({
        id: 'payable-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 1,
        documentNumber: 'NF-12345',
        description: 'Compra de materiais',
        terms: termsResult.value!,
      });

      expect(Result.isOk(payableResult)).toBe(true);
      if (Result.isOk(payableResult)) {
        expect(payableResult.value.id).toBe('payable-001');
        expect(payableResult.value.documentNumber).toBe('NF-12345');
        expect(payableResult.value.status).toBe('OPEN');
        expect(payableResult.value.organizationId).toBe(1);
        expect(payableResult.value.branchId).toBe(1);
      }
    });

    it('should allow negative amount (for credit notes)', () => {
      const amountResult = Money.create(-100, 'BRL');

      expect(Result.isOk(amountResult)).toBe(true);
      if (Result.isOk(amountResult)) {
        expect(amountResult.value.amount).toBe(-100);
      }
    });

    it('should reject discount date after due date', () => {
      const amountResult = Money.create(1000, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);

      const discountResult = Money.create(50, 'BRL');
      expect(Result.isOk(discountResult)).toBe(true);

      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
        discountUntil: new Date('2026-02-20'), // After due date
        discountAmount: discountResult.value!,
      });

      expect(Result.isFail(termsResult)).toBe(true);
      if (Result.isFail(termsResult)) {
        expect(termsResult.error).toContain('Discount');
      }
    });

    it('should create payable with discount terms', () => {
      const amountResult = Money.create(1000, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);

      const discountResult = Money.create(50, 'BRL');
      expect(Result.isOk(discountResult)).toBe(true);

      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
        discountUntil: new Date('2026-02-10'), // Before due date
        discountAmount: discountResult.value!,
      });

      expect(Result.isOk(termsResult)).toBe(true);
      if (Result.isOk(termsResult)) {
        expect(termsResult.value.hasDiscountAvailable(new Date('2026-02-08'))).toBe(true);
        expect(termsResult.value.discountAmount?.amount).toBe(50);
      }
    });
  });

  // ==================== PAYMENT TESTS ====================

  describe('Payment Flow', () => {
    it('should create valid payment', () => {
      const amountResult = Money.create(1000, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);

      const paymentResult = Payment.create({
        id: 'payment-001',
        payableId: 'payable-001',
        amount: amountResult.value!,
        method: 'TED',
      });

      expect(Result.isOk(paymentResult)).toBe(true);
      if (Result.isOk(paymentResult)) {
        expect(paymentResult.value.id).toBe('payment-001');
        expect(paymentResult.value.amount.amount).toBe(1000);
      }
    });

    it('should register payment for payable', () => {
      // Create payable
      const amountResult = Money.create(1000, 'BRL');
      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
      });

      const payableResult = AccountPayable.create({
        id: 'payable-002',
        organizationId: 1,
        branchId: 1,
        supplierId: 1,
        documentNumber: 'NF-54321',
        description: 'Test payable',
        terms: termsResult.value!,
      });

      expect(Result.isOk(payableResult)).toBe(true);
      const payable = payableResult.value!;

      // Create payment
      const paymentAmountResult = Money.create(1000, 'BRL');
      const paymentResult = Payment.create({
        id: 'payment-001',
        payableId: 'payable-002',
        amount: paymentAmountResult.value!,
        method: 'TED',
      });

      expect(Result.isOk(paymentResult)).toBe(true);

      // Register payment
      const registerResult = payable.registerPayment(paymentResult.value!);
      expect(Result.isOk(registerResult)).toBe(true);

      // Confirm payment
      const confirmResult = payable.confirmPayment('payment-001');
      expect(Result.isOk(confirmResult)).toBe(true);

      // Assert
      expect(payable.status).toBe('PAID');
      expect(payable.remainingAmount.amount).toBe(0);
    });

    it('should allow partial payment', () => {
      // Arrange
      const amountResult = Money.create(1000, 'BRL');
      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
      });

      const payableResult = AccountPayable.create({
        id: 'payable-003',
        organizationId: 1,
        branchId: 1,
        supplierId: 1,
        documentNumber: 'NF-99999',
        description: 'Partial payment test',
        terms: termsResult.value!,
      });

      const payable = payableResult.value!;

      // Act: Partial payment
      const paymentAmountResult = Money.create(600, 'BRL');
      const paymentResult = Payment.create({
        id: 'payment-partial',
        payableId: 'payable-003',
        amount: paymentAmountResult.value!,
        method: 'TED',
      });

      payable.registerPayment(paymentResult.value!);
      payable.confirmPayment('payment-partial');

      // Assert
      expect(payable.status).toBe('PARTIAL');
      expect(payable.remainingAmount.amount).toBe(400);
    });

    it('should reject payment for cancelled payable', () => {
      // Arrange
      const amountResult = Money.create(1000, 'BRL');
      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
      });

      const payableResult = AccountPayable.create({
        id: 'payable-cancelled',
        organizationId: 1,
        branchId: 1,
        supplierId: 1,
        documentNumber: 'NF-CANCEL',
        description: 'Cancelled payable',
        terms: termsResult.value!,
      });

      const payable = payableResult.value!;
      payable.cancel('Test cancellation', 'test-user');

      // Act
      const paymentAmountResult = Money.create(1000, 'BRL');
      const paymentResult = Payment.create({
        id: 'payment-after-cancel',
        payableId: 'payable-cancelled',
        amount: paymentAmountResult.value!,
        method: 'TED',
      });

      const registerResult = payable.registerPayment(paymentResult.value!);

      // Assert
      expect(Result.isFail(registerResult)).toBe(true);
      if (Result.isFail(registerResult)) {
        expect(registerResult.error.toLowerCase()).toContain('cancel');
      }
    });

    it('should reject overpayment', () => {
      // Arrange
      const amountResult = Money.create(1000, 'BRL');
      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
      });

      const payableResult = AccountPayable.create({
        id: 'payable-overpay',
        organizationId: 1,
        branchId: 1,
        supplierId: 1,
        documentNumber: 'NF-OVER',
        description: 'Overpayment test',
        terms: termsResult.value!,
      });

      const payable = payableResult.value!;

      // Act: Try to overpay
      const paymentAmountResult = Money.create(1500, 'BRL');
      const paymentResult = Payment.create({
        id: 'payment-over',
        payableId: 'payable-overpay',
        amount: paymentAmountResult.value!,
        method: 'TED',
      });

      const registerResult = payable.registerPayment(paymentResult.value!);

      // Assert
      expect(Result.isFail(registerResult)).toBe(true);
      if (Result.isFail(registerResult)) {
        expect(registerResult.error.toLowerCase()).toContain('exceed');
      }
    });
  });

  // ==================== MULTI-TENANCY TESTS ====================

  describe('Multi-tenancy Validation', () => {
    it('should create payable with organization and branch IDs', () => {
      const amountResult = Money.create(1000, 'BRL');
      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
      });

      const payableResult = AccountPayable.create({
        id: 'payable-tenant',
        organizationId: 42,
        branchId: 7,
        supplierId: 1,
        documentNumber: 'NF-TENANT',
        description: 'Tenant test',
        terms: termsResult.value!,
      });

      expect(Result.isOk(payableResult)).toBe(true);
      if (Result.isOk(payableResult)) {
        expect(payableResult.value.organizationId).toBe(42);
        expect(payableResult.value.branchId).toBe(7);
      }
    });
  });

  // ==================== MONEY VALUE OBJECT TESTS ====================

  describe('Money Operations', () => {
    it('should add money values', () => {
      const money1 = Money.create(500, 'BRL').value!;
      const money2 = Money.create(300, 'BRL').value!;

      const result = money1.add(money2);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(800);
      }
    });

    it('should subtract money values', () => {
      const money1 = Money.create(1000, 'BRL').value!;
      const money2 = Money.create(250, 'BRL').value!;

      const result = money1.subtract(money2);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(750);
      }
    });

    it('should reject operations with different currencies', () => {
      const brl = Money.create(1000, 'BRL').value!;
      const usd = Money.create(100, 'USD').value!;

      const result = brl.add(usd);

      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ==================== PAYMENT TERMS TESTS ====================

  describe('Payment Terms', () => {
    it('should detect overdue payment', () => {
      const amountResult = Money.create(1000, 'BRL');
      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-01-15'), // Past date
        amount: amountResult.value!,
      });

      expect(Result.isOk(termsResult)).toBe(true);
      if (Result.isOk(termsResult)) {
        expect(termsResult.value.isOverdue(new Date('2026-01-20'))).toBe(true);
        expect(termsResult.value.isOverdue(new Date('2026-01-10'))).toBe(false);
      }
    });

    it('should check discount availability', () => {
      const amountResult = Money.create(1000, 'BRL');
      const discountResult = Money.create(100, 'BRL');

      const termsResult = PaymentTerms.create({
        dueDate: new Date('2026-02-15'),
        amount: amountResult.value!,
        discountUntil: new Date('2026-02-10'),
        discountAmount: discountResult.value!,
      });

      expect(Result.isOk(termsResult)).toBe(true);
      if (Result.isOk(termsResult)) {
        // Before discount deadline
        expect(termsResult.value.hasDiscountAvailable(new Date('2026-02-08'))).toBe(true);
        // After discount deadline
        expect(termsResult.value.hasDiscountAvailable(new Date('2026-02-12'))).toBe(false);
      }
    });
  });
});
