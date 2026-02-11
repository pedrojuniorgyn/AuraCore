/**
 * Events Infrastructure Module
 */
export { InMemoryEventPublisher } from './InMemoryEventPublisher';

// Transactional Outbox Pattern
export {
  domainEventOutboxTable,
  type OutboxEventRow,
  type OutboxEventInsert,
  type OutboxEventStatus,
  type IOutboxRepository,
  DrizzleOutboxRepository,
  OutboxProcessor,
  type OutboxProcessorConfig,
  saveToOutbox,
} from './outbox';
export { RedisEventPublisher } from './RedisEventPublisher';
export { RedisConnectionManager } from './RedisConnectionManager';
