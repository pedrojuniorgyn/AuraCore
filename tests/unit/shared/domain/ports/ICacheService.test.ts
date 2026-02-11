import { describe, it, expect } from 'vitest';
import type { ICacheService, CacheTTLPresets, CacheStats } from '@/shared/domain/ports/output/ICacheService';

describe('ICacheService port interface', () => {
  it('should define a complete cache service interface', () => {
    // Type-level test: verify the interface shape
    const mockCacheService: ICacheService = {
      get: async <T>(_key: string, _prefix?: string): Promise<T | null> => null,
      set: async (_key: string, _value: unknown, _ttl?: number, _prefix?: string): Promise<void> => {},
      delete: async (_key: string, _prefix?: string): Promise<void> => {},
      invalidatePattern: async (_pattern: string, _prefix?: string): Promise<number> => 0,
      flush: async (): Promise<void> => {},
      remember: async <T>(_key: string, fn: () => Promise<T>, _ttl?: number, _prefix?: string): Promise<T> => fn(),
      getStats: async (): Promise<CacheStats> => ({ keys: 0, memory: 'unknown' }),
      getTTL: (): CacheTTLPresets => ({ SHORT: 300, MEDIUM: 1800, LONG: 86400 }),
    };

    expect(mockCacheService).toBeDefined();
    expect(typeof mockCacheService.get).toBe('function');
    expect(typeof mockCacheService.set).toBe('function');
    expect(typeof mockCacheService.delete).toBe('function');
    expect(typeof mockCacheService.invalidatePattern).toBe('function');
    expect(typeof mockCacheService.flush).toBe('function');
    expect(typeof mockCacheService.remember).toBe('function');
    expect(typeof mockCacheService.getStats).toBe('function');
    expect(typeof mockCacheService.getTTL).toBe('function');
  });

  it('should support generic types for get/remember', async () => {
    interface UserData {
      name: string;
      age: number;
    }

    const mock: ICacheService = {
      get: async <T>(): Promise<T | null> => ({ name: 'Test', age: 30 } as T),
      set: async () => {},
      delete: async () => {},
      invalidatePattern: async () => 0,
      flush: async () => {},
      remember: async <T>(_k: string, fn: () => Promise<T>): Promise<T> => fn(),
      getStats: async () => ({ keys: 0, memory: 'unknown' }),
      getTTL: () => ({ SHORT: 300, MEDIUM: 1800, LONG: 86400 }),
    };

    const user = await mock.get<UserData>('user:1');
    expect(user).toEqual({ name: 'Test', age: 30 });
  });
});
