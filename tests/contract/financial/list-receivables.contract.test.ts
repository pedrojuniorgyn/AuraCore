/**
 * ListReceivables Contract Tests
 * Testes de contrato para validação Zod de listagem de contas a receber
 */
import { describe, it, expect } from 'vitest';
import { ListReceivablesInputSchema } from '@/modules/financial/application/dtos/ListReceivablesDTO';

describe('ListReceivables Contract', () => {
  describe('Valid Inputs', () => {
    it('should accept empty input with defaults', () => {
      const result = ListReceivablesInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.overdueOnly).toBe(false);
      }
    });

    it('should accept valid status filter', () => {
      const validStatuses = ['OPEN', 'PROCESSING', 'PARTIAL', 'RECEIVED', 'CANCELLED', 'OVERDUE'] as const;
      
      for (const status of validStatuses) {
        const result = ListReceivablesInputSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid date range', () => {
      const input = {
        dueDateFrom: new Date('2026-01-01'),
        dueDateTo: new Date('2026-12-31'),
      };

      const result = ListReceivablesInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept customer filter', () => {
      const result = ListReceivablesInputSchema.safeParse({ customerId: 123 });
      expect(result.success).toBe(true);
    });

    it('should accept overdueOnly filter', () => {
      const result = ListReceivablesInputSchema.safeParse({ overdueOnly: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overdueOnly).toBe(true);
      }
    });

    it('should accept custom pagination', () => {
      const result = ListReceivablesInputSchema.safeParse({ page: 3, pageSize: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(50);
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject invalid status', () => {
      const result = ListReceivablesInputSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = ListReceivablesInputSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject zero page', () => {
      const result = ListReceivablesInputSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject pageSize greater than 100', () => {
      const result = ListReceivablesInputSchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject pageSize less than 1', () => {
      const result = ListReceivablesInputSchema.safeParse({ pageSize: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative customerId', () => {
      const result = ListReceivablesInputSchema.safeParse({ customerId: -1 });
      expect(result.success).toBe(false);
    });
  });
});
