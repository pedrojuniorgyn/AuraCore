/**
 * Testes de Contrato - PostJournalEntry Input
 *
 * Valida o schema para postagem (efetivação) de lançamentos contábeis.
 *
 * @module tests/contract/accounting
 * @see ONDA 7.4 - Migração Accounting
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schema para validação do input de postagem
const PostJournalEntryInputSchema = z.object({
  journalEntryId: z.string().uuid('ID do lançamento inválido'),
  postingDate: z.string().datetime().optional(),
  validateBalance: z.boolean().default(true),
  forcePost: z.boolean().default(false),
});

describe('PostJournalEntry Contract', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  const validInput = {
    journalEntryId: validUUID,
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept minimal valid input', () => {
      const result = PostJournalEntryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const result = PostJournalEntryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validateBalance).toBe(true);
        expect(result.data.forcePost).toBe(false);
      }
    });

    it('should accept explicit postingDate', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        ...validInput,
        postingDate: '2026-01-19T10:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept validateBalance = false', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        ...validInput,
        validateBalance: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept forcePost = true', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        ...validInput,
        forcePost: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all options combined', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        journalEntryId: validUUID,
        postingDate: '2026-01-19T10:00:00.000Z',
        validateBalance: true,
        forcePost: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS
  // =========================================================================

  describe('Casos Inválidos', () => {
    it('should reject invalid journal entry ID', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        journalEntryId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty journal entry ID', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        journalEntryId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing journal entry ID', () => {
      const result = PostJournalEntryInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid postingDate format', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        ...validInput,
        postingDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should reject postingDate as simple date', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        ...validInput,
        postingDate: '2026-01-19',
      });
      expect(result.success).toBe(false);
    });

    it('should reject validateBalance as string', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        ...validInput,
        validateBalance: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('should reject forcePost as string', () => {
      const result = PostJournalEntryInputSchema.safeParse({
        ...validInput,
        forcePost: 'false',
      });
      expect(result.success).toBe(false);
    });
  });
});
