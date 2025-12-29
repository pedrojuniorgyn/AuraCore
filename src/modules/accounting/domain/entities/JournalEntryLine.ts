import { Result, Money } from '@/shared/domain';
import { InvalidLineAmountError } from '../errors/AccountingErrors';

/**
 * Tipo de lançamento: Débito ou Crédito
 */
export type EntryType = 'DEBIT' | 'CREDIT';

/**
 * Props para criação de linha
 */
export interface JournalEntryLineProps {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountCode: string;
  entryType: EntryType;
  amount: Money;
  description?: string;
  costCenterId?: number;
  businessPartnerId?: number;
}

/**
 * Entity: Linha de Lançamento Contábil
 * 
 * Representa uma linha de débito ou crédito em um lançamento.
 * Pertence ao Aggregate Root JournalEntry.
 */
export class JournalEntryLine {
  private readonly _props: JournalEntryLineProps;
  private readonly _createdAt: Date;

  private constructor(props: JournalEntryLineProps, createdAt: Date) {
    this._props = props;
    this._createdAt = createdAt;
  }

  // Getters
  get id(): string {
    return this._props.id;
  }

  get journalEntryId(): string {
    return this._props.journalEntryId;
  }

  get accountId(): string {
    return this._props.accountId;
  }

  get accountCode(): string {
    return this._props.accountCode;
  }

  get entryType(): EntryType {
    return this._props.entryType;
  }

  get amount(): Money {
    return this._props.amount;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get costCenterId(): number | undefined {
    return this._props.costCenterId;
  }

  get businessPartnerId(): number | undefined {
    return this._props.businessPartnerId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Helpers para tipo de lançamento
   */
  get isDebit(): boolean {
    return this._props.entryType === 'DEBIT';
  }

  get isCredit(): boolean {
    return this._props.entryType === 'CREDIT';
  }

  /**
   * Retorna valor com sinal (+ para débito, - para crédito)
   * Convenção: Ativo/Despesa = Débito+, Passivo/Receita = Crédito+
   */
  get signedAmount(): number {
    return this.isDebit ? this._props.amount.amount : -this._props.amount.amount;
  }

  /**
   * Factory method
   */
  static create(props: {
    id: string;
    journalEntryId: string;
    accountId: string;
    accountCode: string;
    entryType: EntryType;
    amount: Money;
    description?: string;
    costCenterId?: number;
    businessPartnerId?: number;
  }): Result<JournalEntryLine, string> {
    // Validações
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Line ID is required');
    }

    if (!props.journalEntryId || props.journalEntryId.trim() === '') {
      return Result.fail('Journal entry ID is required');
    }

    if (!props.accountId || props.accountId.trim() === '') {
      return Result.fail('Account ID is required');
    }

    if (!props.accountCode || props.accountCode.trim() === '') {
      return Result.fail('Account code is required');
    }

    if (props.amount.amount <= 0) {
      return Result.fail(new InvalidLineAmountError(props.amount.amount).message);
    }

    return Result.ok(new JournalEntryLine(
      {
        id: props.id,
        journalEntryId: props.journalEntryId,
        accountId: props.accountId,
        accountCode: props.accountCode,
        entryType: props.entryType,
        amount: props.amount,
        description: props.description,
        costCenterId: props.costCenterId,
        businessPartnerId: props.businessPartnerId,
      },
      new Date()
    ));
  }

  /**
   * Reconstitui do banco
   */
  static reconstitute(
    props: JournalEntryLineProps,
    createdAt: Date
  ): JournalEntryLine {
    return new JournalEntryLine(props, createdAt);
  }

  /**
   * Cria linha inversa (para estorno)
   */
  createReverseLine(newId: string, newJournalEntryId: string): JournalEntryLine {
    return new JournalEntryLine(
      {
        ...this._props,
        id: newId,
        journalEntryId: newJournalEntryId,
        entryType: this.isDebit ? 'CREDIT' : 'DEBIT', // Inverte
        description: `Reversal: ${this._props.description ?? ''}`.trim(),
      },
      new Date()
    );
  }
}

