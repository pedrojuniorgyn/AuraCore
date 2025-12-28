/**
 * Interface para Domain Events
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Base para implementar Domain Events
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
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

