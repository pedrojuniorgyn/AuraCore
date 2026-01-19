/**
 * SubmitFiscalDocument Contract Tests
 * Testes de contrato para validação Zod de submissão de documento fiscal à SEFAZ
 */
import { describe, it, expect } from 'vitest';
import { SubmitFiscalDocumentDtoSchema } from '@/modules/fiscal/application/dtos/SubmitFiscalDocumentDTO';

describe('SubmitFiscalDocument Contract', () => {
  const validInput = {
    fiscalDocumentId: '123e4567-e89b-12d3-a456-426614174000',
  };

  describe('Valid Inputs', () => {
    it('should accept valid input with only required fields', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transmissionMode).toBe('SYNC');
        expect(result.data.contingencyMode).toBe(false);
      }
    });

    it('should accept SYNC transmission mode', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        transmissionMode: 'SYNC',
      });
      expect(result.success).toBe(true);
    });

    it('should accept ASYNC transmission mode', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        transmissionMode: 'ASYNC',
      });
      expect(result.success).toBe(true);
    });

    it('should accept contingency mode with reason', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        contingencyMode: true,
        contingencyReason: 'SEFAZ indisponível',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing fiscalDocumentId', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({
        fiscalDocumentId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid transmission mode', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        transmissionMode: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should reject contingency mode without reason', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        contingencyMode: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject contingency reason too long', () => {
      const result = SubmitFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        contingencyMode: true,
        contingencyReason: 'a'.repeat(257),
      });
      expect(result.success).toBe(false);
    });
  });
});
