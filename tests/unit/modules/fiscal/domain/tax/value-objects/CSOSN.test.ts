import { describe, it, expect } from 'vitest';
import { CSOSN } from '@/modules/fiscal/domain/tax/value-objects/CSOSN';
import { Result } from '@/shared/domain';

describe('CSOSN', () => {
  describe('create', () => {
    it('should create valid CSOSN 101 (com crédito)', () => {
      const result = CSOSN.create('101');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.code).toBe('101');
        expect(result.value.isSimplesNacional).toBe(true);
        expect(result.value.permiteCreditoICMS).toBe(true);
      }
    });

    it('should create valid CSOSN 102 (sem crédito)', () => {
      const result = CSOSN.create('102');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.permiteCreditoICMS).toBe(false);
      }
    });

    it('should create valid CSOSN 201 (ST com crédito)', () => {
      const result = CSOSN.create('201');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.hasSubstituicao).toBe(true);
        expect(result.value.permiteCreditoICMS).toBe(true);
      }
    });

    it('should create valid CSOSN 300 (imune)', () => {
      const result = CSOSN.create('300');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.isento).toBe(true);
      }
    });

    it('should fail with invalid code', () => {
      const result = CSOSN.create('999');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with wrong length', () => {
      const result = CSOSN.create('10');

      expect(Result.isFail(result)).toBe(true);
    });
  });
});

