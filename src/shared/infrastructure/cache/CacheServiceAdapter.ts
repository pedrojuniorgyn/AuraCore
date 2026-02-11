/**
 * CacheServiceAdapter - Adapter that wraps the legacy CacheService
 * 
 * Implements ICacheService port using the existing Redis-based cache.
 * This adapter bridges the legacy service with the DDD architecture.
 * 
 * @implements ICacheService
 * @see src/shared/domain/ports/output/ICacheService.ts
 */

import { injectable } from 'tsyringe';
import type { ICacheService, CacheTTLPresets, CacheStats } from '@/shared/domain/ports/output/ICacheService';
import { CacheService, CacheTTL } from '@/services/cache.service';

@injectable()
export class CacheServiceAdapter implements ICacheService {
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    return CacheService.get<T>(key, prefix);
  }

  async set(key: string, value: unknown, ttl?: number, prefix?: string): Promise<void> {
    return CacheService.set(key, value, ttl ?? CacheTTL.MEDIUM, prefix);
  }

  async delete(key: string, prefix?: string): Promise<void> {
    return CacheService.delete(key, prefix);
  }

  async invalidatePattern(pattern: string, prefix?: string): Promise<number> {
    return CacheService.invalidatePattern(pattern, prefix);
  }

  async flush(): Promise<void> {
    return CacheService.flush();
  }

  async remember<T>(key: string, fn: () => Promise<T>, ttl?: number, prefix?: string): Promise<T> {
    return CacheService.remember<T>(key, fn, ttl ?? CacheTTL.MEDIUM, prefix);
  }

  async getStats(): Promise<CacheStats> {
    return CacheService.getStats();
  }

  getTTL(): CacheTTLPresets {
    return CacheTTL;
  }
}
