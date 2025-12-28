/**
 * Base para Entidades (sem domain events)
 */
export abstract class Entity<TId> {
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(protected readonly _id: TId, createdAt?: Date) {
    this._createdAt = createdAt ?? new Date();
    this._updatedAt = this._createdAt;
  }

  get id(): TId { return this._id; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  equals(other: Entity<TId>): boolean {
    if (!other) return false;
    return this._id === other._id;
  }
}

