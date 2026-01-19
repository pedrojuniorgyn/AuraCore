/**
 * Testes de Contrato - AddLine DTO
 *
 * Valida o schema Zod para adicionar linhas a lançamentos contábeis.
 *
 * @module tests/contract/accounting
 * @see ONDA 7.4 - Migração Accounting
 */

import { describe, it, expect } from 'vitest';
import { AddLineInputSchema } from '@/modules/accounting/application/dtos/AddLineDTO';

describe('AddLine Contract', () => {
  const validUUID1 = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '123e4567-e89b-12d3-a456-426614174001';

  const validInput = {
    journalEntryId: validUUID1,
    accountId: validUUID2,
    accountCode: '1.1.01.001',
    entryType: 'DEBIT' as const,
    amount: 1000.00,
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept valid debit line', () => {
      const result = AddLineInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid credit line', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        entryType: 'CREDIT',
      });
      expect(result.success).toBe(true);
    });

    it('should accept line with all optional fields', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        currency: 'USD',
        description: 'Descrição da linha',
        costCenterId: 1,
        businessPartnerId: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should default currency to BRL', () => {
      const result = AddLineInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('BRL');
      }
    });

    it('should accept small amounts (0.01)', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        amount: 0.01,
      });
      expect(result.success).toBe(true);
    });

    it('should accept large amounts', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        amount: 999999999.99,
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS
  // =========================================================================

  describe('Casos Inválidos', () => {
    it('should reject invalid journal entry ID', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        journalEntryId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid account ID', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        accountId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty account code', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        accountCode: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid entry type', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        entryType: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject currency with wrong length', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        currency: 'REAL',
      });
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 200 chars', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        description: 'x'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive costCenterId', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        costCenterId: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer costCenterId', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        costCenterId: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive businessPartnerId', () => {
      const result = AddLineInputSchema.safeParse({
        ...validInput,
        businessPartnerId: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const result = AddLineInputSchema.safeParse({
        journalEntryId: validUUID1,
        // Missing other required fields
      });
      expect(result.success).toBe(false);
    });
  });
});
