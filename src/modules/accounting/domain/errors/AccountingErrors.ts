import { DomainError } from '@/shared/domain';

/**
 * Erro: Lançamento não encontrado
 */
export class JournalEntryNotFoundError extends DomainError {
  readonly code = 'JOURNAL_ENTRY_NOT_FOUND';
  constructor(id: string) {
    super(`Journal entry not found: ${id}`);
  }
}

/**
 * Erro: Lançamento já postado (não pode editar)
 */
export class JournalEntryAlreadyPostedError extends DomainError {
  readonly code = 'JOURNAL_ENTRY_ALREADY_POSTED';
  constructor(id: string) {
    super(`Journal entry already posted: ${id}. Cannot modify posted entries.`);
  }
}

/**
 * Erro: Lançamento já estornado
 */
export class JournalEntryAlreadyReversedError extends DomainError {
  readonly code = 'JOURNAL_ENTRY_ALREADY_REVERSED';
  constructor(id: string) {
    super(`Journal entry already reversed: ${id}`);
  }
}

/**
 * Erro: Partidas não balanceadas (Débito ≠ Crédito)
 * INVARIANTE CONTÁBIL PRINCIPAL
 */
export class UnbalancedEntryError extends DomainError {
  readonly code = 'UNBALANCED_ENTRY';
  constructor(totalDebit: number, totalCredit: number) {
    super(
      `Unbalanced entry: total debit (${totalDebit}) does not equal total credit (${totalCredit})`
    );
  }
}

/**
 * Erro: Período contábil fechado
 */
export class PeriodClosedError extends DomainError {
  readonly code = 'PERIOD_CLOSED';
  constructor(period: string) {
    super(`Accounting period is closed: ${period}. Cannot post entries to closed periods.`);
  }
}

/**
 * Erro: Conta sintética (não pode receber lançamentos)
 */
export class SyntheticAccountError extends DomainError {
  readonly code = 'SYNTHETIC_ACCOUNT';
  constructor(accountCode: string) {
    super(
      `Cannot post to synthetic account: ${accountCode}. Only analytical accounts accept entries.`
    );
  }
}

/**
 * Erro: Lançamento sem linhas
 */
export class EmptyJournalEntryError extends DomainError {
  readonly code = 'EMPTY_JOURNAL_ENTRY';
  constructor() {
    super('Journal entry must have at least one debit and one credit line');
  }
}

/**
 * Erro: Linha com valor zero ou negativo
 */
export class InvalidLineAmountError extends DomainError {
  readonly code = 'INVALID_LINE_AMOUNT';
  constructor(amount: number) {
    super(`Line amount must be positive: ${amount}`);
  }
}
