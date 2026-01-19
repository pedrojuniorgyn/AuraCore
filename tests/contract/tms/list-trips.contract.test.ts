/**
 * ListTrips Contract Tests
 * Testes de contrato para validação Zod de listagem de viagens
 */
import { describe, it, expect } from 'vitest';
import { listTripsSchema } from '@/modules/tms/application/dtos/ListTripsInput';

describe('ListTrips Contract', () => {
  describe('Valid Inputs', () => {
    it('should accept empty input with defaults', () => {
      const result = listTripsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('should accept valid status filter', () => {
      const validStatuses = ['DRAFT', 'ALLOCATED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as const;
      
      for (const status of validStatuses) {
        const result = listTripsSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid date range', () => {
      const input = {
        startDateFrom: new Date('2026-01-01'),
        startDateTo: new Date('2026-01-31'),
      };

      const result = listTripsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid driver and vehicle filters', () => {
      const input = {
        driverId: 1,
        vehicleId: 2,
      };

      const result = listTripsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept custom pagination', () => {
      const input = {
        page: 5,
        pageSize: 50,
      };

      const result = listTripsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.pageSize).toBe(50);
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject invalid status', () => {
      const result = listTripsSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = listTripsSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject zero page', () => {
      const result = listTripsSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject pageSize greater than 100', () => {
      const result = listTripsSchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject pageSize less than 1', () => {
      const result = listTripsSchema.safeParse({ pageSize: 0 });
      expect(result.success).toBe(false);
    });
  });
});
