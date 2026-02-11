import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the legacy CacheService before importing adapter
vi.mock('@/services/cache.service', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    invalidatePattern: vi.fn(),
    flush: vi.fn(),
    remember: vi.fn(),
    getStats: vi.fn(),
  },
  CacheTTL: {
    SHORT: 300,
    MEDIUM: 1800,
    LONG: 86400,
  },
}));

// Mock tsyringe
vi.mock('tsyringe', () => ({
  injectable: () => (target: unknown) => target,
  inject: () => () => undefined,
}));

import { CacheServiceAdapter } from '@/shared/infrastructure/cache/CacheServiceAdapter';
import { CacheService } from '@/services/cache.service';

describe('CacheServiceAdapter', () => {
  let adapter: CacheServiceAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CacheServiceAdapter();
  });

  describe('get', () => {
    it('should delegate to legacy CacheService.get', async () => {
      const mockData = { foo: 'bar' };
      (CacheService.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

      const result = await adapter.get<typeof mockData>('test-key', 'prefix:');

      expect(CacheService.get).toHaveBeenCalledWith('test-key', 'prefix:');
      expect(result).toEqual(mockData);
    });

    it('should return null when key not found', async () => {
      (CacheService.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await adapter.get('missing-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should delegate to legacy CacheService.set with default TTL', async () => {
      (CacheService.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await adapter.set('test-key', { data: 123 });

      expect(CacheService.set).toHaveBeenCalledWith('test-key', { data: 123 }, 1800, undefined);
    });

    it('should use custom TTL when provided', async () => {
      (CacheService.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await adapter.set('test-key', 'value', 300, 'custom:');

      expect(CacheService.set).toHaveBeenCalledWith('test-key', 'value', 300, 'custom:');
    });
  });

  describe('delete', () => {
    it('should delegate to legacy CacheService.delete', async () => {
      (CacheService.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await adapter.delete('test-key');

      expect(CacheService.delete).toHaveBeenCalledWith('test-key', undefined);
    });
  });

  describe('invalidatePattern', () => {
    it('should delegate and return count', async () => {
      (CacheService.invalidatePattern as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const count = await adapter.invalidatePattern('departments:*');

      expect(CacheService.invalidatePattern).toHaveBeenCalledWith('departments:*', undefined);
      expect(count).toBe(5);
    });
  });

  describe('remember', () => {
    it('should delegate to cache-aside pattern', async () => {
      const fn = vi.fn().mockResolvedValue({ result: 'computed' });
      (CacheService.remember as ReturnType<typeof vi.fn>).mockResolvedValue({ result: 'cached' });

      const result = await adapter.remember('test-key', fn, 600);

      expect(CacheService.remember).toHaveBeenCalledWith('test-key', fn, 600, undefined);
      expect(result).toEqual({ result: 'cached' });
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      (CacheService.getStats as ReturnType<typeof vi.fn>).mockResolvedValue({
        keys: 100,
        memory: '1.5MB',
      });

      const stats = await adapter.getStats();

      expect(stats).toEqual({ keys: 100, memory: '1.5MB' });
    });
  });

  describe('getTTL', () => {
    it('should return TTL presets', () => {
      const ttl = adapter.getTTL();

      expect(ttl.SHORT).toBe(300);
      expect(ttl.MEDIUM).toBe(1800);
      expect(ttl.LONG).toBe(86400);
    });
  });
});
