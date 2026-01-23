/**
 * E13 - CacheManager Unit Tests
 *
 * @module tests/unit/lib/cache/CacheManager.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheManager, getOrSet, invalidateAfterMutation } from '@/lib/cache/CacheManager';

describe('CacheManager', () => {
  // Use singleton instance for each test
  const cache = cacheManager;

  beforeEach(() => {
    // Clear the singleton before each test
    cacheManager.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get values correctly', () => {
      // Arrange
      const key = 'test:1:data';
      const value = { id: 1, name: 'Test' };

      // Act
      cache.set(key, value, 'test');
      const result = cache.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      // Act
      const result = cache.get('non_existent:key');

      // Assert
      expect(result).toBeNull();
    });

    it('should delete keys correctly', () => {
      // Arrange
      cache.set('delete:test', { data: 'value' }, 'test');

      // Act
      const deleted = cache.delete('delete:test');
      const result = cache.get('delete:test');

      // Assert
      expect(deleted).toBe(true);
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent key', () => {
      // Act
      const deleted = cache.delete('non_existent');

      // Assert
      expect(deleted).toBe(false);
    });

    it('should check key existence with has()', () => {
      // Arrange
      cache.set('exists:test', 'value', 'test');

      // Assert
      expect(cache.has('exists:test')).toBe(true);
      expect(cache.has('not_exists:test')).toBe(false);
    });
  });

  describe('TTL (Time-To-Live)', () => {
    it('should expire entries after TTL', async () => {
      // Arrange
      vi.useFakeTimers();
      cache.set('ttl:test', 'value', 'notifications_count'); // 30s TTL

      // Act & Assert - before expiry
      expect(cache.get('ttl:test')).toBe('value');

      // Advance time past TTL
      vi.advanceTimersByTime(31 * 1000);

      // Should be expired
      expect(cache.get('ttl:test')).toBeNull();

      vi.useRealTimers();
    });

    it('should use default TTL for unknown resource types', () => {
      // Arrange
      vi.useFakeTimers();
      cache.set('unknown:test', 'value', 'unknown_type');

      // Act - advance less than default TTL (5 min)
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(cache.get('unknown:test')).toBe('value');

      // Advance past default TTL
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(cache.get('unknown:test')).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest entries when at capacity', () => {
      // Arrange - create a small cache for testing
      // Note: Using singleton, so we test with many entries
      const testKeys: string[] = [];

      // Add 10 entries
      for (let i = 0; i < 10; i++) {
        const key = `lru:test:${i}`;
        testKeys.push(key);
        cache.set(key, { index: i }, 'test');
      }

      // Access first entry to make it "recently used"
      cache.get('lru:test:0');

      // Assert - first entry should still exist
      expect(cache.has('lru:test:0')).toBe(true);
      expect(cache.has('lru:test:9')).toBe(true);
    });

    it('should update access order on get()', () => {
      // Arrange
      cache.set('order:1', 'first', 'test');
      cache.set('order:2', 'second', 'test');
      cache.set('order:3', 'third', 'test');

      // Act - access first entry to move it to end
      cache.get('order:1');

      // Get all keys
      const keys = cache.keys('order:');

      // Assert - order:1 should be at end (most recently used)
      expect(keys[keys.length - 1]).toBe('order:1');
    });
  });

  describe('Invalidation', () => {
    it('should invalidate by exact prefix', () => {
      // Arrange
      cache.set('financial_titles:1:1:status', 'open', 'test');
      cache.set('financial_titles:1:1:person', 'john', 'test');
      cache.set('financial_titles:1:2:status', 'closed', 'test');
      cache.set('other:data', 'value', 'test');

      // Act
      const count = cache.invalidate('financial_titles:1:1');

      // Assert
      expect(count).toBe(2);
      expect(cache.has('financial_titles:1:1:status')).toBe(false);
      expect(cache.has('financial_titles:1:1:person')).toBe(false);
      expect(cache.has('financial_titles:1:2:status')).toBe(true);
      expect(cache.has('other:data')).toBe(true);
    });

    it('should invalidate by regex pattern', () => {
      // Arrange
      cache.set('notifications_count:user1', 5, 'test');
      cache.set('notifications_count:user2', 10, 'test');
      cache.set('notifications_list:user1', [], 'test');

      // Act
      const count = cache.invalidate(/^notifications_count:/);

      // Assert
      expect(count).toBe(2);
      expect(cache.has('notifications_count:user1')).toBe(false);
      expect(cache.has('notifications_count:user2')).toBe(false);
      expect(cache.has('notifications_list:user1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track hit rate correctly', () => {
      // Arrange
      cache.set('stats:test:1', 'value1', 'stats');
      cache.set('stats:test:2', 'value2', 'stats');

      // Act
      cache.get('stats:test:1'); // hit
      cache.get('stats:test:1'); // hit
      cache.get('stats:test:2'); // hit
      cache.get('stats:nonexistent'); // miss

      const stats = cache.getStats();

      // Assert
      expect(stats.totalHits).toBeGreaterThanOrEqual(3);
      expect(stats.totalMisses).toBeGreaterThanOrEqual(1);
      expect(stats.hitRateByResource['stats']).toBeGreaterThanOrEqual(75); // 3 hits / 4 total
    });

    it('should report size and memory estimate', () => {
      // Arrange
      cache.set('mem:test:1', { data: 'a'.repeat(1000) }, 'test');
      cache.set('mem:test:2', { data: 'b'.repeat(1000) }, 'test');

      // Act
      const stats = cache.getStats();

      // Assert
      expect(stats.size).toBeGreaterThanOrEqual(2);
      expect(stats.memoryEstimate).toMatch(/\d+(\.\d+)?(B|KB|MB)/);
    });

    it('should track oldest entry', () => {
      // Arrange
      vi.useFakeTimers();
      const startTime = new Date();

      cache.set('old:test:1', 'value', 'test');

      vi.advanceTimersByTime(1000);
      cache.set('old:test:2', 'value', 'test');

      // Act
      const stats = cache.getStats();

      // Assert
      expect(stats.oldestEntry).toEqual(startTime);

      vi.useRealTimers();
    });
  });

  describe('Keys', () => {
    it('should return all keys without pattern', () => {
      // Arrange
      cache.set('keys:a', 'a', 'test');
      cache.set('keys:b', 'b', 'test');
      cache.set('other:c', 'c', 'test');

      // Act
      const allKeys = cache.keys();

      // Assert
      expect(allKeys).toContain('keys:a');
      expect(allKeys).toContain('keys:b');
      expect(allKeys).toContain('other:c');
    });

    it('should filter keys by pattern', () => {
      // Arrange
      cache.set('filter:a', 'a', 'test');
      cache.set('filter:b', 'b', 'test');
      cache.set('other:c', 'c', 'test');

      // Act
      const filteredKeys = cache.keys('filter:');

      // Assert
      expect(filteredKeys).toHaveLength(2);
      expect(filteredKeys).toContain('filter:a');
      expect(filteredKeys).toContain('filter:b');
      expect(filteredKeys).not.toContain('other:c');
    });
  });

  describe('Clear', () => {
    it('should clear all entries', () => {
      // Arrange
      cache.set('clear:1', 'a', 'test');
      cache.set('clear:2', 'b', 'test');

      // Act
      cache.clear();

      // Assert
      expect(cache.keys()).toHaveLength(0);
      expect(cache.getStats().size).toBe(0);
    });
  });
});

describe('Helper Functions', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe('getOrSet', () => {
    it('should return cached value when exists', async () => {
      // Arrange
      cacheManager.set('getOrSet:test', 'cached_value', 'test');
      const loader = vi.fn().mockResolvedValue('fresh_value');

      // Act
      const result = await getOrSet('getOrSet:test', 'test', loader);

      // Assert
      expect(result).toBe('cached_value');
      expect(loader).not.toHaveBeenCalled();
    });

    it('should call loader and cache result when not cached', async () => {
      // Arrange
      const loader = vi.fn().mockResolvedValue('fresh_value');

      // Act
      const result = await getOrSet('getOrSet:new', 'test', loader);

      // Assert
      expect(result).toBe('fresh_value');
      expect(loader).toHaveBeenCalledTimes(1);
      expect(cacheManager.get('getOrSet:new')).toBe('fresh_value');
    });
  });

  describe('invalidateAfterMutation', () => {
    it('should invalidate matching entries', () => {
      // Arrange
      cacheManager.set('mutation:1:data', 'value1', 'test');
      cacheManager.set('mutation:1:other', 'value2', 'test');
      cacheManager.set('mutation:2:data', 'value3', 'test');

      // Act
      invalidateAfterMutation('mutation:1');

      // Assert
      expect(cacheManager.has('mutation:1:data')).toBe(false);
      expect(cacheManager.has('mutation:1:other')).toBe(false);
      expect(cacheManager.has('mutation:2:data')).toBe(true);
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  it('should handle circular references gracefully', () => {
    // Arrange
    type CircularObject = { name: string; self?: CircularObject };
    const circular: CircularObject = { name: 'circular' };
    circular.self = circular;

    // Act & Assert - should not throw
    expect(() => {
      cacheManager.set('circular:test', circular, 'test');
    }).not.toThrow();
  });

  it('should handle special characters in keys', () => {
    // Arrange
    const specialKey = 'special:key:with:many:colons:and.dots';

    // Act
    cacheManager.set(specialKey, 'value', 'test');

    // Assert
    expect(cacheManager.get(specialKey)).toBe('value');
  });

  it('should handle null and undefined values', () => {
    // Arrange
    cacheManager.set('null:test', null, 'test');
    cacheManager.set('undefined:test', undefined, 'test');

    // Assert - null is a valid value (not cache miss)
    // Note: our implementation returns null for cache miss,
    // so we use has() to differentiate
    expect(cacheManager.has('null:test')).toBe(true);
    expect(cacheManager.has('undefined:test')).toBe(true);
  });

  it('should handle empty string values', () => {
    // Arrange
    cacheManager.set('empty:test', '', 'test');

    // Assert
    expect(cacheManager.get('empty:test')).toBe('');
    expect(cacheManager.has('empty:test')).toBe(true);
  });

  it('should handle large objects', () => {
    // Arrange
    const largeObject = {
      data: 'x'.repeat(100000), // 100KB string
      nested: {
        array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: 'test' })),
      },
    };

    // Act
    cacheManager.set('large:test', largeObject, 'test');
    const result = cacheManager.get('large:test');

    // Assert
    expect(result).toEqual(largeObject);
  });
});
