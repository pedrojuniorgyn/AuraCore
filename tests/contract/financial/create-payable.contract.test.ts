/**
 * CreatePayable Contract Tests
 * Testes de contrato para validação Zod de criação de conta a pagar
 */
import { describe, it, expect } from 'vitest';
import { CreatePayableInputSchema } from '@/modules/financial/application/dtos/CreatePayableDTO';

describe('CreatePayable Contract', () => {
  const validInput = {
    supplierId: 1,
    documentNumber: 'NF-001',
    description: 'Compra de materiais',
    amount: 2500.00,
    dueDate: '2026-02-15T00:00:00.000Z',
  };

  describe('Valid Inputs', () => {
    it('should accept valid input with required fields', () => {
      const result = CreatePayableInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with all fields', () => {
      const fullInput = {
        ...validInput,
        currency: 'USD',
        categoryId: 10,
        costCenterId: 20,
        notes: 'Observação',
        discountUntil: '2026-02-01T00:00:00.000Z',
        discountAmount: 100,
        fineRate: 3,
        interestRate: 2,
      };

      const result = CreatePayableInputSchema.safeParse(fullInput);
      expect(result.success).toBe(true);
    });

    it('should apply default currency BRL', () => {
      const result = CreatePayableInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('BRL');
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing supplierId', () => {
      const { supplierId, ...input } = validInput;
      const result = CreatePayableInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative supplierId', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, supplierId: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject empty documentNumber', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, documentNumber: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, description: '' });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, amount: -100 });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, amount: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency length', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, currency: 'BRRL' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid dueDate format', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, dueDate: 'invalid-date' });
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 1000 characters', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, notes: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
    });

    it('should reject negative fineRate', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, fineRate: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject fineRate over 100', () => {
      const result = CreatePayableInputSchema.safeParse({ ...validInput, fineRate: 101 });
      expect(result.success).toBe(false);
    });
  });
});
