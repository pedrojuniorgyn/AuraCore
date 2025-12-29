import { DomainError } from '@/shared/domain';

/**
 * Erro: Documento fiscal não encontrado
 */
export class FiscalDocumentNotFoundError extends DomainError {
  readonly code = 'FISCAL_DOCUMENT_NOT_FOUND';
  constructor(id: string) {
    super(`Fiscal document not found: ${id}`);
  }
}

/**
 * Erro: Documento já autorizado (não pode editar)
 */
export class DocumentAlreadyAuthorizedError extends DomainError {
  readonly code = 'DOCUMENT_ALREADY_AUTHORIZED';
  constructor(id: string) {
    super(`Document already authorized: ${id}. Cannot modify authorized documents.`);
  }
}

/**
 * Erro: Documento já cancelado
 */
export class DocumentAlreadyCancelledError extends DomainError {
  readonly code = 'DOCUMENT_ALREADY_CANCELLED';
  constructor(id: string) {
    super(`Document already cancelled: ${id}`);
  }
}

/**
 * Erro: CFOP inválido
 */
export class InvalidCFOPError extends DomainError {
  readonly code = 'INVALID_CFOP';
  constructor(cfop: string, reason: string) {
    super(`Invalid CFOP ${cfop}: ${reason}`);
  }
}

/**
 * Erro: Chave fiscal inválida
 */
export class InvalidFiscalKeyError extends DomainError {
  readonly code = 'INVALID_FISCAL_KEY';
  constructor(key: string, reason: string) {
    super(`Invalid fiscal key ${key}: ${reason}`);
  }
}

/**
 * Erro: Documento sem itens
 */
export class EmptyDocumentError extends DomainError {
  readonly code = 'EMPTY_DOCUMENT';
  constructor() {
    super('Fiscal document must have at least one item');
  }
}

/**
 * Erro: Item com valor inválido
 */
export class InvalidItemValueError extends DomainError {
  readonly code = 'INVALID_ITEM_VALUE';
  constructor(itemNumber: number, reason: string) {
    super(`Invalid value for item ${itemNumber}: ${reason}`);
  }
}

/**
 * Erro: Operação não permitida no status atual
 */
export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition from ${currentStatus} to ${targetStatus}`);
  }
}

/**
 * Erro: NCM inválido
 */
export class InvalidNCMError extends DomainError {
  readonly code = 'INVALID_NCM';
  constructor(ncm: string) {
    super(`Invalid NCM: ${ncm}. NCM must be 8 digits.`);
  }
}

/**
 * Erro: Documento expirado para cancelamento
 */
export class CancellationDeadlineExpiredError extends DomainError {
  readonly code = 'CANCELLATION_DEADLINE_EXPIRED';
  constructor(documentId: string, authorizedAt: Date) {
    const deadline = new Date(authorizedAt);
    deadline.setHours(deadline.getHours() + 24);
    super(`Cancellation deadline expired for document ${documentId}. Was authorized at ${authorizedAt.toISOString()}, deadline was ${deadline.toISOString()}`);
  }
}

