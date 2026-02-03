/**
 * Redis Cache Service
 * Implementa cache distribuído com TTL configurável
 * 
 * @module lib/cache
 */
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time-to-live em segundos
  prefix?: string; // Prefixo para as chaves
}

export class RedisCache {
  private static instance: RedisCache | null = null;
  private client: Redis | null = null;
  private readonly defaultTTL = 300; // 5 minutos
  private readonly defaultPrefix = 'aura:';

  private constructor() {
    // Singleton: usar getInstance()
  }

  /**
   * Obtém instância singleton do cache
   */
  public static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  /**
   * Conecta ao Redis
   */
  public connect(url?: string): void {
    if (this.client) {
      return; // Já conectado
    }

    const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('[RedisCache] Error:', err.message);
    });

    this.client.on('connect', () => {
      console.log('[RedisCache] Connected to Redis');
    });
  }

  /**
   * Desconecta do Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Verifica se está conectado
   */
  public isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /**
   * Busca valor no cache
   */
  public async get<T>(key: string, prefix?: string): Promise<T | null> {
    if (!this.isConnected()) {
      console.warn('[RedisCache] Not connected. Skipping cache read.');
      return null;
    }

    try {
      const fullKey = this.buildKey(key, prefix);
      const data = await this.client!.get(fullKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      console.error('[RedisCache] Error reading cache:', error);
      return null;
    }
  }

  /**
   * Define valor no cache com TTL
   */
  public async set(
    key: string,
    value: unknown,
    options?: CacheOptions
  ): Promise<void> {
    if (!this.isConnected()) {
      console.warn('[RedisCache] Not connected. Skipping cache write.');
      return;
    }

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl ?? this.defaultTTL;
      const serialized = JSON.stringify(value);

      await this.client!.setex(fullKey, ttl, serialized);
    } catch (error) {
      console.error('[RedisCache] Error writing cache:', error);
    }
  }

  /**
   * Remove chave específica do cache
   */
  public async delete(key: string, prefix?: string): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    try {
      const fullKey = this.buildKey(key, prefix);
      await this.client!.del(fullKey);
    } catch (error) {
      console.error('[RedisCache] Error deleting key:', error);
    }
  }

  /**
   * Remove múltiplas chaves por padrão (invalidação em lote)
   * Exemplo: invalidate('strategic:*') remove todas as chaves que começam com strategic:
   */
  public async invalidate(pattern: string, prefix?: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const fullPattern = this.buildKey(pattern, prefix);
      const keys = await this.client!.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.client!.del(...keys);
      console.log(`[RedisCache] Invalidated ${deleted} keys matching: ${fullPattern}`);
      return deleted;
    } catch (error) {
      console.error('[RedisCache] Error invalidating cache:', error);
      return 0;
    }
  }

  /**
   * Limpa todo o cache (usar com cuidado!)
   */
  public async flush(): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    try {
      await this.client!.flushdb();
      console.log('[RedisCache] Cache flushed');
    } catch (error) {
      console.error('[RedisCache] Error flushing cache:', error);
    }
  }

  /**
   * Retorna estatísticas do Redis
   */
  public async getStats(): Promise<Record<string, string> | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const info = await this.client!.info('stats');
      const stats: Record<string, string> = {};

      info.split('\r\n').forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return stats;
    } catch (error) {
      console.error('[RedisCache] Error getting stats:', error);
      return null;
    }
  }

  /**
   * Constrói chave completa com prefixo
   */
  private buildKey(key: string, prefix?: string): string {
    const p = prefix ?? this.defaultPrefix;
    return `${p}${key}`;
  }

  /**
   * Helper: cache-aside pattern
   * Tenta buscar do cache, se não existir executa função e cacheia resultado
   */
  public async remember<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // 1. Tentar buscar do cache
    const cached = await this.get<T>(key, options?.prefix);
    if (cached !== null) {
      return cached;
    }

    // 2. Não encontrou: executar função
    const result = await fn();

    // 3. Cachear resultado
    await this.set(key, result, options);

    return result;
  }
}

// Export singleton instance
export const redisCache = RedisCache.getInstance();
