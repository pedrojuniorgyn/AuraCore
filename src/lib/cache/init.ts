/**
 * Inicialização do Redis Cache
 * Conecta ao Redis durante o startup da aplicação
 * 
 * @module lib/cache
 */
import { redisCache } from './RedisCache';

let isInitialized = false;

/**
 * Inicializa conexão com Redis
 */
export function initRedisCache(): void {
  if (isInitialized) {
    return;
  }

  const redisEnabled = process.env.REDIS_ENABLED === 'true';

  if (!redisEnabled) {
    console.log('[Cache] Redis cache disabled (REDIS_ENABLED=false)');
    return;
  }

  try {
    // Construir URL a partir de variáveis individuais se REDIS_URL não existir
    let redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      const host = process.env.REDIS_HOST;
      const port = process.env.REDIS_PORT || '6379';
      const password = process.env.REDIS_PASSWORD;
      const username = process.env.REDIS_USERNAME || 'default';
      const db = process.env.REDIS_DB || '0';

      if (host) {
        // Construir URL: redis://[username]:[password]@[host]:[port]/[db]
        const auth = password ? `${username}:${password}@` : '';
        redisUrl = `redis://${auth}${host}:${port}/${db}`;
        console.log(`[Cache] Built Redis URL from individual vars: redis://${username}:***@${host}:${port}/${db}`);
      }
    }

    if (!redisUrl) {
      console.warn('[Cache] No REDIS_URL or REDIS_HOST configured. Cache disabled.');
      return;
    }

    redisCache.connect(redisUrl);
    isInitialized = true;
    console.log('[Cache] Redis cache initialized');
  } catch (error) {
    console.error('[Cache] Failed to initialize Redis:', error);
    // Não falha a aplicação se Redis não estiver disponível
    // A aplicação continua funcionando sem cache
  }
}

/**
 * Desliga conexão com Redis (graceful shutdown)
 */
export async function shutdownRedisCache(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  try {
    await redisCache.disconnect();
    isInitialized = false;
    console.log('[Cache] Redis cache disconnected');
  } catch (error) {
    console.error('[Cache] Error disconnecting Redis:', error);
  }
}

/**
 * Hook de inicialização para Next.js
 * Chamar em instrumentation.ts ou middleware
 */
if (typeof window === 'undefined') {
  // Server-side only
  initRedisCache();
}
