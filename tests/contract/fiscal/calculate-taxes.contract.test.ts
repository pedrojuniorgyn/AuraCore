/**
 * CalculateTaxes Contract Tests
 * Testes de contrato para validação Zod de cálculo de impostos
 */
import { describe, it, expect } from 'vitest';
import { CalculateTaxesInputSchema } from '@/modules/fiscal/application/dtos/CalculateTaxesDTO';

describe('CalculateTaxes Contract', () => {
  const validInput = {
    fiscalDocumentId: '123e4567-e89b-12d3-a456-426614174000',
  };

  describe('Valid Inputs', () => {
    it('should accept valid UUID', () => {
      const result = CalculateTaxesInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing fiscalDocumentId', () => {
      const result = CalculateTaxesInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const result = CalculateTaxesInputSchema.safeParse({
        fiscalDocumentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = CalculateTaxesInputSchema.safeParse({
        fiscalDocumentId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject numeric value', () => {
      const result = CalculateTaxesInputSchema.safeParse({
        fiscalDocumentId: 12345,
      });
      expect(result.success).toBe(false);
    });
  });
});
