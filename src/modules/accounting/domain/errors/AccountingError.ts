/**
 * Accounting Error
 * 
 * Erro de domínio para operações contábeis
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

export class AccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountingError';
    Object.setPrototypeOf(this, AccountingError.prototype);
  }
}

export class SyntheticAccountError extends AccountingError {
  constructor(
    public readonly accountCode: string,
    public readonly accountName: string,
    public readonly analyticalAccounts: Array<{ code: string; name: string }>
  ) {
    const analyticalList = analyticalAccounts
      .map(a => `• ${a.code} - ${a.name}`)
      .join('\n');

    super(
      `❌ Conta "${accountCode} - ${accountName}" é SINTÉTICA.\n\n` +
      `Lançamentos devem ser feitos em contas ANALÍTICAS:\n${analyticalList}\n\n` +
      `Regra: NBC TG 26 - Contas sintéticas apenas consolidam.`
    );
    this.name = 'SyntheticAccountError';
  }
}

export class DocumentAlreadyPostedError extends AccountingError {
  constructor(fiscalDocumentId: bigint) {
    super(`Documento fiscal ${fiscalDocumentId} já possui lançamento contábil`);
    this.name = 'DocumentAlreadyPostedError';
  }
}

export class JournalEntryAlreadyReversedError extends AccountingError {
  constructor(journalEntryId: bigint) {
    super(`Lançamento contábil ${journalEntryId} já foi revertido`);
    this.name = 'JournalEntryAlreadyReversedError';
  }
}

export class UnbalancedEntryError extends AccountingError {
  constructor(totalDebit: number, totalCredit: number) {
    super(
      `Lançamento desbalanceado: Débitos=${totalDebit.toFixed(2)}, Créditos=${totalCredit.toFixed(2)}`
    );
    this.name = 'UnbalancedEntryError';
  }
}

