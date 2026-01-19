/**
 * CreateTrip Contract Tests
 * Testes de contrato para validação Zod de criação de viagem
 */
import { describe, it, expect } from 'vitest';
import { createTripSchema } from '@/modules/tms/application/dtos/CreateTripInput';

describe('CreateTrip Contract', () => {
  describe('Valid Inputs', () => {
    it('should accept valid input with all required fields', () => {
      const validInput = {
        vehicleId: 1,
        driverId: 2,
      };

      const result = createTripSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicleId).toBe(1);
        expect(result.data.driverId).toBe(2);
        expect(result.data.driverType).toBe('OWN'); // default
      }
    });

    it('should accept valid input with all fields', () => {
      const validInput = {
        vehicleId: 1,
        driverId: 2,
        driverType: 'AGGREGATE' as const,
        trailer1Id: 3,
        trailer2Id: 4,
        pickupOrderIds: [100, 101, 102],
        scheduledStart: new Date('2026-01-20T08:00:00Z'),
        scheduledEnd: new Date('2026-01-20T18:00:00Z'),
        estimatedRevenue: 5000,
        estimatedCost: 2000,
        notes: 'Viagem de teste',
      };

      const result = createTripSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.driverType).toBe('AGGREGATE');
        expect(result.data.pickupOrderIds).toEqual([100, 101, 102]);
        expect(result.data.estimatedRevenue).toBe(5000);
      }
    });

    it('should apply default values', () => {
      const input = {
        vehicleId: 1,
        driverId: 2,
      };

      const result = createTripSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.driverType).toBe('OWN');
        expect(result.data.pickupOrderIds).toEqual([]);
      }
    });

    it('should accept all valid driver types', () => {
      const driverTypes = ['OWN', 'THIRD_PARTY', 'AGGREGATE'] as const;
      
      for (const driverType of driverTypes) {
        const input = { vehicleId: 1, driverId: 2, driverType };
        const result = createTripSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing vehicleId', () => {
      const invalidInput = {
        driverId: 2,
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject missing driverId', () => {
      const invalidInput = {
        vehicleId: 1,
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative vehicleId', () => {
      const invalidInput = {
        vehicleId: -1,
        driverId: 2,
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject zero driverId', () => {
      const invalidInput = {
        vehicleId: 1,
        driverId: 0,
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid driverType', () => {
      const invalidInput = {
        vehicleId: 1,
        driverId: 2,
        driverType: 'INVALID',
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative estimatedRevenue', () => {
      const invalidInput = {
        vehicleId: 1,
        driverId: 2,
        estimatedRevenue: -100,
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative estimatedCost', () => {
      const invalidInput = {
        vehicleId: 1,
        driverId: 2,
        estimatedCost: -500,
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 1000 characters', () => {
      const invalidInput = {
        vehicleId: 1,
        driverId: 2,
        notes: 'a'.repeat(1001),
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer vehicleId', () => {
      const invalidInput = {
        vehicleId: 1.5,
        driverId: 2,
      };

      const result = createTripSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});
