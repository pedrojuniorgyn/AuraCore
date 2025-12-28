import type { DomainEvent } from '../events/DomainEvent';

/**
 * Base para Aggregate Roots
 * Gerencia domain events e garante consistência
 */
export abstract class AggregateRoot<TId> {
  private _domainEvents: DomainEvent[] = [];
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(protected readonly _id: TId, createdAt?: Date) {
    this._createdAt = createdAt ?? new Date();
    this._updatedAt = this._createdAt;
  }

  get id(): TId { return this._id; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get domainEvents(): readonly DomainEvent[] { return [...this._domainEvents]; }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  equals(other: AggregateRoot<TId>): boolean {
    if (!other) return false;
    return this._id === other._id;
  }
}

