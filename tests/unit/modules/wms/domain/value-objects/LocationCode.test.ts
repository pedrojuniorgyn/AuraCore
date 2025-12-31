import { Result } from '@/shared/domain';
import { describe, it, expect } from 'vitest';
import { LocationCode } from '@/modules/wms/domain/value-objects/LocationCode';

describe('LocationCode', () => {
  describe('create()', () => {
    it('should create valid location code', () => {
      const result = LocationCode.create('ARM01-A-03-12');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.value).toBe('ARM01-A-03-12');
    });

    it('should normalize to uppercase', () => {
      const result = LocationCode.create('arm01-a-03-12');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.value).toBe('ARM01-A-03-12');
    });

    it('should trim whitespace', () => {
      const result = LocationCode.create('  ARM01-A-03-12  ');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.value).toBe('ARM01-A-03-12');
    });

    it('should fail for empty code', () => {
      const result = LocationCode.create('');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot be empty');
    });

    it('should fail for code exceeding max length', () => {
      const result = LocationCode.create('A'.repeat(25));
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot exceed');
    });

    it('should fail for invalid format (with spaces)', () => {
      const result = LocationCode.create('ARM01 A 03');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('only alphanumeric');
    });

    it('should accept single-level code', () => {
      const result = LocationCode.create('ARM01');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.value).toBe('ARM01');
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute without validation', () => {
      const result = LocationCode.reconstitute('ARM01-A-03-12');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.value).toBe('ARM01-A-03-12');
    });
  });

  describe('hierarchy parsing', () => {
    it('should extract warehouse from 4-level code', () => {
      const code = LocationCode.create('ARM01-A-03-12').value;
      
      expect(code.warehouse).toBe('ARM01');
    });

    it('should extract aisle from 4-level code', () => {
      const code = LocationCode.create('ARM01-A-03-12').value;
      
      expect(code.aisle).toBe('A');
    });

    it('should extract shelf from 4-level code', () => {
      const code = LocationCode.create('ARM01-A-03-12').value;
      
      expect(code.shelf).toBe('03');
    });

    it('should extract position from 4-level code', () => {
      const code = LocationCode.create('ARM01-A-03-12').value;
      
      expect(code.position).toBe('12');
    });

    it('should return correct level count', () => {
      const code1 = LocationCode.create('ARM01').value;
      const code2 = LocationCode.create('ARM01-A').value;
      const code3 = LocationCode.create('ARM01-A-03').value;
      const code4 = LocationCode.create('ARM01-A-03-12').value;
      
      expect(code1.level).toBe(1);
      expect(code2.level).toBe(2);
      expect(code3.level).toBe(3);
      expect(code4.level).toBe(4);
    });
  });

  describe('hierarchy relationships', () => {
    it('should identify parent-child relationship', () => {
      const parent = LocationCode.create('ARM01-A').value;
      const child = LocationCode.create('ARM01-A-03').value;
      
      expect(parent.isParentOf(child)).toBe(true);
      expect(child.isChildOf(parent)).toBe(true);
    });

    it('should not identify parent when levels are same', () => {
      const code1 = LocationCode.create('ARM01-A').value;
      const code2 = LocationCode.create('ARM01-B').value;
      
      expect(code1.isParentOf(code2)).toBe(false);
      expect(code2.isParentOf(code1)).toBe(false);
    });

    it('should not identify parent for non-descendants', () => {
      const code1 = LocationCode.create('ARM01-A-03').value;
      const code2 = LocationCode.create('ARM01-B-04').value;
      
      expect(code1.isParentOf(code2)).toBe(false);
    });
  });

  describe('equals()', () => {
    it('should be equal for same code', () => {
      const code1 = LocationCode.create('ARM01-A-03-12').value;
      const code2 = LocationCode.create('ARM01-A-03-12').value;
      
      expect(code1.equals(code2)).toBe(true);
    });

    it('should not be equal for different codes', () => {
      const code1 = LocationCode.create('ARM01-A-03-12').value;
      const code2 = LocationCode.create('ARM01-B-04-13').value;
      
      expect(code1.equals(code2)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return string representation', () => {
      const code = LocationCode.create('ARM01-A-03-12').value;
      
      expect(code.toString()).toBe('ARM01-A-03-12');
    });
  });
});

