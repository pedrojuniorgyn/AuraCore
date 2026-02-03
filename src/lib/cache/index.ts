/**
 * Cache Module
 * Exporta serviços de cache (Redis)
 * 
 * @module lib/cache
 */
export { RedisCache, redisCache, type CacheOptions } from './RedisCache';
export { initRedisCache, shutdownRedisCache } from './init';
