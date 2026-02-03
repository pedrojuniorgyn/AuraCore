import Redis from 'ioredis';

/**
 * Valida e retorna configuração do Redis
 * @throws Error se REDIS_HOST não estiver definido
 */
const getRedisConfig = () => {
  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT || '6379');
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USERNAME || 'default'; // Redis Cloud usa 'default'
  const db = parseInt(process.env.REDIS_DB || '0');

  if (!host) {
    throw new Error('REDIS_HOST is not defined in environment variables');
  }

  return { host, port, password, username, db };
};

const config = getRedisConfig();

/**
 * Redis Client - Singleton com retry strategy exponencial
 * 
 * Configuração:
 * - Exponential backoff: 50ms, 100ms, 150ms, ..., max 2000ms
 * - Max 3 retries por request
 * - Lazy connect (conecta apenas quando necessário)
 * 
 * Environment Variables:
 * - REDIS_HOST (obrigatório)
 * - REDIS_PORT (default: 6379)
 * - REDIS_PASSWORD (opcional)
 * - REDIS_USERNAME (default: 'default') - Redis Cloud/Labs
 * - REDIS_DB (default: 0)
 */
const redis = new Redis({
  host: config.host,
  port: config.port,
  username: config.username, // Redis Cloud requer username (default: 'default')
  password: config.password,
  db: config.db,
  retryStrategy: (times) => {
    // Exponential backoff: 50ms, 100ms, 150ms, ..., max 2000ms
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // Conectar apenas quando necessário
  showFriendlyErrorStack: process.env.NODE_ENV === 'development',
});

// Event listeners para monitoring
redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected:', config.host);
});

redis.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redis.on('reconnecting', () => {
  console.warn('⚠️ Redis reconnecting...');
});

redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

export default redis;
