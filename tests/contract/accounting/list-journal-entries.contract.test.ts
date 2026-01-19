/**
 * Testes de Contrato - ListJournalEntries Input
 *
 * Valida as interfaces de input para listagem de lançamentos contábeis.
 *
 * @module tests/contract/accounting
 * @see ONDA 7.4 - Migração Accounting
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schema para validação do input de listagem
const ListJournalEntriesInputSchema = z.object({
  status: z.array(z.enum([
    'DRAFT',
    'PENDING',
    'POSTED',
    'REVERSED',
    'CANCELLED',
  ])).optional(),
  source: z.array(z.enum([
    'MANUAL',
    'PAYMENT',
    'RECEIPT',
    'FISCAL_DOC',
    'DEPRECIATION',
    'PROVISION',
    'CLOSING',
    'ADJUSTMENT',
  ])).optional(),
  periodYear: z.number().int().min(2000).max(2100).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  entryDateFrom: z.string().datetime().optional(),
  entryDateTo: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum([
    'entryDate',
    'entryNumber',
    'description',
    'status',
    'createdAt',
  ]).default('entryDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).refine(
  (data) => {
    // Se periodMonth for fornecido, periodYear também deve ser
    if (data.periodMonth && !data.periodYear) {
      return false;
    }
    return true;
  },
  {
    message: 'periodYear é obrigatório quando periodMonth é fornecido',
    path: ['periodYear'],
  }
).refine(
  (data) => {
    // entryDateTo deve ser >= entryDateFrom
    if (data.entryDateFrom && data.entryDateTo) {
      return new Date(data.entryDateTo) >= new Date(data.entryDateFrom);
    }
    return true;
  },
  {
    message: 'Data final deve ser maior ou igual à data inicial',
    path: ['entryDateTo'],
  }
);

describe('ListJournalEntries Contract', () => {
  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept empty input (use defaults)', () => {
      const result = ListJournalEntriesInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.sortBy).toBe('entryDate');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should accept filter by single status', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        status: ['POSTED'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept filter by multiple statuses', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        status: ['DRAFT', 'PENDING', 'POSTED'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept filter by source', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        source: ['MANUAL', 'FISCAL_DOC'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept filter by period (year + month)', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        periodYear: 2026,
        periodMonth: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept filter by period (year only)', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        periodYear: 2026,
      });
      expect(result.success).toBe(true);
    });

    it('should accept date range filter', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        entryDateFrom: '2026-01-01T00:00:00.000Z',
        entryDateTo: '2026-01-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept text search', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        search: 'pagamento fornecedor',
      });
      expect(result.success).toBe(true);
    });

    it('should accept pagination options', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        page: 5,
        pageSize: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should accept sort options', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        sortBy: 'entryNumber',
        sortOrder: 'asc',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all filters combined', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        status: ['POSTED'],
        source: ['MANUAL'],
        periodYear: 2026,
        periodMonth: 1,
        entryDateFrom: '2026-01-01T00:00:00.000Z',
        entryDateTo: '2026-01-31T23:59:59.999Z',
        search: 'teste',
        page: 1,
        pageSize: 20,
        sortBy: 'entryDate',
        sortOrder: 'desc',
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS
  // =========================================================================

  describe('Casos Inválidos', () => {
    it('should reject invalid status', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        status: ['INVALID_STATUS'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid source', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        source: ['INVALID_SOURCE'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject periodMonth without periodYear', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        periodMonth: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('periodYear');
      }
    });

    it('should reject invalid periodMonth', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        periodYear: 2026,
        periodMonth: 13,
      });
      expect(result.success).toBe(false);
    });

    it('should reject periodMonth = 0', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        periodYear: 2026,
        periodMonth: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        entryDateFrom: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should reject entryDateTo before entryDateFrom', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        entryDateFrom: '2026-01-31T00:00:00.000Z',
        entryDateTo: '2026-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject search longer than 100 chars', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        search: 'x'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should reject page < 1', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject pageSize > 100', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        pageSize: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sortBy', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        sortBy: 'invalidField',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sortOrder', () => {
      const result = ListJournalEntriesInputSchema.safeParse({
        sortOrder: 'random',
      });
      expect(result.success).toBe(false);
    });
  });
});
