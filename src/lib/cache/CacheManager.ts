/**
 * E13 - CacheManager LRU com TTL
 *
 * Cache in-memory otimizado para performance.
 * Implementa LRU (Least Recently Used) nativo sem dependências.
 *
 * @module lib/cache/CacheManager
 * @since E13 - Performance Optimization
 *
 * TTL Guidelines:
 * - Ultra-hot data (notifications count): 30s
 * - Hot data (branches list): 5min
 * - Warm data (permissions, metrics): 5min
 * - Cold data (reports): 10min
 */

// ============================================================================
// SYMBOLS
// ============================================================================

/**
 * BUG 2 FIX: Symbol sentinel para distinguir cache miss de valores falsy
 *
 * Problema: Valores como null, undefined, 0, false, '' são legítimos
 * mas eram tratados como cache miss no getOrSet().
 *
 * Solução: Usar Symbol único para indicar cache miss explícito.
 */
export const CACHE_MISS = Symbol('CACHE_MISS');

// ============================================================================
// TYPES
// ============================================================================

export interface CacheConfig {
  /** Maximum number of entries */
  maxEntries: number;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** TTL per resource type (overrides default) */
  ttlByType: Record<string, number>;
  /** Enable debug logging */
  debug?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
  size: number;
}

interface HitRateStats {
  hits: number;
  misses: number;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  hitRate: number;
  hitRateByResource: Record<string, number>;
  totalHits: number;
  totalMisses: number;
  oldestEntry: Date | null;
  memoryEstimate: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  maxEntries: 5000, // 5k entries max
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  ttlByType: {
    notifications_count: 30 * 1000, // 30 seconds
    branches: 5 * 60 * 1000, // 5 minutes
    permissions: 5 * 60 * 1000, // 5 minutes
    dashboard_metrics: 2 * 60 * 1000, // 2 minutes
    reports: 10 * 60 * 1000, // 10 minutes
    user_preferences: 15 * 60 * 1000, // 15 minutes
    lookup_tables: 30 * 60 * 1000, // 30 minutes
  },
  debug: false,
};

// ============================================================================
// CACHE MANAGER
// ============================================================================

