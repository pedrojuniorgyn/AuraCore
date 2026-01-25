import { AggregateRoot, Result, Money, BaseDomainEvent } from '@/shared/domain';
import { JournalEntryLine, EntryType } from './JournalEntryLine';
import { AccountingPeriod } from '../value-objects/AccountingPeriod';
import {
  JournalEntryAlreadyPostedError,
  JournalEntryAlreadyReversedError,
  UnbalancedEntryError,
  EmptyJournalEntryError,
} from '../errors/AccountingErrors';

/**
 * Status do lançamento contábil
 */
export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

/**
 * Origem do lançamento
 */
export type JournalEntrySource = 
  | 'MANUAL'           // Lançamento manual
  | 'PAYMENT'          // Pagamento (Financial)
  | 'RECEIPT'          // Recebimento (Financial)
  | 'FISCAL_DOC'       // Documento fiscal
  | 'DEPRECIATION'     // Depreciação
  | 'PROVISION'        // Provisão
  | 'CLOSING'          // Fechamento
  | 'ADJUSTMENT'       // Ajuste
  | 'REVERSAL';        // Estorno

/**
 * Props do Aggregate
 */
export interface JournalEntryProps {
  id: string;
  organizationId: number;
  branchId: number;
  entryNumber: string;
  entryDate: Date;
  period: AccountingPeriod;
  description: string;
  source: JournalEntrySource;
  sourceId?: string;        // ID do documento origem (paymentId, fiscalDocId, etc)
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
  reversedById?: string;    // ID do lançamento que estornou este
  reversesId?: string;      // ID do lançamento que este estorna
  postedAt?: Date;
  postedBy?: string;
  notes?: string;
  version: number;
}

/**
 * Aggregate Root: Lançamento Contábil
 * 
 * INVARIANTES:
 * 1. Σ Débitos = Σ Créditos (partidas dobradas)
 * 2. Deve ter pelo menos 1 débito e 1 crédito
 * 3. POSTED não pode ser editado
 * 4. REVERSED não pode ser modificado
 * 5. Estorno gera lançamento inverso
 */
export class JournalEntry extends AggregateRoot<string> {
  private _props: JournalEntryProps;

  private constructor(id: string, props: Omit<JournalEntryProps, 'id'>, createdAt?: Date) {
    super(id, createdAt);
    this._props = { id, ...props };
  }

  // ============ GETTERS ============

  get organizationId(): number {
    return this._props.organizationId;
  }

  get branchId(): number {
    return this._props.branchId;
  }

  get entryNumber(): string {
    return this._props.entryNumber;
  }

  get entryDate(): Date {
    return this._props.entryDate;
  }

  get period(): AccountingPeriod {
    return this._props.period;
  }

  get description(): string {
    return this._props.description;
  }

  get source(): JournalEntrySource {
    return this._props.source;
  }

  get sourceId(): string | undefined {
    return this._props.sourceId;
  }

  get status(): JournalEntryStatus {
    return this._props.status;
  }

  get lines(): readonly JournalEntryLine[] {
    return [...this._props.lines];
  }

  get reversedById(): string | undefined {
    return this._props.reversedById;
  }

  get reversesId(): string | undefined {
    return this._props.reversesId;
  }

  get postedAt(): Date | undefined {
    return this._props.postedAt;
  }

  get postedBy(): string | undefined {
    return this._props.postedBy;
  }

  get notes(): string | undefined {
    return this._props.notes;
  }

  get version(): number {
    return this._props.version;
  }

  // ============ COMPUTED GETTERS ============

  /**
   * Total de débitos
   */
  get totalDebit(): Money {
    const total = this._props.lines
      .filter(l => l.isDebit)
      .reduce((sum, l) => sum + l.amount.amount, 0);
    
    const result = Money.create(total);
    if (Result.isOk(result)) {
      return result.value;
    }
    
    // Fallback seguro: Money.create(0) sempre sucede para valores finitos >= 0
    const zeroResult = Money.create(0);
    if (Result.isOk(zeroResult)) {
      return zeroResult.value;
    }
    
    // Este caso nunca deveria acontecer (Money.create(0) com BRL sempre sucede)
    return Result.fail('Failed to create Money with value 0 - this should never happen');
  }

