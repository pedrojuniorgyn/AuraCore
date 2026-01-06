// Types
export { Result } from './types/Result';

// Entities
export { AggregateRoot } from './entities/AggregateRoot';
export { Entity } from './entities/Entity';
export { ValueObject } from './entities/ValueObject';

// Value Objects
export { Money, CNPJ, CPF, Email, DateRange, TaxRate } from './value-objects';

// Events
export type { DomainEvent } from './events/DomainEvent';
export { BaseDomainEvent } from './events/DomainEvent';

// Errors
export { 
  DomainError, 
  BusinessRuleViolationError, 
  EntityNotFoundError,
  ValidationError 
} from './errors/DomainError';

// Ports
export type { IUuidGenerator } from './ports/IUuidGenerator';

