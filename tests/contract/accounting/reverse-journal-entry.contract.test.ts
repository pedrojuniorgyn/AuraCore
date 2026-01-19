/**
 * Testes de Contrato - ReverseJournalEntry Input
 *
 * Valida o schema para reversão (estorno) de lançamentos contábeis.
 *
 * @module tests/contract/accounting
 * @see ONDA 7.4 - Migração Accounting
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schema para validação do input de reversão
const ReverseJournalEntryInputSchema = z.object({
  journalEntryId: z.string().uuid('ID do lançamento inválido'),
  reason: z.string()
    .min(10, 'Motivo do estorno deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo do estorno não pode exceder 500 caracteres'),
  reversalDate: z.string().datetime().optional(),
});

describe('ReverseJournalEntry Contract', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  const validInput = {
    journalEntryId: validUUID,
    reason: 'Estorno devido a erro na classificação contábil',
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept valid reversal request', () => {
      const result = ReverseJournalEntryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept reversal with specific date', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reversalDate: '2026-01-19T10:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept reason with exactly 10 characters', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: '1234567890', // 10 chars
      });
      expect(result.success).toBe(true);
    });

    it('should accept reason with exactly 500 characters', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: 'x'.repeat(500),
      });
      expect(result.success).toBe(true);
    });

    it('should accept detailed reason', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: 'Estorno necessário devido a lançamento incorreto na conta de despesas. ' +
                'O valor correto deveria ter sido lançado na conta de imobilizado. ' +
                'Solicitado pelo departamento financeiro conforme e-mail de 15/01/2026.',
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS
  // =========================================================================

  describe('Casos Inválidos', () => {
    it('should reject invalid journal entry ID', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        journalEntryId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty journal entry ID', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        journalEntryId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reason shorter than 10 characters', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: 'Erro', // 4 chars
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('10 caracteres');
      }
    });

    it('should reject reason longer than 500 characters', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing reason', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        journalEntryId: validUUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid reversalDate format', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reversalDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reversalDate as simple date (without time)', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reversalDate: '2026-01-19',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing journalEntryId', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        reason: 'Motivo do estorno válido',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle reason with special characters', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: 'Estorno devido a valor R$ 1.000,00 incorreto - ref. NF 123/456',
      });
      expect(result.success).toBe(true);
    });

    it('should handle reason with unicode characters', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: 'Estorno necessário conforme análise técnica 📊 aprovada pela gerência ✓',
      });
      expect(result.success).toBe(true);
    });

    it('should handle reason with line breaks', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: 'Estorno necessário.\nMotivo: erro de classificação.\nAprovado por: João Silva',
      });
      expect(result.success).toBe(true);
    });

    it('should handle whitespace-only reason', () => {
      const result = ReverseJournalEntryInputSchema.safeParse({
        ...validInput,
        reason: '          ', // 10 spaces
      });
      // Spaces count as characters, so this technically passes the min length
      // But this is a valid edge case to document
      expect(result.success).toBe(true);
    });
  });
});
