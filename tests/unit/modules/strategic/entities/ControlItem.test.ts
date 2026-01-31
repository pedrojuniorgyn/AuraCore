import { describe, it, expect } from 'vitest';
import { ControlItem } from '@/modules/strategic/domain/entities/ControlItem';
import { Result } from '@/shared/domain';

describe('ControlItem Entity', () => {
  const validProps = {
    organizationId: 1,
    branchId: 1,
    code: 'IC-001',
    name: 'Item de Controle Teste',
    processArea: 'Produção',
    responsibleUserId: 'user-123',
    measurementFrequency: 'DAILY' as const,
    targetValue: 100,
    upperLimit: 110,
    lowerLimit: 90,
    unit: 'un',
    kpiId: null,
    createdBy: 'user-123',
  };

  describe('create()', () => {
    it('should create a valid ControlItem', () => {
      const result = ControlItem.create(validProps);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.code).toBe('IC-001');
        expect(result.value.status).toBe('ACTIVE');
      }
    });

    it('should fail with empty code', () => {
      const result = ControlItem.create({ ...validProps, code: '' });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with empty name', () => {
      const result = ControlItem.create({ ...validProps, name: '  ' });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('isWithinLimits()', () => {
    it('should return true when value is within limits', () => {
      const result = ControlItem.create(validProps);
      if (Result.isOk(result)) {
        result.value.updateValue(100, new Date());
        expect(result.value.isWithinLimits()).toBe(true);
      }
    });

    it('should return false when value exceeds upper limit', () => {
      const result = ControlItem.create(validProps);
      if (Result.isOk(result)) {
        result.value.updateValue(120, new Date());
        expect(result.value.isWithinLimits()).toBe(false);
      }
    });

    it('should return false when value is below lower limit', () => {
      const result = ControlItem.create(validProps);
      if (Result.isOk(result)) {
        result.value.updateValue(80, new Date());
        expect(result.value.isWithinLimits()).toBe(false);
      }
    });
  });

  describe('isOnTarget()', () => {
    it('should return true when value equals target', () => {
      const result = ControlItem.create(validProps);
      if (Result.isOk(result)) {
        result.value.updateValue(100, new Date());
        expect(result.value.isOnTarget()).toBe(true);
      }
    });

    it('should return true when value is within 5% of target', () => {
      const result = ControlItem.create(validProps);
      if (Result.isOk(result)) {
        result.value.updateValue(103, new Date()); // 3% above
        expect(result.value.isOnTarget()).toBe(true);
      }
    });

    it('should return false when value is more than 5% off target', () => {
      const result = ControlItem.create(validProps);
      if (Result.isOk(result)) {
        result.value.updateValue(85, new Date()); // 15% below
        expect(result.value.isOnTarget()).toBe(false);
      }
    });
  });
});
