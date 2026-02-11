/**
 * Infrastructure: RedisEventPublisher
 * Redis Pub/Sub implementation of IEventPublisher.
 *
 * Uses `ioredis` to publish domain events to Redis channels and subscribe to
 * them across process boundaries. Designed as a drop-in replacement for
 * {@link InMemoryEventPublisher} when horizontal scaling is required.
 *
 * **Channel convention:** `auracore:events:{eventType}`
 *
 * Features:
 * - Lazy connection (connects on first publish/subscribe, not at construction)
 * - Retry logic with exponential backoff (3 retries, 100 ms base)
 * - Graceful disconnect via {@link disconnect}
 * - Error isolation: handler failures are logged, never crash the process
 *
 * @module shared/infrastructure/events
 */
import type Redis from 'ioredis';
import { injectable, inject } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { DomainEvent } from '../../domain/events/DomainEvent';
import type { IEventPublisher, EventHandler } from '../../domain/ports/IEventPublisher';
import type { ILogger } from '../logging/ILogger';
import { RedisConnectionManager } from './RedisConnectionManager';

/** Prefix for all AuraCore event channels in Redis. */
const CHANNEL_PREFIX = 'auracore:events:';

/** Maximum number of publish retries before giving up. */
const MAX_RETRIES = 3;

/** Base delay (ms) for exponential backoff between retries. */
const BASE_RETRY_DELAY_MS = 100;

/**
 * Serialised envelope published to Redis channels.
 * Wraps the original DomainEvent with transport metadata.
 */
interface RedisEventEnvelope {
  /** ISO-8601 timestamp of when the event was published to Redis. */
  readonly publishedAt: string;
  /** The domain event payload serialised as JSON-safe object. */
  readonly event: DomainEvent;
}

@injectable()
export class RedisEventPublisher implements IEventPublisher {
  // ── Local handler registry ───────────────────────────────────────────
  /**
   * Maps eventType → Set of local handlers.
   * Maintained in addition to Redis subscriptions so that
   * {@link getHandlers} works without a Redis round-trip.
   */
  private readonly handlers: Map<string, Set<EventHandler>> = new Map();

  /** Tracks Redis channels we have already subscribed to. */
  private readonly subscribedChannels: Set<string> = new Set();

  /** Connection manager (resolved lazily). */
  private connectionManager: RedisConnectionManager | null = null;

  /** Whether the subscriber message listener has been attached. */
  private listenerAttached = false;

  constructor(
    @inject(TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  // ── IEventPublisher implementation ───────────────────────────────────

  /**
   * Publishes a single domain event to the corresponding Redis channel.
   *
   * The event is serialised as JSON and sent to
   * `auracore:events:{eventType}`. If the publish fails, it is retried
   * up to {@link MAX_RETRIES} times with exponential backoff.
   */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const channel = this.buildChannel(event.eventType);
    const envelope: RedisEventEnvelope = {
      publishedAt: new Date().toISOString(),
      event: event as DomainEvent,
    };

    const message = JSON.stringify(envelope);

    await this.publishWithRetry(channel, message, event.eventType);

    this.logger.debug(`Event published to Redis: ${event.eventType}`, {
      component: 'RedisEventPublisher',
      channel,
      eventId: event.eventId,
    });
  }

  /**
   * Publishes multiple domain events sequentially.
   *
   * Order is preserved because domain events often carry causal
   * dependencies (e.g. `OrderCreated` must precede `OrderApproved`).
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Subscribes a local handler to a given event type.
   *
   * On the first subscription for a given `eventType`, the Redis
   * subscriber client is instructed to SUBSCRIBE to the corresponding
   * channel. Subsequent handlers for the same type reuse the existing
   * Redis subscription.
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    // Register locally
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Ensure Redis subscription (fire-and-forget; errors are logged)
    const channel = this.buildChannel(eventType);
    if (!this.subscribedChannels.has(channel)) {
      this.ensureRedisSubscription(channel, eventType).catch((err: unknown) => {
        this.logger.error(
          `Failed to subscribe to Redis channel: ${channel}`,
          err instanceof Error ? err : new Error(String(err)),
          { component: 'RedisEventPublisher' },
        );
      });
    }

    this.logger.debug(`Handler subscribed: ${eventType}`, {
      component: 'RedisEventPublisher',
    });
  }

  /**
   * Removes a handler for the given event type.
   *
   * If no handlers remain for that type, the Redis channel is
   * unsubscribed to free resources.
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (!eventHandlers) return;

    eventHandlers.delete(handler);

    // If no more local handlers, unsubscribe from Redis channel
    if (eventHandlers.size === 0) {
      this.handlers.delete(eventType);
      const channel = this.buildChannel(eventType);
      this.removeRedisSubscription(channel).catch((err: unknown) => {
        this.logger.error(
          `Failed to unsubscribe from Redis channel: ${channel}`,
          err instanceof Error ? err : new Error(String(err)),
          { component: 'RedisEventPublisher' },
        );
      });
    }
  }

  /**
   * Returns all locally registered handlers for the given event type.
   */
  getHandlers(eventType: string): EventHandler[] {
    const eventHandlers = this.handlers.get(eventType);
    return eventHandlers ? Array.from(eventHandlers) : [];
  }

  // ── Extended API ─────────────────────────────────────────────────────

  /**
   * Gracefully disconnects from Redis.
   * Safe to call multiple times or when no connection was ever established.
   */
  async disconnect(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.disconnect();
      this.connectionManager = null;
      this.listenerAttached = false;
      this.subscribedChannels.clear();
    }

    this.logger.info('RedisEventPublisher disconnected', {
      component: 'RedisEventPublisher',
    });
  }

