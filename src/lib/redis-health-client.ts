/**
 * Redis Health Check Client - Singleton
 *
 * Reuses a single connection for health checks instead of creating
 * a new connection on every 10-30s health probe (LC-PR88-004).
 *
 * Uses REDIS_URL. Do not use for Pub/Sub or cache - those have their own clients.
 *
 * @module lib/redis-health-client
 */
import type Redis from 'ioredis';

let healthClient: Redis | null = null;

/**
 * Returns the singleton Redis client for health checks.
 * Creates lazily on first use. Never disconnects (reused across health probes).
 */
export async function getRedisHealthClient(): Promise<Redis | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (healthClient && healthClient.status === 'ready') {
    return healthClient;
  }

  if (healthClient) {
    // Reconnecting
    try {
      await healthClient.ping();
      return healthClient;
    } catch {
      healthClient.disconnect();
      healthClient = null;
    }
  }

  const { default: Redis } = await import('ioredis');
  healthClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    connectTimeout: 5000,
  });

  healthClient.on('error', () => {
    // Ignore - health check will report down
  });

  return healthClient;
}
