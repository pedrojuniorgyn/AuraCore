import { describe, it, expect } from 'vitest';
import { CPF } from '@/shared/domain/value-objects/CPF';
import { Result } from '@/shared/domain/types/Result';

describe('CPF', () => {
  // CPF válido para teste (gerado)
  const VALID_CPF = '52998224725';
  const VALID_CPF_FORMATTED = '529.982.247-25';

  describe('create', () => {
    it('should create valid CPF from unformatted string', () => {
      const result = CPF.create(VALID_CPF);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe(VALID_CPF);
      }
    });

    it('should create valid CPF from formatted string', () => {
      const result = CPF.create(VALID_CPF_FORMATTED);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe(VALID_CPF);
      }
    });

    it('should fail with wrong length', () => {
      const result = CPF.create('1234567890');
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('11 digits');
      }
    });

    it('should fail with all same digits', () => {
      const result = CPF.create('11111111111');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with 00000000000', () => {
      const result = CPF.create('00000000000');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with invalid check digits', () => {
      const result = CPF.create('52998224726'); // último dígito errado
      expect(Result.isFail(result)).toBe(true);
    });

    it('should strip non-numeric characters', () => {
      const result = CPF.create('529.982.247-25');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe('52998224725');
      }
    });

    it('should fail with empty string', () => {
      const result = CPF.create('');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with letters', () => {
      const result = CPF.create('529982247ab');
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('formatted', () => {
    it('should return formatted CPF', () => {
      const result = CPF.create(VALID_CPF);
      if (Result.isOk(result)) {
        expect(result.value.formatted).toBe(VALID_CPF_FORMATTED);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal CPFs', () => {
      const r1 = CPF.create(VALID_CPF);
      const r2 = CPF.create(VALID_CPF_FORMATTED);
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(true);
      }
    });

    it('should return false for different CPFs', () => {
      const r1 = CPF.create('52998224725');
      const r2 = CPF.create('11144477735'); // Outro CPF válido
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const result = CPF.create(VALID_CPF);
      if (Result.isOk(result)) {
        expect(result.value.toString()).toBe(VALID_CPF_FORMATTED);
      }
    });
  });
});