  /**
   * Total de créditos
   * 
   * ⚠️ S1.3: Convertido de getter para método que retorna Result (getters não devem fazer throw)
   */
  getTotalCredit(): Result<Money, string> {
    const total = this._props.lines
      .filter(l => l.isCredit)
      .reduce((sum, l) => sum + l.amount.amount, 0);
    
    const result = Money.create(total);
    if (Result.isOk(result)) {
      return Result.ok(result.value);
    }
    
    // Fallback seguro: Money.create(0) sempre sucede para valores finitos >= 0
    const zeroResult = Money.create(0);
    if (Result.isOk(zeroResult)) {
      return Result.ok(zeroResult.value);
    }
    
    // Este caso nunca deveria acontecer (Money.create(0) com BRL sempre sucede)
    return Result.fail('Failed to create Money with value 0 - this should never happen');
  }

  /**
   * Verifica se está balanceado (Débito = Crédito)
   */
  get isBalanced(): boolean {
    return Math.abs(this.totalDebit.amount - this.totalCredit.amount) < 0.01;
  }

  /**
   * Quantidade de linhas
   */
  get lineCount(): number {
    return this._props.lines.length;
  }

  /**
   * Quantidade de débitos
   */
  get debitCount(): number {
    return this._props.lines.filter(l => l.isDebit).length;
  }

  /**
   * Quantidade de créditos
   */
  get creditCount(): number {
    return this._props.lines.filter(l => l.isCredit).length;
  }

  // ============ BEHAVIORS ============

