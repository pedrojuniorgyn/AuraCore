/**
 * Base: DomainEvent
 * Interface base para todos os Domain Events
 *
 * @module shared/domain/events
 */

export interface DomainEvent<TPayload = Record<string, unknown>> {
  /** ID único do evento */
  readonly eventId: string;

  /** Tipo do evento (ex: 'GOAL_ACHIEVED', 'ACTION_PLAN_CREATED') */
  readonly eventType: string;

  /** Timestamp de quando o evento ocorreu */
  readonly occurredAt: Date;

  /** ID do aggregate que emitiu o evento */
  readonly aggregateId: string;

  /** Tipo do aggregate (ex: 'StrategicGoal', 'ActionPlan') */
  readonly aggregateType: string;

  /** Dados específicos do evento */
  readonly payload: TPayload;

  /** Metadados opcionais (userId, correlationId, etc) */
  readonly metadata?: EventMetadata;
}

export interface EventMetadata {
  /** ID do usuário que causou o evento */
  userId?: string;

  /** ID da organização */
  organizationId?: number;

  /** ID da filial */
  branchId?: number;

  /** ID de correlação para rastreamento */
  correlationId?: string;

  /** ID de causação (evento que causou este) */
  causationId?: string;
}

/**
 * Helper para criar Domain Events
 */
export function createDomainEvent<TPayload>(
  params: Omit<DomainEvent<TPayload>, 'eventId' | 'occurredAt'>
): DomainEvent<TPayload> {
  return {
    eventId: globalThis.crypto.randomUUID(),
    occurredAt: new Date(),
    ...params,
  };
}

/**
 * Base para implementar Domain Events (classe abstrata)
 * Mantida para retrocompatibilidade com módulos existentes
 * 
 * @deprecated Use createDomainEvent() para novos eventos
 */
export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly eventType: string,
    readonly payload: Record<string, unknown>
  ) {
    this.eventId = globalThis.crypto.randomUUID();
    this.occurredAt = new Date();
  }
}
