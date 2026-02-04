/**
 * CacheService - Wrapper sobre RedisCache
 * Fornece API simplificada e TTL strategies
 * 
 * @module services/cache
 */
import { redisCache } from '@/lib/cache';
import { log } from '@/lib/observability/logger';

/**
 * TTL Strategies (em segundos)
 */
export const CacheTTL = {
  /** 5 minutos - dados voláteis (notifications, counts) */
  SHORT: 5 * 60,
  
  /** 30 minutos - dados semi-estáticos (departments, users) */
  MEDIUM: 30 * 60,
  
  /** 24 horas - dados quase estáticos (lookup tables, configs) */
  LONG: 24 * 60 * 60,
} as const;

export class CacheService {
  /**
   * Busca valor do cache
   * @returns null se não encontrado ou erro
   */
  static async get<T>(key: string, prefix?: string): Promise<T | null> {
    const start = Date.now();
    try {
      const result = await redisCache.get<T>(key, prefix);
      const duration = Date.now() - start;
      
      // Log estruturado
      log('debug', 'cache.get', {
        key: `${prefix || 'aura:'}${key}`,
        hit: result !== null,
        durationMs: duration,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      log('error', 'cache.get.error', {
        key: `${prefix || 'aura:'}${key}`,
        error,
        durationMs: duration,
      });
      return null;
    }
  }

  /**
   * Salva valor no cache com TTL
   * @param ttl TTL em segundos (default: 30min - MEDIUM)
   */
  static async set(
    key: string,
    value: unknown,
    ttl: number = CacheTTL.MEDIUM,
    prefix?: string
  ): Promise<void> {
    const start = Date.now();
    try {
      await redisCache.set(key, value, { ttl, prefix });
      const duration = Date.now() - start;
      
      // Log estruturado
      log('debug', 'cache.set', {
        key: `${prefix || 'aura:'}${key}`,
        ttl,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - start;
      log('error', 'cache.set.error', {
        key: `${prefix || 'aura:'}${key}`,
        error,
        durationMs: duration,
      });
    }
  }

  /**
   * Remove chave específica do cache
   */
  static async delete(key: string, prefix?: string): Promise<void> {
    try {
      await redisCache.delete(key, prefix);
    } catch (error) {
      console.error(`[CacheService] DELETE error for key "${key}":`, error);
    }
  }

  /**
   * Invalida múltiplas chaves por pattern
   * @example invalidatePattern('departments:*')
   */
  static async invalidatePattern(pattern: string, prefix?: string): Promise<number> {
    try {
      const count = await redisCache.invalidate(pattern, prefix);
      return count;
    } catch (error) {
      console.error(`[CacheService] INVALIDATE error for pattern "${pattern}":`, error);
      return 0;
    }
  }

  /**
   * Limpa todo o cache do DB atual
   * ⚠️ USE COM CUIDADO!
   */
  static async flush(): Promise<void> {
    try {
      await redisCache.flush();
      console.warn('[CacheService] FLUSH - all cache cleared');
    } catch (error) {
      console.error('[CacheService] FLUSH error:', error);
    }
  }

  /**
   * Cache-aside pattern: tenta cache, se miss executa fn e cacheia
   */
  static async remember<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM,
    prefix?: string
  ): Promise<T> {
    try {
      return await redisCache.remember<T>(key, fn, { ttl, prefix });
    } catch (error) {
      console.error(`[CacheService] REMEMBER error for key "${key}":`, error);
      // Fallback: executar função sem cache
      return await fn();
    }
  }

  /**
   * Retorna estatísticas do cache
   */
  static async getStats(): Promise<{
    keys: number;
    memory: string;
  }> {
    try {
      const stats = await redisCache.getStats();
      if (!stats) {
        return { keys: 0, memory: 'unknown' };
      }

      // Extrair informações relevantes
      const keys = parseInt(stats.keyspace_hits || '0') + parseInt(stats.keyspace_misses || '0');
      const memory = stats.used_memory_human || 'unknown';

      return { keys, memory };
    } catch (error) {
      console.error('[CacheService] STATS error:', error);
      return { keys: 0, memory: 'error' };
    }
  }

  /**
   * Retorna TTL presets disponíveis
   */
  static getTTL() {
    return CacheTTL;
  }
}
