/**
 * CancelFiscalDocument Contract Tests
 * Testes de contrato para validação Zod de cancelamento de documento fiscal
 */
import { describe, it, expect } from 'vitest';
import { CancelFiscalDocumentDtoSchema } from '@/modules/fiscal/application/dtos/CancelFiscalDocumentDTO';

describe('CancelFiscalDocument Contract', () => {
  const validInput = {
    fiscalDocumentId: '123e4567-e89b-12d3-a456-426614174000',
    reason: 'Erro na digitação dos dados do produto',
  };

  describe('Valid Inputs', () => {
    it('should accept valid input', () => {
      const result = CancelFiscalDocumentDtoSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept reason with exactly 15 characters', () => {
      const result = CancelFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        reason: 'a'.repeat(15),
      });
      expect(result.success).toBe(true);
    });

    it('should accept reason with 255 characters', () => {
      const result = CancelFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        reason: 'a'.repeat(255),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing fiscalDocumentId', () => {
      const { fiscalDocumentId, ...input } = validInput;
      const result = CancelFiscalDocumentDtoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const result = CancelFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        fiscalDocumentId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing reason', () => {
      const { reason, ...input } = validInput;
      const result = CancelFiscalDocumentDtoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject reason too short (less than 15 chars)', () => {
      const result = CancelFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        reason: 'Motivo curto',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reason too long (more than 255 chars)', () => {
      const result = CancelFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        reason: 'a'.repeat(256),
      });
      expect(result.success).toBe(false);
    });
  });
});
