/**
 * Hierarquia de erros de domínio
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BusinessRuleViolationError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  constructor(message: string, readonly ruleName?: string) {
    super(message);
  }
}

export class EntityNotFoundError extends DomainError {
  readonly code = 'ENTITY_NOT_FOUND';
  constructor(readonly entityType: string, readonly entityId: string) {
    super(`${entityType} with id ${entityId} not found`);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string, readonly field?: string) {
    super(message);
  }
}

