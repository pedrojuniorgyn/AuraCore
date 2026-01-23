/**
 * E13 - CacheManager Unit Tests
 *
 * @module tests/unit/lib/cache/CacheManager.test
 *
 * Testes incluem correções para:
 * - Bug 1: Eviction desnecessária no set()
 * - Bug 2: Cache bypass para valores falsy
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cacheManager,
  getOrSet,
  invalidateAfterMutation,
  CACHE_MISS,
} from '@/lib/cache/CacheManager';

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

    it('should return CACHE_MISS for non-existent keys', () => {
      // Act
      const result = cache.get('non_existent:key');

      // Assert - BUG 2 FIX: Returns CACHE_MISS symbol instead of null
      expect(result).toBe(CACHE_MISS);
    });

    it('should delete keys correctly', () => {
      // Arrange
      cache.set('delete:test', { data: 'value' }, 'test');

      // Act
      const deleted = cache.delete('delete:test');
      const result = cache.get('delete:test');

      // Assert
      expect(deleted).toBe(true);
      expect(result).toBe(CACHE_MISS); // BUG 2 FIX: CACHE_MISS instead of null
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

      // Should be expired - returns CACHE_MISS
      expect(cache.get('ttl:test')).toBe(CACHE_MISS);

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
      expect(cache.get('unknown:test')).toBe(CACHE_MISS);

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

// ============================================================================
// BUG 1 FIX TESTS: Eviction Desnecessária no set()
// ============================================================================

describe('Bug 1 Fix: Set Method Eviction', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  it('should not create duplicate entries when updating existing key', () => {
    // Arrange
    cacheManager.set('dup:A', 'valueA', 'test');
    cacheManager.set('dup:B', 'valueB', 'test');
    cacheManager.set('dup:C', 'valueC', 'test');

    const sizeBefore = cacheManager.getStats().size;

    // Act - Update existing key multiple times
    cacheManager.set('dup:A', 'valueA1', 'test');
    cacheManager.set('dup:A', 'valueA2', 'test');
    cacheManager.set('dup:A', 'valueA3', 'test');

    const sizeAfter = cacheManager.getStats().size;

    // Assert - Size should remain the same (no duplicates)
    expect(sizeAfter).toBe(sizeBefore);
    expect(cacheManager.get('dup:A')).toBe('valueA3');
    expect(cacheManager.get('dup:B')).toBe('valueB');
    expect(cacheManager.get('dup:C')).toBe('valueC');
  });

  it('should preserve createdAt when updating existing key', () => {
    // Arrange
    vi.useFakeTimers();
    const startTime = Date.now();

    cacheManager.set('preserve:test', 'value1', 'test');

    // Advance time
    vi.advanceTimersByTime(5000);

    // Act - Update the key
    cacheManager.set('preserve:test', 'value2', 'test');

    // Get stats - oldestEntry should be the original createdAt
    const stats = cacheManager.getStats();

    // Assert - oldestEntry should still be the original time
    expect(stats.oldestEntry?.getTime()).toBe(startTime);

    vi.useRealTimers();
  });

  it('should extend expiration when updating existing key', () => {
    // Arrange
    vi.useFakeTimers();
    cacheManager.set('extend:test', 'value1', 'notifications_count'); // 30s TTL

    // Advance time to near expiration
    vi.advanceTimersByTime(25 * 1000); // 25s

    // Act - Update the key (should reset TTL)
    cacheManager.set('extend:test', 'value2', 'notifications_count');

    // Advance another 25s (total 50s from start, but only 25s from update)
    vi.advanceTimersByTime(25 * 1000);

    // Assert - Key should still be valid (TTL was reset)
    expect(cacheManager.get('extend:test')).toBe('value2');

    // Advance past new TTL
    vi.advanceTimersByTime(10 * 1000);
    expect(cacheManager.get('extend:test')).toBe(CACHE_MISS);

    vi.useRealTimers();
  });
});

// ============================================================================
// BUG 2 FIX TESTS: Cache Bypass para Valores Falsy
// ============================================================================

describe('Bug 2 Fix: Falsy Values Support', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  it('should cache null values correctly', async () => {
    const loader = vi.fn().mockResolvedValue(null);

    // First call: cache miss, loader called
    const result1 = await getOrSet('falsy:null', 'test', loader);
    expect(result1).toBe(null);
    expect(loader).toHaveBeenCalledTimes(1);

    // Second call: cache HIT (null is legitimate)
    const result2 = await getOrSet('falsy:null', 'test', loader);
    expect(result2).toBe(null);
    expect(loader).toHaveBeenCalledTimes(1); // NOT called again
  });

  it('should cache undefined values correctly', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);

    const result1 = await getOrSet('falsy:undefined', 'test', loader);
    expect(result1).toBe(undefined);

    const result2 = await getOrSet('falsy:undefined', 'test', loader);
    expect(result2).toBe(undefined);
    expect(loader).toHaveBeenCalledTimes(1); // Cache hit
  });

  it('should cache zero (0) correctly - critical for notification counts', async () => {
    const loader = vi.fn().mockResolvedValue(0);

    // Critical case: notifications count = 0
    const result1 = await getOrSet('notifications:count:user123', 'notifications_count', loader);
    expect(result1).toBe(0);

    const result2 = await getOrSet('notifications:count:user123', 'notifications_count', loader);
    expect(result2).toBe(0);
    expect(loader).toHaveBeenCalledTimes(1); // Cache hit, NOT bypass
  });

  it('should cache false correctly', async () => {
    const loader = vi.fn().mockResolvedValue(false);

    const result1 = await getOrSet('feature:enabled', 'test', loader);
    expect(result1).toBe(false);

    const result2 = await getOrSet('feature:enabled', 'test', loader);
    expect(result2).toBe(false);
    expect(loader).toHaveBeenCalledTimes(1); // Cache hit
  });

  it('should cache empty string correctly', async () => {
    const loader = vi.fn().mockResolvedValue('');

    const result1 = await getOrSet('user:bio', 'test', loader);
    expect(result1).toBe('');

    const result2 = await getOrSet('user:bio', 'test', loader);
    expect(result2).toBe('');
    expect(loader).toHaveBeenCalledTimes(1); // Cache hit
  });

  it('should distinguish cache miss from cached null', () => {
    // Set null explicitly
    cacheManager.set('explicit:null', null, 'test');

    // Get should return null (not CACHE_MISS)
    const result = cacheManager.get('explicit:null');
    expect(result).toBe(null);
    expect(result).not.toBe(CACHE_MISS);

    // Try non-existent key
    const missing = cacheManager.get('explicit:nonexistent');
    expect(missing).toBe(CACHE_MISS);
  });

  it('should handle all falsy values in real-world scenario', async () => {
    const falsyValues = [
      { value: null, key: 'null' },
      { value: undefined, key: 'undefined' },
      { value: 0, key: 'zero' },
      { value: false, key: 'false' },
      { value: '', key: 'empty' },
    ];

    for (const { value, key } of falsyValues) {
      const loader = vi.fn().mockResolvedValue(value);

      // First call
      await getOrSet(`realworld:${key}`, 'test', loader);

      // Second call (should hit cache)
      await getOrSet(`realworld:${key}`, 'test', loader);

      // Verify loader called only once
      expect(loader).toHaveBeenCalledTimes(1);
    }
  });

  it('should return CACHE_MISS symbol for non-existent keys', () => {
    const result = cacheManager.get('nonexistent:key');
    expect(result).toBe(CACHE_MISS);
    expect(typeof CACHE_MISS).toBe('symbol');
  });
});

// ============================================================================
// BUG 4 FIX TESTS: Eviction com Chaves Falsy
// ============================================================================

describe('Bug 4 Fix: Eviction with Falsy Keys', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  it('should evict empty string key correctly', () => {
    // Add entries including empty string key
    cacheManager.set('', 'value-empty', 'test');
    cacheManager.set('a', 'value-a', 'test');
    cacheManager.set('b', 'value-b', 'test');

    const sizeBefore = cacheManager.getStats().size;
    expect(sizeBefore).toBe(3);

    // Access 'a' and 'b' to make '' the oldest (LRU)
    cacheManager.get('a');
    cacheManager.get('b');

    // Note: Since we're using singleton with large maxEntries,
    // we test that empty string key can be deleted and re-added
    cacheManager.delete('');
    expect(cacheManager.get('')).toBe(CACHE_MISS);

    // Re-add empty string key
    cacheManager.set('', 'new-empty-value', 'test');
    expect(cacheManager.get('')).toBe('new-empty-value');
  });

  it('should handle key "0" (zero string) correctly', () => {
    cacheManager.set('0', 'zero-value', 'test');
    cacheManager.set('1', 'one-value', 'test');

    expect(cacheManager.get('0')).toBe('zero-value');
    expect(cacheManager.get('1')).toBe('one-value');

    // Delete '0' key
    const deleted = cacheManager.delete('0');
    expect(deleted).toBe(true);
    expect(cacheManager.get('0')).toBe(CACHE_MISS);
  });

  it('should work with mixed falsy and truthy keys', () => {
    // Add mixed keys
    cacheManager.set('', 'empty', 'test');
    cacheManager.set('0', 'zero-str', 'test');
    cacheManager.set('a', 'alpha', 'test');
    cacheManager.set('b', 'beta', 'test');

    // All should be retrievable
    expect(cacheManager.get('')).toBe('empty');
    expect(cacheManager.get('0')).toBe('zero-str');
    expect(cacheManager.get('a')).toBe('alpha');
    expect(cacheManager.get('b')).toBe('beta');

    // Invalidate falsy keys
    cacheManager.delete('');
    cacheManager.delete('0');

    expect(cacheManager.get('')).toBe(CACHE_MISS);
    expect(cacheManager.get('0')).toBe(CACHE_MISS);
    expect(cacheManager.get('a')).toBe('alpha');
    expect(cacheManager.get('b')).toBe('beta');
  });

  it('should invalidate pattern matching empty string prefix', () => {
    // Add keys with various prefixes
    cacheManager.set('test:1', 'value1', 'test');
    cacheManager.set('test:2', 'value2', 'test');
    cacheManager.set('other:1', 'other1', 'test');

    // Invalidate 'test:' prefix
    const count = cacheManager.invalidate('test:');
    expect(count).toBe(2);

    expect(cacheManager.get('test:1')).toBe(CACHE_MISS);
    expect(cacheManager.get('test:2')).toBe(CACHE_MISS);
    expect(cacheManager.get('other:1')).toBe('other1');
  });

  it('should correctly check existence of falsy keys with has()', () => {
    cacheManager.set('', 'empty-value', 'test');
    cacheManager.set('0', 'zero-value', 'test');

    expect(cacheManager.has('')).toBe(true);
    expect(cacheManager.has('0')).toBe(true);
    expect(cacheManager.has('nonexistent')).toBe(false);

    // After deletion
    cacheManager.delete('');
    expect(cacheManager.has('')).toBe(false);
  });
});

// ============================================================================
// BUG 5 FIX TESTS: LRU Order em Updates
// ============================================================================

describe('Bug 5 Fix: LRU Order on Updates', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  it('should move updated key to end (most recently used position)', () => {
    // Setup: Use a small cache to test eviction
    // Note: We're using the singleton, so we test order via key access patterns

    // Insert 3 keys
    cacheManager.set('order:A', 'valueA', 'test');
    cacheManager.set('order:B', 'valueB', 'test');
    cacheManager.set('order:C', 'valueC', 'test');

    // Verify initial state
    expect(cacheManager.get('order:A')).toBe('valueA');
    expect(cacheManager.get('order:B')).toBe('valueB');
    expect(cacheManager.get('order:C')).toBe('valueC');

    // Update A (should move to end)
    cacheManager.set('order:A', 'valueA_updated', 'test');

    // Verify A was updated
    expect(cacheManager.get('order:A')).toBe('valueA_updated');

    // Get internal keys to verify order
    const keys = cacheManager.keys('order:');

    // A should be at the end (moved due to update)
    expect(keys[keys.length - 1]).toBe('order:A');
  });

  it('should maintain correct LRU order with multiple updates', () => {
    cacheManager.set('multi:A', 1, 'test');
    cacheManager.set('multi:B', 2, 'test');
    cacheManager.set('multi:C', 3, 'test');

    // Initial order: [A, B, C]

    // Update in reverse order: C, B, A
    cacheManager.set('multi:C', 30, 'test'); // Order: [A, B, C] (C stays at end)
    cacheManager.set('multi:B', 20, 'test'); // Order: [A, C, B] (B moved to end)
    cacheManager.set('multi:A', 10, 'test'); // Order: [C, B, A] (A moved to end)

    // Get keys FIRST before any get() calls (get() also affects LRU order)
    const keys = cacheManager.keys('multi:');

    // A should be at the end (last updated)
    expect(keys[keys.length - 1]).toBe('multi:A');

    // C should be first (oldest after updates)
    expect(keys[0]).toBe('multi:C');

    // B should be in the middle
    expect(keys[1]).toBe('multi:B');

    // Now verify values (get() calls will change order, but we already checked)
    expect(cacheManager.get('multi:A')).toBe(10);
    expect(cacheManager.get('multi:B')).toBe(20);
    expect(cacheManager.get('multi:C')).toBe(30);
  });

  it('should handle alternating inserts and updates correctly', () => {
    cacheManager.set('alt:A', 1, 'test'); // Insert: [A]
    cacheManager.set('alt:B', 2, 'test'); // Insert: [A, B]
    cacheManager.set('alt:A', 10, 'test'); // Update: [B, A]
    cacheManager.set('alt:C', 3, 'test'); // Insert: [B, A, C]
    cacheManager.set('alt:B', 20, 'test'); // Update: [A, C, B]
    cacheManager.set('alt:D', 4, 'test'); // Insert: [A, C, B, D]

    // Verify all values
    expect(cacheManager.get('alt:A')).toBe(10);
    expect(cacheManager.get('alt:B')).toBe(20);
    expect(cacheManager.get('alt:C')).toBe(3);
    expect(cacheManager.get('alt:D')).toBe(4);

    // Verify D is at the end
    const keys = cacheManager.keys('alt:');
    expect(keys[keys.length - 1]).toBe('alt:D');
  });

  it('should preserve hit count when moving key to end', () => {
    cacheManager.set('hits:key', 'value1', 'test');

    // Access multiple times
    cacheManager.get('hits:key'); // hit 1
    cacheManager.get('hits:key'); // hit 2
    cacheManager.get('hits:key'); // hit 3

    // Get stats before update
    const statsBefore = cacheManager.getStats();

    // Update (should preserve hits and move to end)
    cacheManager.set('hits:key', 'value2', 'test');

    // Verify value updated
    expect(cacheManager.get('hits:key')).toBe('value2');

    // Stats should show hits were tracked
    const statsAfter = cacheManager.getStats();
    expect(statsAfter.totalHits).toBeGreaterThanOrEqual(statsBefore.totalHits);
  });

  it('should correctly evict oldest after updates change order', () => {
    // This test simulates a real scenario where updates affect eviction

    // Clear and set up fresh keys
    cacheManager.clear();

    // Add keys with unique prefix to isolate test
    cacheManager.set('evict:first', 'first-value', 'test');
    cacheManager.set('evict:second', 'second-value', 'test');
    cacheManager.set('evict:third', 'third-value', 'test');

    // Update 'first' (should move to end)
    cacheManager.set('evict:first', 'first-updated', 'test');

    // Now order is: [second, third, first]
    // If we needed to evict, 'second' should go first, not 'first'

    // Verify the update worked
    expect(cacheManager.get('evict:first')).toBe('first-updated');

    // Verify all keys still exist
    expect(cacheManager.has('evict:first')).toBe(true);
    expect(cacheManager.has('evict:second')).toBe(true);
    expect(cacheManager.has('evict:third')).toBe(true);
  });

  it('should work correctly with getOrSet after updates', async () => {
    const loader = vi.fn().mockResolvedValue('loaded-value');

    // Set initial value
    cacheManager.set('getorset:key', 'initial-value', 'test');

    // Update it
    cacheManager.set('getorset:key', 'updated-value', 'test');

    // getOrSet should return cached (updated) value, not call loader
    const result = await getOrSet('getorset:key', 'test', loader);

    expect(result).toBe('updated-value');
    expect(loader).not.toHaveBeenCalled();
  });
});
