/**
 * CancelTrip Contract Tests
 * Testes de contrato para validação Zod de cancelamento de viagem
 */
import { describe, it, expect } from 'vitest';
import { cancelTripSchema } from '@/modules/tms/application/dtos/CancelTripInput';

describe('CancelTrip Contract', () => {
  describe('Valid Inputs', () => {
    it('should accept valid tripId and reason', () => {
      const input = {
        tripId: 123,
        reason: 'Cliente cancelou a coleta',
      };

      const result = cancelTripSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept reason with maximum 500 characters', () => {
      const input = {
        tripId: 123,
        reason: 'a'.repeat(500),
      };

      const result = cancelTripSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing tripId', () => {
      const result = cancelTripSchema.safeParse({ reason: 'Motivo' });
      expect(result.success).toBe(false);
    });

    it('should reject missing reason', () => {
      const result = cancelTripSchema.safeParse({ tripId: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const input = {
        tripId: 123,
        reason: '',
      };

      const result = cancelTripSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject reason longer than 500 characters', () => {
      const input = {
        tripId: 123,
        reason: 'a'.repeat(501),
      };

      const result = cancelTripSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative tripId', () => {
      const input = {
        tripId: -1,
        reason: 'Motivo',
      };

      const result = cancelTripSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
