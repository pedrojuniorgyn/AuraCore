import { describe, it, expect } from 'vitest';
import { Email } from '@/shared/domain/value-objects/Email';
import { Result } from '@/shared/domain/types/Result';

describe('Email', () => {
  describe('create', () => {
    it('should create valid email', () => {
      const result = Email.create('test@example.com');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe('test@example.com');
      }
    });

    it('should lowercase email', () => {
      const result = Email.create('Test@EXAMPLE.com');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe('test@example.com');
      }
    });

    it('should trim whitespace', () => {
      const result = Email.create('  test@example.com  ');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value).toBe('test@example.com');
      }
    });

    it('should fail with empty string', () => {
      const result = Email.create('');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without @', () => {
      const result = Email.create('invalid-email');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without domain', () => {
      const result = Email.create('test@');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with spaces', () => {
      const result = Email.create('test @example.com');
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('domain', () => {
    it('should return domain part', () => {
      const result = Email.create('test@example.com');
      if (Result.isOk(result)) {
        expect(result.value.domain).toBe('example.com');
      }
    });
  });

  describe('localPart', () => {
    it('should return local part', () => {
      const result = Email.create('test@example.com');
      if (Result.isOk(result)) {
        expect(result.value.localPart).toBe('test');
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal emails', () => {
      const r1 = Email.create('test@example.com');
      const r2 = Email.create('TEST@EXAMPLE.COM');
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(true);
      }
    });

    it('should return false for different emails', () => {
      const r1 = Email.create('test1@example.com');
      const r2 = Email.create('test2@example.com');
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return email string', () => {
      const result = Email.create('test@example.com');
      if (Result.isOk(result)) {
        expect(result.value.toString()).toBe('test@example.com');
      }
    });
  });
});

