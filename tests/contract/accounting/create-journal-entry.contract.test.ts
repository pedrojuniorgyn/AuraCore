/**
 * Testes de Contrato - CreateJournalEntry DTO
 *
 * Valida o schema Zod para criação de lançamentos contábeis,
 * incluindo a regra crítica de PARTIDAS DOBRADAS.
 *
 * @module tests/contract/accounting
 * @see ONDA 7.4 - Migração Accounting
 */

import { describe, it, expect } from 'vitest';
import { CreateJournalEntryInputSchema } from '@/modules/accounting/application/dtos/CreateJournalEntryDTO';

describe('CreateJournalEntry Contract', () => {
  // Fixtures
  const validUUID1 = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '123e4567-e89b-12d3-a456-426614174001';
  const validUUID3 = '123e4567-e89b-12d3-a456-426614174002';

  const debitLine = {
    accountId: validUUID1,
    accountCode: '1.1.01.001',
    entryType: 'DEBIT' as const,
    amount: 1000.00,
  };

  const creditLine = {
    accountId: validUUID2,
    accountCode: '2.1.01.001',
    entryType: 'CREDIT' as const,
    amount: 1000.00,
  };

  const validInput = {
    entryDate: '2026-01-19T10:00:00.000Z',
    description: 'Lançamento de teste',
    source: 'MANUAL' as const,
    lines: [debitLine, creditLine],
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept balanced entry (debit = credit)', () => {
      const result = CreateJournalEntryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept entry without lines (lines added later)', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        entryDate: '2026-01-19T10:00:00.000Z',
        description: 'Lançamento sem linhas iniciais',
        source: 'MANUAL',
        lines: [],
      });
      expect(result.success).toBe(true);
    });

    it('should accept entry without lines property (default empty)', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        entryDate: '2026-01-19T10:00:00.000Z',
        description: 'Lançamento sem linhas iniciais',
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple debit lines with single credit (balanced)', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 600 },
          { ...debitLine, accountId: validUUID3, accountCode: '1.1.01.002', amount: 400 },
          { ...creditLine, amount: 1000 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple credit lines with single debit (balanced)', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 1000 },
          { ...creditLine, amount: 600 },
          { ...creditLine, accountId: validUUID3, accountCode: '2.1.01.002', amount: 400 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid source types', () => {
      const sources = ['MANUAL', 'PAYMENT', 'RECEIPT', 'FISCAL_DOC', 'DEPRECIATION', 'PROVISION', 'CLOSING', 'ADJUSTMENT'];
      
      for (const source of sources) {
        const result = CreateJournalEntryInputSchema.safeParse({
          ...validInput,
          source,
        });
        expect(result.success, `Source ${source} should be valid`).toBe(true);
      }
    });

    it('should accept lines with optional fields', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          {
            ...debitLine,
            description: 'Linha com descrição',
            costCenterId: 1,
            businessPartnerId: 100,
          },
          {
            ...creditLine,
            currency: 'USD',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept small rounding differences (< 0.01)', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 1000.009 },
          { ...creditLine, amount: 1000.00 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept entry with sourceId and notes', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        sourceId: validUUID1,
        notes: 'Notas adicionais sobre o lançamento',
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - PARTIDAS DOBRADAS
  // =========================================================================

  describe('Partidas Dobradas (Casos Inválidos)', () => {
    it('should reject unbalanced entry (debit > credit)', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 1000 },
          { ...creditLine, amount: 500 },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('Partidas dobradas');
      }
    });

    it('should reject unbalanced entry (credit > debit)', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 500 },
          { ...creditLine, amount: 1000 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject entry with only debits', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine },
          { ...debitLine, accountId: validUUID3, accountCode: '1.1.01.002' },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('crédito');
      }
    });

    it('should reject entry with only credits', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...creditLine },
          { ...creditLine, accountId: validUUID3, accountCode: '2.1.01.002' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject entry with single line', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [debitLine],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('ao menos 2 linhas');
      }
    });

    it('should show correct totals in error message', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 1500.00 },
          { ...creditLine, amount: 1000.00 },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('1500.00');
        expect(message).toContain('1000.00');
      }
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - ESTRUTURA
  // =========================================================================

  describe('Validação de Estrutura', () => {
    it('should reject empty description', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        description: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 500 chars', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        description: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        entryDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid source type', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        source: 'INVALID_SOURCE',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: -1000 },
          { ...creditLine, amount: -1000 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 0 },
          { ...creditLine, amount: 0 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid entry type', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, entryType: 'INVALID' },
          creditLine,
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid account ID format', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, accountId: 'not-a-uuid' },
          creditLine,
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing account code', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, accountCode: '' },
          creditLine,
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject currency with wrong length', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, currency: 'REAL' },
          creditLine,
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 1000 chars', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        notes: 'x'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sourceId format', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        sourceId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle large amounts correctly', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 999999999.99 },
          { ...creditLine, amount: 999999999.99 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should handle small amounts correctly', () => {
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          { ...debitLine, amount: 0.01 },
          { ...creditLine, amount: 0.01 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should handle many lines correctly', () => {
      const manyDebits = Array.from({ length: 10 }, (_, i) => ({
        ...debitLine,
        accountId: `123e4567-e89b-12d3-a456-42661417${String(i).padStart(4, '0')}`,
        accountCode: `1.1.01.${String(i + 1).padStart(3, '0')}`,
        amount: 100,
      }));
      
      const result = CreateJournalEntryInputSchema.safeParse({
        ...validInput,
        lines: [
          ...manyDebits,
          { ...creditLine, amount: 1000 }, // Total debits = 1000
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
