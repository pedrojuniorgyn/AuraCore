/**
 * Infrastructure: RedisConnectionManager
 * Singleton manager for Redis connections (Pub/Sub).
 *
 * Provides lazy connection, health checking, and graceful shutdown.
 * Used by RedisEventPublisher to share a single Redis connection pool.
 *
 * @module shared/infrastructure/events
 */
import Redis from 'ioredis';
import type { ILogger } from '../logging/ILogger';

/** Redis connection configuration resolved from environment. */
interface RedisConnectionConfig {
  /** Full Redis URL (e.g. redis://localhost:6379) */
  readonly url: string;
  /** Maximum number of reconnect retries before giving up. */
  readonly maxRetriesPerRequest: number;
  /** Whether to enable TLS (derived from rediss:// scheme). */
  readonly tls: boolean;
}

/**
 * Singleton manager for Redis connections.
 *
 * - **Lazy connection**: No connection is established until the first call to
 *   {@link getPublisher} or {@link getSubscriber}.
 * - **Health check**: {@link isHealthy} pings Redis and returns status.
 * - **Graceful shutdown**: {@link disconnect} closes both publisher and
 *   subscriber connections cleanly.
 *
 * The manager creates TWO Redis clients because Redis Pub/Sub requires a
 * dedicated connection for subscribing — it cannot be shared with regular
 * commands.
 */
export class RedisConnectionManager {
  // ── Singleton ────────────────────────────────────────────────────────
  private static instance: RedisConnectionManager | null = null;

  /**
   * Returns the singleton instance of RedisConnectionManager.
   * Creates the instance on first call (lazy init).
   */
  static getInstance(logger: ILogger): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager(logger);
    }
    return RedisConnectionManager.instance;
  }

  /**
   * Resets the singleton instance.
   * **Only use in tests** to ensure a clean state between runs.
   */
  static resetInstance(): void {
    RedisConnectionManager.instance = null;
  }

  // ── Instance state ───────────────────────────────────────────────────
  private publisherClient: Redis | null = null;
  private subscriberClient: Redis | null = null;
  private readonly config: RedisConnectionConfig;
  private isShuttingDown = false;

  private constructor(private readonly logger: ILogger) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.config = {
      url,
      maxRetriesPerRequest: 3,
      tls: url.startsWith('rediss://'),
    };
  }

  // ── Public API ───────────────────────────────────────────────────────

  /**
   * Returns the Redis client used for PUBLISH commands.
   * Creates the connection lazily on first call.
   */
  async getPublisher(): Promise<Redis> {
    if (this.isShuttingDown) {
      throw new Error('RedisConnectionManager is shutting down');
    }

    if (!this.publisherClient) {
      this.publisherClient = this.createClient('publisher');
      await this.waitForReady(this.publisherClient, 'publisher');
    }

    return this.publisherClient;
  }

  /**
   * Returns the Redis client used for SUBSCRIBE commands.
   * Creates the connection lazily on first call.
   *
   * **Important:** This client is in subscriber mode and CANNOT be used for
   * regular Redis commands.
   */
  async getSubscriber(): Promise<Redis> {
    if (this.isShuttingDown) {
      throw new Error('RedisConnectionManager is shutting down');
    }

    if (!this.subscriberClient) {
      this.subscriberClient = this.createClient('subscriber');
      await this.waitForReady(this.subscriberClient, 'subscriber');
    }

    return this.subscriberClient;
  }

  /**
   * Checks whether the publisher connection is alive by sending a PING.
   *
   * @returns `true` if Redis responds with PONG, `false` otherwise.
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.publisherClient) {
        return false;
      }
      const pong = await this.publisherClient.ping();
      return pong === 'PONG';
    } catch (error: unknown) {
      this.logger.error(
        'Redis health check failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
    }
  }

  /**
   * Gracefully disconnects both publisher and subscriber clients.
   * Safe to call multiple times.
   */
  async disconnect(): Promise<void> {
    this.isShuttingDown = true;

    const closeClient = async (client: Redis | null, name: string): Promise<void> => {
      if (!client) return;
      try {
        await client.quit();
        this.logger.info(`Redis ${name} disconnected gracefully`, {
          component: 'RedisConnectionManager',
        });
      } catch (error: unknown) {
        this.logger.warn(`Redis ${name} forced disconnect`, {
          component: 'RedisConnectionManager',
          error: error instanceof Error ? error.message : String(error),
        });
        client.disconnect();
      }
    };

    await Promise.all([
      closeClient(this.subscriberClient, 'subscriber'),
      closeClient(this.publisherClient, 'publisher'),
    ]);

    this.subscriberClient = null;
    this.publisherClient = null;
    this.isShuttingDown = false;
  }

  /**
   * Returns `true` when both connections have been established at least once.
   */
  get isConnected(): boolean {
    const pubOk = this.publisherClient?.status === 'ready';
    const subOk = this.subscriberClient?.status === 'ready';
    return Boolean(pubOk && subOk);
  }

  // ── Internals ────────────────────────────────────────────────────────

  /**
   * Creates a new ioredis client with shared configuration and event
   * listeners for logging.
   */
  private createClient(role: 'publisher' | 'subscriber'): Redis {
    const client = new Redis(this.config.url, {
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error(`Redis ${role}: max reconnect attempts reached`, undefined, {
            component: 'RedisConnectionManager',
          });
          return null; // Stop retrying
        }
        const delay = Math.min(times * 200, 5_000);
        this.logger.warn(`Redis ${role}: reconnecting in ${delay}ms (attempt ${times})`, {
          component: 'RedisConnectionManager',
        });
        return delay;
      },
      lazyConnect: true,
      ...(this.config.tls ? { tls: {} } : {}),
    });

    client.on('error', (err: Error) => {
      this.logger.error(`Redis ${role} error`, err, {
        component: 'RedisConnectionManager',
      });
    });

    client.on('connect', () => {
      this.logger.info(`Redis ${role} connected`, {
        component: 'RedisConnectionManager',
        url: this.config.url.replace(/\/\/.*@/, '//<credentials>@'),
      });
    });

    client.on('close', () => {
      this.logger.debug(`Redis ${role} connection closed`, {
        component: 'RedisConnectionManager',
      });
    });

    return client;
  }

  /**
   * Explicitly calls `connect()` on a lazily-created client and waits for
   * the `ready` event.
   */
  private async waitForReady(client: Redis, role: string): Promise<void> {
    try {
      await client.connect();
      this.logger.debug(`Redis ${role} ready`, { component: 'RedisConnectionManager' });
    } catch (error: unknown) {
      this.logger.error(
        `Redis ${role} failed to connect`,
        error instanceof Error ? error : new Error(String(error)),
        { component: 'RedisConnectionManager' },
      );
      throw error;
    }
  }
}