  /**
   * Returns `true` when the underlying Redis connections are healthy.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.connectionManager) return false;
    return this.connectionManager.isHealthy();
  }

  // ── Internals ────────────────────────────────────────────────────────

  /**
   * Resolves the singleton {@link RedisConnectionManager}.
   * Lazy: only called when an actual Redis operation is needed.
   */
  private getConnectionManager(): RedisConnectionManager {
    if (!this.connectionManager) {
      this.connectionManager = RedisConnectionManager.getInstance(this.logger);
    }
    return this.connectionManager;
  }

  /**
   * Builds the Redis channel name for a given event type.
   *
   * @example buildChannel('ORDER_CREATED') // => 'auracore:events:ORDER_CREATED'
   */
  private buildChannel(eventType: string): string {
    return `${CHANNEL_PREFIX}${eventType}`;
  }

  /**
   * Extracts the event type from a Redis channel name.
   *
   * @example extractEventType('auracore:events:ORDER_CREATED') // => 'ORDER_CREATED'
   */
  private extractEventType(channel: string): string {
    return channel.slice(CHANNEL_PREFIX.length);
  }

  /**
   * Publishes a message to a Redis channel with exponential-backoff retry.
   *
   * @param channel  - Redis channel name
   * @param message  - Serialised JSON payload
   * @param eventType - Event type (for logging only)
   */
  private async publishWithRetry(
    channel: string,
    message: string,
    eventType: string,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const publisher = await this.getConnectionManager().getPublisher();
        await publisher.publish(channel, message);
        return; // success
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        this.logger.warn(
          `Redis publish retry ${attempt + 1}/${MAX_RETRIES} for ${eventType} (next in ${delayMs}ms)`,
          { component: 'RedisEventPublisher', error: lastError.message },
        );

        await this.sleep(delayMs);
      }
    }

    // All retries exhausted — log and swallow to avoid crashing the app
    this.logger.error(
      `Redis publish failed after ${MAX_RETRIES} retries for ${eventType}`,
      lastError,
      { component: 'RedisEventPublisher' },
    );
  }

  /**
   * Subscribes the Redis subscriber client to a channel and attaches
   * the shared message listener (once).
   */
  private async ensureRedisSubscription(
    channel: string,
    _eventType: string,
  ): Promise<void> {
    const subscriber = await this.getConnectionManager().getSubscriber();

    // Attach the global message handler exactly once
    if (!this.listenerAttached) {
      subscriber.on('message', (ch: string, rawMessage: string) => {
        this.handleIncomingMessage(ch, rawMessage);
      });
      this.listenerAttached = true;
    }

    await subscriber.subscribe(channel);
    this.subscribedChannels.add(channel);

    this.logger.debug(`Subscribed to Redis channel: ${channel}`, {
      component: 'RedisEventPublisher',
    });
  }

  /**
   * Unsubscribes from a Redis channel and removes it from the tracked set.
   */
  private async removeRedisSubscription(channel: string): Promise<void> {
    if (!this.subscribedChannels.has(channel)) return;

    try {
      const subscriber = await this.getConnectionManager().getSubscriber();
      await subscriber.unsubscribe(channel);
    } catch {
      // Connection may already be closed — that's fine
    }

    this.subscribedChannels.delete(channel);

    this.logger.debug(`Unsubscribed from Redis channel: ${channel}`, {
      component: 'RedisEventPublisher',
    });
  }

  /**
   * Called for every message received on any subscribed Redis channel.
   * Deserialises the envelope and dispatches to local handlers.
   */
  private handleIncomingMessage(channel: string, rawMessage: string): void {
    const eventType = this.extractEventType(channel);
    const eventHandlers = this.handlers.get(eventType);

    if (!eventHandlers || eventHandlers.size === 0) {
      return;
    }

    let envelope: RedisEventEnvelope;
    try {
      envelope = JSON.parse(rawMessage) as RedisEventEnvelope;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to deserialise Redis message on ${channel}`,
        error instanceof Error ? error : new Error(String(error)),
        { component: 'RedisEventPublisher' },
      );
      return;
    }

    // Dispatch to all local handlers in parallel
    const dispatches = Array.from(eventHandlers).map(async (handler) => {
      try {
        await handler(envelope.event);
      } catch (error: unknown) {
        this.logger.error(
          `Handler error for ${eventType}`,
          error instanceof Error ? error : new Error(String(error)),
          { component: 'RedisEventPublisher' },
        );
      }
    });

    // Fire-and-forget — we don't block the Redis message loop
    void Promise.all(dispatches);
  }

  /**
   * Utility: non-blocking sleep.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
