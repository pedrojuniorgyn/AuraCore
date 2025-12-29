import { describe, it, expect } from 'vitest';
import { CFOP } from '@/modules/fiscal/domain/value-objects/CFOP';
import { Result } from '@/shared/domain';

describe('CFOP', () => {
  describe('create', () => {
    it('should create valid CFOP', () => {
      const result = CFOP.create('5102');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.code).toBe('5102');
        expect(result.value.isExit).toBe(true);
        expect(result.value.isIntrastate).toBe(true);
      }
    });

    it('should accept formatted CFOP', () => {
      const result = CFOP.create('5.102');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.code).toBe('5102');
      }
    });

    it('should fail with invalid first digit', () => {
      const result = CFOP.create('4102');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with wrong length', () => {
      const result = CFOP.create('510');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should identify entry operation', () => {
      const result = CFOP.create('1102');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.isEntry).toBe(true);
        expect(result.value.isExit).toBe(false);
      }
    });

    it('should identify interstate operation', () => {
      const result = CFOP.create('6102');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.isInterstate).toBe(true);
        expect(result.value.isIntrastate).toBe(false);
      }
    });

    it('should identify foreign operation', () => {
      const result = CFOP.create('7102');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.isForeign).toBe(true);
      }
    });
  });

  describe('formatted', () => {
    it('should format CFOP correctly', () => {
      const result = CFOP.create('5102');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.formatted).toBe('5.102');
      }
    });
  });
});

