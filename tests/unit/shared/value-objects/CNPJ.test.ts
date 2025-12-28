import { describe, it, expect } from 'vitest';
import { CNPJ } from '@/shared/domain/value-objects/CNPJ';
import { Result } from '@/shared/domain/types/Result';

describe('CNPJ', () => {
  const VALID_CNPJ = '11222333000181';
  const VALID_CNPJ_FORMATTED = '11.222.333/0001-81';

  describe('create', () => {
    it('should create valid CNPJ from unformatted string', () => {
      const result = CNPJ.create(VALID_CNPJ);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe(VALID_CNPJ);
      }
    });

    it('should create valid CNPJ from formatted string', () => {
      const result = CNPJ.create(VALID_CNPJ_FORMATTED);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe(VALID_CNPJ);
      }
    });

    it('should fail with wrong length', () => {
      const result = CNPJ.create('1234567890');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with all same digits', () => {
      const result = CNPJ.create('11111111111111');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with invalid check digits', () => {
      const result = CNPJ.create('11222333000182');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should strip non-numeric characters', () => {
      const result = CNPJ.create('11.222.333/0001-81');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe('11222333000181');
      }
    });
  });

  describe('formatted', () => {
    it('should return formatted CNPJ', () => {
      const result = CNPJ.create(VALID_CNPJ);
      if (Result.isOk(result)) {
        expect(result.value.formatted).toBe(VALID_CNPJ_FORMATTED);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal CNPJs', () => {
      const r1 = CNPJ.create(VALID_CNPJ);
      const r2 = CNPJ.create(VALID_CNPJ_FORMATTED);
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(true);
      }
    });

    it('should return false for different CNPJs', () => {
      const r1 = CNPJ.create('11222333000181');
      const r2 = CNPJ.create('11444777000161');
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const result = CNPJ.create(VALID_CNPJ);
      if (Result.isOk(result)) {
        expect(result.value.toString()).toBe(VALID_CNPJ_FORMATTED);
      }
    });
  });
});

