/**
 * ICacheService - Port interface for cache operations
 * 
 * Defines the contract for cache services (Redis, memory, etc.)
 * Following Hexagonal Architecture (Ports & Adapters)
 * 
 * @see src/services/cache.service.ts (legacy implementation)
 * @see src/shared/infrastructure/cache/CacheServiceAdapter.ts (adapter)
 */

/**
 * TTL presets (in seconds)
 */
export interface CacheTTLPresets {
  /** 5 minutes - volatile data (notifications, counts) */
  readonly SHORT: number;
  /** 30 minutes - semi-static data (departments, users) */
  readonly MEDIUM: number;
  /** 24 hours - nearly static data (lookup tables, configs) */
  readonly LONG: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  keys: number;
  memory: string;
}

/**
 * Cache service port - abstracts cache infrastructure
 */
export interface ICacheService {
  /**
   * Get value from cache
   * @returns null if not found or error
   */
  get<T>(key: string, prefix?: string): Promise<T | null>;

  /**
   * Set value in cache with TTL
   * @param ttl TTL in seconds (default: MEDIUM = 30min)
   */
  set(key: string, value: unknown, ttl?: number, prefix?: string): Promise<void>;

  /**
   * Delete specific key from cache
   */
  delete(key: string, prefix?: string): Promise<void>;

  /**
   * Invalidate multiple keys by pattern
   * @returns number of invalidated keys
   */
  invalidatePattern(pattern: string, prefix?: string): Promise<number>;

  /**
   * Flush all cache
   * WARNING: Use with caution!
   */
  flush(): Promise<void>;

  /**
   * Cache-aside pattern: try cache, on miss execute fn and cache result
   */
  remember<T>(key: string, fn: () => Promise<T>, ttl?: number, prefix?: string): Promise<T>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;

  /**
   * Get TTL presets
   */
  getTTL(): CacheTTLPresets;
}
