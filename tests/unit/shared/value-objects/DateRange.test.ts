import { describe, it, expect } from 'vitest';
import { DateRange } from '@/shared/domain/value-objects/DateRange';
import { Result } from '@/shared/domain/types/Result';

describe('DateRange', () => {
  const START = new Date('2024-01-01');
  const END = new Date('2024-12-31');

  describe('create', () => {
    it('should create valid DateRange', () => {
      const result = DateRange.create(START, END);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.start).toEqual(START);
        expect(result.value.end).toEqual(END);
      }
    });

    it('should allow same start and end date', () => {
      const sameDate = new Date('2024-06-15');
      const result = DateRange.create(sameDate, sameDate);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail when start is after end', () => {
      const result = DateRange.create(END, START);
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('before or equal');
      }
    });

    it('should fail with invalid start date', () => {
      const result = DateRange.create(new Date('invalid'), END);
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with invalid end date', () => {
      const result = DateRange.create(START, new Date('invalid'));
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('fromStrings', () => {
    it('should create from ISO strings', () => {
      const result = DateRange.fromStrings('2024-01-01', '2024-12-31');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail with invalid string', () => {
      const result = DateRange.fromStrings('not-a-date', '2024-12-31');
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('durationInDays', () => {
    it('should calculate days correctly', () => {
      const result = DateRange.create(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      if (Result.isOk(result)) {
        expect(result.value.durationInDays).toBe(30);
      }
    });

    it('should return 0 for same day', () => {
      const sameDate = new Date('2024-06-15');
      const result = DateRange.create(sameDate, sameDate);
      if (Result.isOk(result)) {
        expect(result.value.durationInDays).toBe(0);
      }
    });
  });

  describe('contains', () => {
    it('should return true for date within range', () => {
      const result = DateRange.create(START, END);
      if (Result.isOk(result)) {
        expect(result.value.contains(new Date('2024-06-15'))).toBe(true);
      }
    });

    it('should return true for start date', () => {
      const result = DateRange.create(START, END);
      if (Result.isOk(result)) {
        expect(result.value.contains(START)).toBe(true);
      }
    });

    it('should return true for end date', () => {
      const result = DateRange.create(START, END);
      if (Result.isOk(result)) {
        expect(result.value.contains(END)).toBe(true);
      }
    });

    it('should return false for date outside range', () => {
      const result = DateRange.create(START, END);
      if (Result.isOk(result)) {
        expect(result.value.contains(new Date('2025-01-01'))).toBe(false);
      }
    });
  });

  describe('overlaps', () => {
    it('should detect overlapping ranges', () => {
      const r1 = DateRange.create(
        new Date('2024-01-01'),
        new Date('2024-06-30')
      );
      const r2 = DateRange.create(
        new Date('2024-04-01'),
        new Date('2024-12-31')
      );
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.overlaps(r2.value)).toBe(true);
      }
    });

    it('should return false for non-overlapping ranges', () => {
      const r1 = DateRange.create(
        new Date('2024-01-01'),
        new Date('2024-03-31')
      );
      const r2 = DateRange.create(
        new Date('2024-07-01'),
        new Date('2024-12-31')
      );
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.overlaps(r2.value)).toBe(false);
      }
    });
  });

  describe('encompasses', () => {
    it('should return true when fully contains another range', () => {
      const r1 = DateRange.create(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      const r2 = DateRange.create(
        new Date('2024-06-01'),
        new Date('2024-06-30')
      );
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.encompasses(r2.value)).toBe(true);
      }
    });

    it('should return false when does not fully contain', () => {
      const r1 = DateRange.create(
        new Date('2024-06-01'),
        new Date('2024-06-30')
      );
      const r2 = DateRange.create(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.encompasses(r2.value)).toBe(false);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal ranges', () => {
      const r1 = DateRange.create(START, END);
      const r2 = DateRange.create(START, END);
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(true);
      }
    });
  });
});

