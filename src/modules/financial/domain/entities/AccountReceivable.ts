/**
 * AccountReceivable Entity - Aggregate Root
 * 
 * Representa uma conta a receber no sistema financeiro.
 */
import { AggregateRoot, Result, Money } from '@/shared/domain';
import { ReceivableStatus, type ReceivableStatusType } from '../value-objects/ReceivableStatus';

export type ReceivableOrigin = 'MANUAL' | 'FISCAL_NFE' | 'FISCAL_CTE' | 'SALE' | 'IMPORT';

interface AccountReceivableProps {
  organizationId: number;
  branchId: number;
  customerId: number;
  documentNumber: string;
  description: string;
  
  // Valores
  amount: Money;
  amountReceived: Money;
  
  // Datas
  issueDate: Date;
  dueDate: Date;
  receiveDate: Date | null;
  discountUntil: Date | null;
  discountAmount: Money | null;
  
  // Taxas
  fineRate: number;
  interestRate: number;
  
  // Status
  status: ReceivableStatus;
  origin: ReceivableOrigin;
  
  // Categorização
  categoryId: number | null;
  costCenterId: number | null;
  chartAccountId: number | null;
  bankAccountId: number | null;
  fiscalDocumentId: number | null;
  notes: string | null;
  
  // Controle
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
}

export interface CreateReceivableProps {
  organizationId: number;
  branchId: number;
  customerId: number;
  documentNumber: string;
  description: string;
  amount: number;
  currency?: string;
  issueDate: Date;
  dueDate: Date;
  discountUntil?: Date;
  discountAmount?: number;
  fineRate?: number;
  interestRate?: number;
  origin?: ReceivableOrigin;
  categoryId?: number;
  costCenterId?: number;
  chartAccountId?: number;
  notes?: string;
  createdBy: string;
}

export class AccountReceivable extends AggregateRoot<string> {
  private readonly props: AccountReceivableProps;

  private constructor(id: string, props: AccountReceivableProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters básicos
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get customerId(): number { return this.props.customerId; }
  get documentNumber(): string { return this.props.documentNumber; }
  get description(): string { return this.props.description; }
  get amount(): Money { return this.props.amount; }
  get amountReceived(): Money { return this.props.amountReceived; }
  get issueDate(): Date { return this.props.issueDate; }
  get dueDate(): Date { return this.props.dueDate; }
  get receiveDate(): Date | null { return this.props.receiveDate; }
  get discountUntil(): Date | null { return this.props.discountUntil; }
  get discountAmount(): Money | null { return this.props.discountAmount; }
  get fineRate(): number { return this.props.fineRate; }
  get interestRate(): number { return this.props.interestRate; }
  get status(): ReceivableStatus { return this.props.status; }
  get origin(): ReceivableOrigin { return this.props.origin; }
  get categoryId(): number | null { return this.props.categoryId; }
  get costCenterId(): number | null { return this.props.costCenterId; }
  get chartAccountId(): number | null { return this.props.chartAccountId; }
  get bankAccountId(): number | null { return this.props.bankAccountId; }
  get fiscalDocumentId(): number | null { return this.props.fiscalDocumentId; }
  get notes(): string | null { return this.props.notes; }
  get version(): number { return this.props.version; }
  get createdBy(): string | null { return this.props.createdBy; }
  get updatedBy(): string | null { return this.props.updatedBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  // Getters calculados
  get remainingAmount(): Money {
    const result = this.props.amount.subtract(this.props.amountReceived);
    return Result.isOk(result) ? result.value : this.props.amount;
  }

  get isOverdue(): boolean {
    return this.props.dueDate < new Date() && 
           !this.props.status.isReceived && 
           !this.props.status.isCancelled;
  }

  get isEligibleForDiscount(): boolean {
    if (!this.props.discountUntil || !this.props.discountAmount) return false;
    return new Date() <= this.props.discountUntil;
  }

  /**
   * Factory method: create() COM validações
   */
  static create(props: CreateReceivableProps): Result<AccountReceivable, string> {
    // Validações
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório e deve ser maior que 0');
    }
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId é obrigatório e deve ser maior que 0');
    }
    if (!props.customerId || props.customerId <= 0) {
      return Result.fail('customerId é obrigatório e deve ser maior que 0');
    }
    if (!props.documentNumber?.trim()) {
      return Result.fail('Número do documento é obrigatório');
    }
    if (!props.description?.trim()) {
      return Result.fail('Descrição é obrigatória');
    }
    if (props.amount <= 0) {
      return Result.fail('Valor deve ser maior que zero');
    }
    if (!props.dueDate) {
      return Result.fail('Data de vencimento é obrigatória');
    }
    if (!props.createdBy?.trim()) {
      return Result.fail('createdBy é obrigatório');
    }

    // Validar datas
    const issueDate = props.issueDate || new Date();
    if (props.dueDate < issueDate) {
      return Result.fail('Data de vencimento deve ser igual ou posterior à data de emissão');
    }

    // Parse Money
    const currency = props.currency || 'BRL';
    const amountResult = Money.create(props.amount, currency);
    if (Result.isFail(amountResult)) {
      return Result.fail(`Valor inválido: ${amountResult.error}`);
    }

    const zeroResult = Money.create(0, currency);
    if (Result.isFail(zeroResult)) {
      return Result.fail(`Erro ao criar valor zero: ${zeroResult.error}`);
    }

    let discountMoney: Money | null = null;
    if (props.discountAmount && props.discountAmount > 0) {
      const discountResult = Money.create(props.discountAmount, currency);
      if (Result.isOk(discountResult)) {
        discountMoney = discountResult.value;
      }
    }

    // Gerar ID
    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const receivable = new AccountReceivable(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      customerId: props.customerId,
      documentNumber: props.documentNumber.trim(),
      description: props.description.trim(),
      amount: amountResult.value,
      amountReceived: zeroResult.value,
      issueDate,
      dueDate: props.dueDate,
      receiveDate: null,
      discountUntil: props.discountUntil ?? null,
      discountAmount: discountMoney,
      fineRate: props.fineRate ?? 2.0,
      interestRate: props.interestRate ?? 1.0,
      status: ReceivableStatus.open(),
      origin: props.origin || 'MANUAL',
      categoryId: props.categoryId ?? null,
      costCenterId: props.costCenterId ?? null,
      chartAccountId: props.chartAccountId ?? null,
      bankAccountId: null,
      fiscalDocumentId: null,
      notes: props.notes?.trim() ?? null,
      version: 1,
      createdBy: props.createdBy.trim(),
      updatedBy: null,
      deletedAt: null,
    }, now);