class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private hitRate: Map<string, HitRateStats> = new Map();
  private config: CacheConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start cleanup interval (every 60 seconds)
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  static getInstance(config?: Partial<CacheConfig>): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  /**
   * Get value from cache
   *
   * BUG 2 FIX: Retorna CACHE_MISS symbol ao invés de null
   * para distinguir cache miss de valores falsy legítimos.
   *
   * @param key - Cache key (format: "resource:id:params")
   * @returns Cached value or CACHE_MISS symbol if not found/expired
   */
  get<T>(key: string): T | typeof CACHE_MISS {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.recordMiss(key);
      this.log(`MISS: ${key}`);
      return CACHE_MISS;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.recordMiss(key);
      this.log(`EXPIRED: ${key}`);
      return CACHE_MISS;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.recordHit(key);
    this.log(`HIT: ${key} (hits: ${entry.hits})`);

    return entry.value;
  }

  /**
   * Set value in cache
   *
   * BUG 1 FIX: Verifica se key já existe antes de inserir
   * para evitar eviction desnecessária e preservar hit count.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param resourceType - Resource type for TTL lookup
   */
  set<T>(key: string, value: T, resourceType: string): void {
    const ttl = this.config.ttlByType[resourceType] ?? this.config.defaultTTL;
    const now = Date.now();
    const size = this.estimateSize(value);

    // BUG 1 FIX: Verificar se key já existe para preservar metadata
    const existing = this.cache.get(key) as CacheEntry<T> | undefined;

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttl,
      createdAt: existing?.createdAt ?? now, // Preservar createdAt original
      hits: existing?.hits ?? 0, // Preservar hit count se existir
      size,
    };

    // BUG 1 FIX: Evict APENAS se key não existe E está em capacidade máxima
    // BUG 4 FIX: Usar !== undefined para suportar chaves falsy ('', '0', 0, false)
    if (!existing && this.cache.size >= this.config.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      // ✅ BUG 4 FIX: Check for undefined, not truthy
      // ANTES: if (oldestKey) { ... } - falha com '', '0', 0, false
      // DEPOIS: if (oldestKey !== undefined) { ... } - funciona com todos
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.log(`EVICTED (LRU): ${JSON.stringify(oldestKey)}`);
      }
    }

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.log(`SET: ${key} (ttl: ${ttl}ms, size: ${size}b, update: ${!!existing})`);
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.log(`DELETED: ${key}`);
    }
    return deleted;
  }

  /**
   * Invalidate cache entries by pattern
   *
   * @param pattern - Prefix string or RegExp
   *
   * @example
   * // Invalidate all titles for org 1, branch 1
   * invalidate('financial_titles:1:1');
   *
   * // Invalidate all notifications
   * invalidate(/^notifications_count:/);
   */
  invalidate(pattern: string | RegExp): number {
    const regex =
      typeof pattern === 'string' ? new RegExp(`^${this.escapeRegex(pattern)}`) : pattern;

    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    this.log(`INVALIDATED: ${keysToDelete.length} entries matching ${pattern}`);

    return keysToDelete.length;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalHits = 0;
    let totalMisses = 0;
    let oldestCreatedAt: number | null = null;
    let totalSize = 0;

    // Calculate hit rates
    const hitRateByResource: Record<string, number> = {};
    this.hitRate.forEach((stats, resource) => {
      totalHits += stats.hits;
      totalMisses += stats.misses;
      const total = stats.hits + stats.misses;
      hitRateByResource[resource] = total > 0 ? Math.round((stats.hits / total) * 100) : 0;
    });

    // Calculate oldest entry and total size
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      if (oldestCreatedAt === null || entry.createdAt < oldestCreatedAt) {
        oldestCreatedAt = entry.createdAt;
      }
    }

    const globalTotal = totalHits + totalMisses;
    const hitRate = globalTotal > 0 ? Math.round((totalHits / globalTotal) * 100) : 0;

    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      hitRate,
      hitRateByResource,
      totalHits,
      totalMisses,
      oldestEntry: oldestCreatedAt ? new Date(oldestCreatedAt) : null,
      memoryEstimate: this.formatBytes(totalSize),
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hitRate.clear();
    this.log(`CLEARED: ${size} entries`);
  }

  /**
   * Get all keys matching pattern
   */
  keys(pattern?: string | RegExp): string[] {
    const allKeys = Array.from(this.cache.keys());

    if (!pattern) return allKeys;

    const regex =
      typeof pattern === 'string' ? new RegExp(`^${this.escapeRegex(pattern)}`) : pattern;

    return allKeys.filter((key) => regex.test(key));
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.log(`CLEANUP: Removed ${removed} expired entries`);
    }
  }

  private recordHit(key: string): void {
    const resourceType = key.split(':')[0];
    const stats = this.hitRate.get(resourceType) ?? { hits: 0, misses: 0 };
    stats.hits++;
    this.hitRate.set(resourceType, stats);
  }

  private recordMiss(key: string): void {
    const resourceType = key.split(':')[0];
    const stats = this.hitRate.get(resourceType) ?? { hits: 0, misses: 0 };
    stats.misses++;
    this.hitRate.set(resourceType, stats);
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 ~2 bytes per char
    } catch {
      return 100; // Default estimate
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[CacheManager] ${message}`);
    }
  }

  /**
   * Shutdown cleanup interval (for tests)
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Singleton cache instance */
export const cacheManager = CacheManager.getInstance();

/**
 * Get or set helper - fetches from cache or calls loader
 *
 * BUG 2 FIX: Usa CACHE_MISS symbol para distinguir cache miss de valores falsy.
 * Agora suporta corretamente: null, undefined, 0, false, '', NaN, 0n
 *
 * @example
 * // Funciona corretamente com valor 0
 * const count = await getOrSet(
 *   'notifications:count:user123',
 *   'notifications_count',
 *   async () => 0 // Zero é legítimo e será cacheado
 * );
 */
export async function getOrSet<T>(
  key: string,
  resourceType: string,
  loader: () => Promise<T>
): Promise<T> {
  const cached = cacheManager.get<T>(key);

  // BUG 2 FIX: Verifica CACHE_MISS ao invés de null
  if (cached !== CACHE_MISS) {
    return cached as T; // Inclui null, undefined, 0, false, '', etc
  }

  const value = await loader();
  cacheManager.set(key, value, resourceType);
  return value;
}

/**
 * Decorator to invalidate cache after mutation
 *
 * @example
 * async createTitle(data: CreateTitleInput) {
 *   const result = await this.repository.save(data);
 *   invalidateAfterMutation(`financial_titles:${data.organizationId}`);
 *   return result;
 * }
 */
export function invalidateAfterMutation(pattern: string | RegExp): void {
  cacheManager.invalidate(pattern);
}

export { CacheManager };
