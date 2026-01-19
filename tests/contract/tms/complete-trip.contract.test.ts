/**
 * CompleteTrip Contract Tests
 * Testes de contrato para validação Zod de conclusão de viagem
 */
import { describe, it, expect } from 'vitest';
import { completeTripSchema } from '@/modules/tms/application/dtos/CompleteTripInput';

describe('CompleteTrip Contract', () => {
  describe('Valid Inputs', () => {
    it('should accept valid tripId only', () => {
      const input = {
        tripId: 123,
      };

      const result = completeTripSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept tripId with actual values', () => {
      const input = {
        tripId: 123,
        actualRevenue: 5000,
        actualCost: 2000,
      };

      const result = completeTripSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept zero for actual values', () => {
      const input = {
        tripId: 123,
        actualRevenue: 0,
        actualCost: 0,
      };

      const result = completeTripSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing tripId', () => {
      const result = completeTripSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject negative tripId', () => {
      const result = completeTripSchema.safeParse({ tripId: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject negative actualRevenue', () => {
      const input = {
        tripId: 123,
        actualRevenue: -100,
      };

      const result = completeTripSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative actualCost', () => {
      const input = {
        tripId: 123,
        actualCost: -500,
      };

      const result = completeTripSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
