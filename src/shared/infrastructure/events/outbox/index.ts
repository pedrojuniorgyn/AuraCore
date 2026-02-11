/**
 * Transactional Outbox Pattern
 *
 * Garante entrega confiável de Domain Events persistindo-os na mesma
 * transação que a mutação de estado e publicando assincronamente.
 *
 * Componentes:
 * - outbox.schema         — Tabela domain_event_outbox (Drizzle)
 * - IOutboxRepository     — Interface do repositório
 * - DrizzleOutboxRepository — Implementação Drizzle/SQL Server
 * - OutboxProcessor       — Background job (polling + publish)
 * - saveToOutbox          — Helper para inserir na mesma transação
 *
 * @module shared/infrastructure/events/outbox
 */

// Schema
export {
  domainEventOutboxTable,
  type OutboxEventRow,
  type OutboxEventInsert,
  type OutboxEventStatus,
} from './outbox.schema';

// Repository
export type { IOutboxRepository } from './IOutboxRepository';
export { DrizzleOutboxRepository } from './DrizzleOutboxRepository';

// Processor
export { OutboxProcessor, type OutboxProcessorConfig } from './OutboxProcessor';

// Helper
export { saveToOutbox } from './saveToOutbox';
