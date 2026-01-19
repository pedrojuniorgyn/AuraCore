/**
 * ReceivePayment Contract Tests
 * Testes de contrato para validação Zod de registro de recebimento
 */
import { describe, it, expect } from 'vitest';
import { ReceivePaymentInputSchema } from '@/modules/financial/application/dtos/ReceivePaymentDTO';

describe('ReceivePayment Contract', () => {
  const validInput = {
    receivableId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 1000.50,
    bankAccountId: 1,
  };

  describe('Valid Inputs', () => {
    it('should accept valid input with required fields', () => {
      const result = ReceivePaymentInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with all fields', () => {
      const fullInput = {
        ...validInput,
        paymentDate: new Date('2026-01-20'),
        notes: 'Pagamento via PIX',
      };

      const result = ReceivePaymentInputSchema.safeParse(fullInput);
      expect(result.success).toBe(true);
    });

    it('should accept small amount', () => {
      const input = { ...validInput, amount: 0.01 };
      const result = ReceivePaymentInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept large amount', () => {
      const input = { ...validInput, amount: 999999999.99 };
      const result = ReceivePaymentInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing receivableId', () => {
      const { receivableId, ...input } = validInput;
      const result = ReceivePaymentInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid receivableId UUID', () => {
      const result = ReceivePaymentInputSchema.safeParse({ ...validInput, receivableId: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject missing amount', () => {
      const { amount, ...input } = validInput;
      const result = ReceivePaymentInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = ReceivePaymentInputSchema.safeParse({ ...validInput, amount: -100 });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = ReceivePaymentInputSchema.safeParse({ ...validInput, amount: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject missing bankAccountId', () => {
      const { bankAccountId, ...input } = validInput;
      const result = ReceivePaymentInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative bankAccountId', () => {
      const result = ReceivePaymentInputSchema.safeParse({ ...validInput, bankAccountId: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 500 characters', () => {
      const result = ReceivePaymentInputSchema.safeParse({ ...validInput, notes: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });
});
