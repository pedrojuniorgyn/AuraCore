/**
 * CancelReceivable Contract Tests
 * Testes de contrato para validação Zod de cancelamento de conta a receber
 */
import { describe, it, expect } from 'vitest';
import { CancelReceivableInputSchema } from '@/modules/financial/application/dtos/CancelReceivableDTO';

describe('CancelReceivable Contract', () => {
  describe('Valid Inputs', () => {
    it('should accept valid id and reason', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'Cliente desistiu da compra',
      };

      const result = CancelReceivableInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept reason with maximum 500 characters', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'a'.repeat(500),
      };

      const result = CancelReceivableInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing id', () => {
      const result = CancelReceivableInputSchema.safeParse({ reason: 'Motivo' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const input = {
        id: 'invalid-uuid',
        reason: 'Motivo',
      };

      const result = CancelReceivableInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing reason', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CancelReceivableInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reason: '',
      };

      const result = CancelReceivableInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject reason longer than 500 characters', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'a'.repeat(501),
      };

      const result = CancelReceivableInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
