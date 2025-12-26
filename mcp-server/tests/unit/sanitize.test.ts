import { describe, it, expect } from 'vitest';
import { sanitizeResourceId } from '../../src/utils/sanitize.js';

describe('sanitizeResourceId', () => {
  it('should accept valid lowercase-hyphen format', () => {
    expect(sanitizeResourceId('api-contract')).toBe('api-contract');
    expect(sanitizeResourceId('test-pattern-123')).toBe('test-pattern-123');
    expect(sanitizeResourceId('simple')).toBe('simple');
    expect(sanitizeResourceId('with-123-numbers')).toBe('with-123-numbers');
  });

  it('should reject path traversal attempts', () => {
    expect(() => sanitizeResourceId('../etc/passwd')).toThrow('path traversal attempt detected');
    expect(() => sanitizeResourceId('../../secrets')).toThrow('path traversal attempt detected');
    expect(() => sanitizeResourceId('test/../file')).toThrow('path traversal attempt detected');
  });

  it('should reject invalid characters', () => {
    expect(() => sanitizeResourceId('invalid/slash')).toThrow('path traversal attempt detected');
    expect(() => sanitizeResourceId('invalid\\backslash')).toThrow('path traversal attempt detected');
    expect(() => sanitizeResourceId('UPPERCASE')).toThrow('Invalid resource ID format');
    expect(() => sanitizeResourceId('with spaces')).toThrow('Invalid resource ID format');
    expect(() => sanitizeResourceId('with_underscore')).toThrow('Invalid resource ID format');
  });

  it('should reject empty or whitespace-only strings', () => {
    expect(() => sanitizeResourceId('')).toThrow('Invalid resource ID: must be non-empty string');
    expect(() => sanitizeResourceId('   ')).toThrow('Invalid resource ID format');
  });

  it('should trim whitespace', () => {
    expect(sanitizeResourceId('  valid-id  ')).toBe('valid-id');
    expect(sanitizeResourceId('test-123 ')).toBe('test-123');
  });
});