    return Result.ok(receivable);
  }

  /**
   * Factory method: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: AccountReceivableProps & { id: string }, createdAt: Date, updatedAt: Date): AccountReceivable {
    const receivable = new AccountReceivable(props.id, props, createdAt);
    receivable._updatedAt = updatedAt;
    return receivable;
  }

  /**
   * Registra um recebimento
   */
  receivePayment(
    paymentAmount: number,
    bankAccountId: number,
    updatedBy: string
  ): Result<void, string> {
    if (!this.props.status.canReceivePayment) {
      return Result.fail(`Não é possível receber pagamento com status ${this.props.status.value}`);
    }

    const paymentResult = Money.create(paymentAmount, this.props.amount.currency);
    if (Result.isFail(paymentResult)) {
      return Result.fail(`Valor de pagamento inválido: ${paymentResult.error}`);
    }

    // Calcular novo total recebido
    const newReceivedResult = this.props.amountReceived.add(paymentResult.value);
    if (Result.isFail(newReceivedResult)) {
      return Result.fail('Erro ao calcular total recebido');
    }

    // Validar que não excede o valor original
    if (newReceivedResult.value.isGreaterThan(this.props.amount)) {
      return Result.fail(`Valor excede o saldo devedor. Máximo: ${this.remainingAmount.format()}`);
    }

    // Atualizar valores
    (this.props as { amountReceived: Money }).amountReceived = newReceivedResult.value;
    (this.props as { bankAccountId: number | null }).bankAccountId = bankAccountId;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    (this.props as { version: number }).version++;

    // Atualizar status
    if (newReceivedResult.value.equals(this.props.amount) || 
        newReceivedResult.value.isGreaterThan(this.props.amount)) {
      (this.props as { status: ReceivableStatus }).status = ReceivableStatus.received();
      (this.props as { receiveDate: Date | null }).receiveDate = new Date();
    } else if (newReceivedResult.value.isPositive()) {
      (this.props as { status: ReceivableStatus }).status = ReceivableStatus.partial();
    }

    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Cancela a conta a receber
   */
  cancel(reason: string, cancelledBy: string): Result<void, string> {
    if (this.props.status.isReceived) {
      return Result.fail('Não é possível cancelar conta já recebida');
    }
    if (this.props.status.isCancelled) {
      return Result.fail('Conta já está cancelada');
    }

    // Não pode cancelar se já tem recebimentos parciais
    if (this.props.amountReceived.isPositive()) {
      return Result.fail(`Não é possível cancelar com recebimentos parciais. Valor recebido: ${this.props.amountReceived.format()}`);
    }

    (this.props as { status: ReceivableStatus }).status = ReceivableStatus.cancelled();
    (this.props as { notes: string | null }).notes = `[CANCELADO] ${reason}`;
    (this.props as { updatedBy: string | null }).updatedBy = cancelledBy;
    (this.props as { version: number }).version++;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Atualiza dados editáveis
   */
  update(data: {
    description?: string;
    dueDate?: Date;
    categoryId?: number;
    costCenterId?: number;
    chartAccountId?: number;
    notes?: string;
  }, updatedBy: string): Result<void, string> {
    if (this.props.status.isTerminal) {
      return Result.fail(`Não é possível editar conta com status ${this.props.status.value}`);
    }

    if (data.description !== undefined) {
      if (!data.description.trim()) {
        return Result.fail('Descrição não pode ser vazia');
      }
      (this.props as { description: string }).description = data.description.trim();
    }

    if (data.dueDate !== undefined) {
      if (data.dueDate < this.props.issueDate) {
        return Result.fail('Data de vencimento deve ser igual ou posterior à data de emissão');
      }
      (this.props as { dueDate: Date }).dueDate = data.dueDate;
    }

    if (data.categoryId !== undefined) {
      (this.props as { categoryId: number | null }).categoryId = data.categoryId;
    }

    if (data.costCenterId !== undefined) {
      (this.props as { costCenterId: number | null }).costCenterId = data.costCenterId;
    }

    if (data.chartAccountId !== undefined) {
      (this.props as { chartAccountId: number | null }).chartAccountId = data.chartAccountId;
    }

    if (data.notes !== undefined) {
      (this.props as { notes: string | null }).notes = data.notes.trim() || null;
    }

    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    (this.props as { version: number }).version++;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Marca como em processamento
   */
  markAsProcessing(updatedBy: string): Result<void, string> {
    if (!this.props.status.canTransitionTo('PROCESSING')) {
      return Result.fail(`Não é possível marcar como processando a partir de ${this.props.status.value}`);
    }

    (this.props as { status: ReceivableStatus }).status = ReceivableStatus.processing();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    (this.props as { version: number }).version++;
    this.touch();

    return Result.ok(undefined);
  }
}
