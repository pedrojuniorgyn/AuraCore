/**
 * CreateReceivable Contract Tests
 * Testes de contrato para validação Zod de criação de conta a receber
 */
import { describe, it, expect } from 'vitest';
import { CreateReceivableInputSchema } from '@/modules/financial/application/dtos/CreateReceivableDTO';

describe('CreateReceivable Contract', () => {
  const validInput = {
    customerId: 1,
    documentNumber: 'NF-001',
    description: 'Venda de serviços',
    amount: 1500.50,
    dueDate: new Date('2026-02-15'),
  };

  describe('Valid Inputs', () => {
    it('should accept valid input with required fields', () => {
      const result = CreateReceivableInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with all fields', () => {
      const fullInput = {
        ...validInput,
        currency: 'USD',
        issueDate: new Date('2026-01-15'),
        discountUntil: new Date('2026-02-01'),
        discountAmount: 100,
        fineRate: 3,
        interestRate: 2,
        origin: 'FISCAL_CTE' as const,
        categoryId: 10,
        costCenterId: 20,
        chartAccountId: 30,
        notes: 'Observação importante',
      };

      const result = CreateReceivableInputSchema.safeParse(fullInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.origin).toBe('FISCAL_CTE');
        expect(result.data.currency).toBe('USD');
      }
    });

    it('should apply default values', () => {
      const result = CreateReceivableInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('BRL');
        expect(result.data.origin).toBe('MANUAL');
        expect(result.data.fineRate).toBe(2);
        expect(result.data.interestRate).toBe(1);
      }
    });

    it('should accept all valid origins', () => {
      const origins = ['MANUAL', 'FISCAL_NFE', 'FISCAL_CTE', 'SALE', 'IMPORT'] as const;
      
      for (const origin of origins) {
        const input = { ...validInput, origin };
        const result = CreateReceivableInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing customerId', () => {
      const { customerId, ...input } = validInput;
      const result = CreateReceivableInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid customerId', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, customerId: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject empty documentNumber', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, documentNumber: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, description: '' });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, amount: -100 });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, amount: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency length', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, currency: 'BRRL' });
      expect(result.success).toBe(false);
    });

    it('should reject dueDate before issueDate', () => {
      const result = CreateReceivableInputSchema.safeParse({
        ...validInput,
        issueDate: new Date('2026-02-28'),
        dueDate: new Date('2026-02-01'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid origin', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, origin: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('should reject negative fineRate', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, fineRate: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject fineRate over 100', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, fineRate: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 1000 characters', () => {
      const result = CreateReceivableInputSchema.safeParse({ ...validInput, notes: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
    });
  });
});