  /**
   * Adiciona linha ao lançamento
   * Só permitido em DRAFT
   */
  addLine(line: JournalEntryLine): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(
        new JournalEntryAlreadyPostedError(this.id).message
      );
    }

    this._props.lines.push(line);
    this.touch();
    this._props.version++;

    return Result.ok(undefined);
  }

  /**
   * Remove linha do lançamento
   * Só permitido em DRAFT
   */
  removeLine(lineId: string): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(
        new JournalEntryAlreadyPostedError(this.id).message
      );
    }

    const index = this._props.lines.findIndex(l => l.id === lineId);
    if (index === -1) {
      return Result.fail(`Line not found: ${lineId}`);
    }

    this._props.lines.splice(index, 1);
    this.touch();
    this._props.version++;

    return Result.ok(undefined);
  }

  /**
   * Posta o lançamento (DRAFT → POSTED)
   * 
   * Validações:
   * - Deve estar DRAFT
   * - Deve estar balanceado
   * - Deve ter pelo menos 1 débito e 1 crédito
   */
  post(userId: string): Result<void, string> {
    // Já postado?
    if (this._props.status === 'POSTED') {
      return Result.fail(
        new JournalEntryAlreadyPostedError(this.id).message
      );
    }

    // Já estornado?
    if (this._props.status === 'REVERSED') {
      return Result.fail(
        new JournalEntryAlreadyReversedError(this.id).message
      );
    }

    // Tem linhas?
    if (this._props.lines.length === 0) {
      return Result.fail(new EmptyJournalEntryError().message);
    }

    // Tem débito e crédito?
    if (this.debitCount === 0 || this.creditCount === 0) {
      return Result.fail(
        'Journal entry must have at least one debit and one credit line'
      );
    }

    // Está balanceado? (INVARIANTE PRINCIPAL)
    if (!this.isBalanced) {
      return Result.fail(
        new UnbalancedEntryError(
          this.totalDebit.amount,
          this.totalCredit.amount
        ).message
      );
    }

    // Postar
    this._props.status = 'POSTED';
    this._props.postedAt = new Date();
    this._props.postedBy = userId;
    this.touch();
    this._props.version++;

    // Emitir evento
    this.addDomainEvent({
      eventId: crypto.randomUUID(),
      eventType: 'JournalEntryPosted',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'JournalEntry',
      payload: {
        entryNumber: this.entryNumber,
        totalDebit: this.totalDebit.amount,
        totalCredit: this.totalCredit.amount,
        lineCount: this.lineCount,
        postedBy: userId,
      },
    });

    return Result.ok(undefined);
  }

  /**
   * Marca como estornado
   * Chamado quando outro lançamento estorna este
   */
  markAsReversed(reversalEntryId: string): Result<void, string> {
    if (this._props.status !== 'POSTED') {
      return Result.fail('Only POSTED entries can be reversed');
    }

    if (this._props.reversedById) {
      return Result.fail(
        new JournalEntryAlreadyReversedError(this.id).message
      );
    }

    this._props.status = 'REVERSED';
    this._props.reversedById = reversalEntryId;
    this.touch();
    this._props.version++;

    // Emitir evento
    this.addDomainEvent({
      eventId: crypto.randomUUID(),
      eventType: 'JournalEntryReversed',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'JournalEntry',
      payload: {
        entryNumber: this.entryNumber,
        reversedById: reversalEntryId,
      },
    });

    return Result.ok(undefined);
  }

  // ============ FACTORY METHODS ============

  /**
   * Cria novo lançamento contábil
   */
  static create(props: {
    id: string;
    organizationId: number;
    branchId: number;
    entryNumber: string;
    entryDate: Date;
    description: string;
    source: JournalEntrySource;
    sourceId?: string;
    notes?: string;
  }): Result<JournalEntry, string> {
    // Validações
    if (!props.id || props.id.trim() === '') {
      return Result.fail('ID is required');
    }

    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Organization ID must be positive');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Branch ID must be positive');
    }

    if (!props.entryNumber || props.entryNumber.trim() === '') {
      return Result.fail('Entry number is required');
    }

    if (!props.description || props.description.trim() === '') {
      return Result.fail('Description is required');
    }

    // Criar período a partir da data
    const periodResult = AccountingPeriod.fromDate(props.entryDate);
    if (Result.isFail(periodResult)) {
      return Result.fail(`Invalid entry date: ${periodResult.error}`);
    }

    return Result.ok(new JournalEntry(
      props.id,
      {
        organizationId: props.organizationId,
        branchId: props.branchId,
        entryNumber: props.entryNumber,
        entryDate: props.entryDate,
        period: periodResult.value,
        description: props.description,
        source: props.source,
        sourceId: props.sourceId,
        status: 'DRAFT',
        lines: [],
        notes: props.notes,
        version: 1,
      }
    ));
  }

  /**
   * Cria lançamento de estorno
   */
  static createReversal(
    original: JournalEntry,
    props: {
      id: string;
      entryNumber: string;
      description: string;
    }
  ): Result<JournalEntry, string> {
    if (original.status !== 'POSTED') {
      return Result.fail('Only POSTED entries can be reversed');
    }

    if (original.reversedById) {
      return Result.fail(
        new JournalEntryAlreadyReversedError(original.id).message
      );
    }

    const now = new Date();
    const periodResult = AccountingPeriod.fromDate(now);
    if (Result.isFail(periodResult)) {
      return Result.fail(`Invalid reversal date: ${periodResult.error}`);
    }

    // Criar lançamento de estorno
    const reversal = new JournalEntry(
      props.id,
      {
        organizationId: original.organizationId,
        branchId: original.branchId,
        entryNumber: props.entryNumber,
        entryDate: now,
        period: periodResult.value,
        description: props.description,
        source: 'REVERSAL',
        sourceId: original.id,
        status: 'DRAFT',
        lines: [],
        reversesId: original.id,
        notes: `Reversal of entry ${original.entryNumber}`,
        version: 1,
      }
    );

    // Criar linhas invertidas
    for (const line of original.lines) {
      const reverseLine = line.createReverseLine(
        crypto.randomUUID(),
        props.id
      );
      reversal._props.lines.push(reverseLine);
    }

    return Result.ok(reversal);
  }

  /**
   * Reconstitui do banco
   */
  static reconstitute(
    id: string,
    props: Omit<JournalEntryProps, 'id'>,
    createdAt: Date
  ): JournalEntry {
    const entry = new JournalEntry(id, props, createdAt);
    return entry;
  }
}

