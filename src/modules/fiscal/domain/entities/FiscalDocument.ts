import { Result, Money, BaseDomainEvent } from '@/shared/domain';
import { FiscalDocumentItem } from './FiscalDocumentItem';
import { 
  DocumentType, 
  DocumentStatus, 
  canTransitionTo,
  DOCUMENT_MODEL_BY_TYPE 
} from '../value-objects/DocumentType';
import { FiscalKey } from '../value-objects/FiscalKey';
import { TaxRegime } from '../tax/value-objects/TaxRegime';
import { IBSCBSGroup } from '../tax/value-objects/IBSCBSGroup';
import {
  DocumentAlreadyAuthorizedError,
  DocumentAlreadyCancelledError,
  EmptyDocumentError,
  InvalidStatusTransitionError,
  CancellationDeadlineExpiredError,
} from '../errors/FiscalErrors';
import {
  FiscalDocumentSubmittedEvent,
  FiscalDocumentAuthorizedEvent,
  FiscalDocumentCancelledEvent,
} from '../events/FiscalEvents';

/**
 * Props do Documento Fiscal
 */
export interface FiscalDocumentProps {
  id: string;
  organizationId: number;
  branchId: number;
  documentType: DocumentType;
  status: DocumentStatus;
  series: string;
  number: string;
  fiscalKey?: FiscalKey;
  
  // Participantes
  issuerId: string;
  issuerCnpj: string;
  issuerName: string;
  recipientId?: string;
  recipientCnpjCpf?: string;
  recipientName?: string;
  
  // Datas
  issueDate: Date;
  exitDate?: Date;
  
  // Valores totais
  totalProducts: Money;
  totalServices: Money;
  totalDiscount: Money;
  totalFreight: Money;
  totalInsurance: Money;
  totalOtherCosts: Money;
  totalIcms: Money;
  totalIpi: Money;
  totalPis: Money;
  totalCofins: Money;
  totalDocument: Money;
  
  // Reforma Tributária (Week 2)
  taxRegime: TaxRegime;
  totalIbs?: Money;
  totalCbs?: Money;
  totalIs?: Money;
  totalDFeValue?: Money;
  ibsCbsMunicipalityCode?: string;
  ibsCbsGroup?: IBSCBSGroup;
  governmentPurchase?: {
    entityType: number;
    rateReduction: number;
  };
  
  // Itens
  items: FiscalDocumentItem[];
  
  // Observações
  notes?: string;
  internalNotes?: string;
  
  // Controle
  protocolNumber?: string;
  protocolDate?: Date;
  authorizedAt?: Date;
  cancelledAt?: Date;
  cancellationProtocol?: string;
  cancellationReason?: string;
  
  version: number;
}

/**
 * Aggregate Root: Documento Fiscal
 */
export class FiscalDocument {
  private _props: FiscalDocumentProps;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _domainEvents: BaseDomainEvent[] = [];

  private constructor(
    props: FiscalDocumentProps,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._props = props;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // ============ GETTERS ============

  get id(): string { return this._props.id; }
  get organizationId(): number { return this._props.organizationId; }
  get branchId(): number { return this._props.branchId; }
  get documentType(): DocumentType { return this._props.documentType; }
  get status(): DocumentStatus { return this._props.status; }
  get series(): string { return this._props.series; }
  get number(): string { return this._props.number; }
  get fiscalKey(): FiscalKey | undefined { return this._props.fiscalKey; }
  
  get issuerId(): string { return this._props.issuerId; }
  get issuerCnpj(): string { return this._props.issuerCnpj; }
  get issuerName(): string { return this._props.issuerName; }
  get recipientId(): string | undefined { return this._props.recipientId; }
  get recipientCnpjCpf(): string | undefined { return this._props.recipientCnpjCpf; }
  get recipientName(): string | undefined { return this._props.recipientName; }
  
  get issueDate(): Date { return this._props.issueDate; }
  get exitDate(): Date | undefined { return this._props.exitDate; }
  
  get totalProducts(): Money { return this._props.totalProducts; }
  get totalServices(): Money { return this._props.totalServices; }
  get totalDiscount(): Money { return this._props.totalDiscount; }
  get totalFreight(): Money { return this._props.totalFreight; }
  get totalInsurance(): Money { return this._props.totalInsurance; }
  get totalOtherCosts(): Money { return this._props.totalOtherCosts; }
  get totalIcms(): Money { return this._props.totalIcms; }
  get totalIpi(): Money { return this._props.totalIpi; }
  get totalPis(): Money { return this._props.totalPis; }
  get totalCofins(): Money { return this._props.totalCofins; }
  get totalDocument(): Money { return this._props.totalDocument; }
  
  get taxRegime(): TaxRegime { return this._props.taxRegime; }
  get totalIbs(): Money | undefined { return this._props.totalIbs; }
  get totalCbs(): Money | undefined { return this._props.totalCbs; }
  get totalIs(): Money | undefined { return this._props.totalIs; }
  get totalDFeValue(): Money | undefined { return this._props.totalDFeValue; }
  get ibsCbsMunicipalityCode(): string | undefined { return this._props.ibsCbsMunicipalityCode; }
  get ibsCbsGroup(): IBSCBSGroup | undefined { return this._props.ibsCbsGroup; }
  get governmentPurchase(): { entityType: number; rateReduction: number } | undefined { 
    return this._props.governmentPurchase; 
  }
  
  get items(): readonly FiscalDocumentItem[] { return [...this._props.items]; }
  get itemCount(): number { return this._props.items.length; }
  
  get notes(): string | undefined { return this._props.notes; }
  get internalNotes(): string | undefined { return this._props.internalNotes; }
  
  get protocolNumber(): string | undefined { return this._props.protocolNumber; }
  get protocolDate(): Date | undefined { return this._props.protocolDate; }
  get authorizedAt(): Date | undefined { return this._props.authorizedAt; }
  get cancelledAt(): Date | undefined { return this._props.cancelledAt; }
  get cancellationProtocol(): string | undefined { return this._props.cancellationProtocol; }
  get cancellationReason(): string | undefined { return this._props.cancellationReason; }
  
  get version(): number { return this._props.version; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get domainEvents(): readonly BaseDomainEvent[] { return [...this._domainEvents]; }

  // ============ COMPUTED ============

  /**
   * Modelo do documento (55, 57, 58, 65)
   */
  get model(): string {
    return DOCUMENT_MODEL_BY_TYPE[this._props.documentType];
  }

  /**
   * Total de impostos (sistema atual + novo)
   */
  get totalTaxes(): Money {
    let total = this._props.totalIcms.amount +
                this._props.totalIpi.amount +
                this._props.totalPis.amount +
                this._props.totalCofins.amount;
    
    // Adicionar impostos do novo sistema se existirem
    if (this._props.totalIbs) {
      total += this._props.totalIbs.amount;
    }
    if (this._props.totalCbs) {
      total += this._props.totalCbs.amount;
    }
    if (this._props.totalIs) {
      total += this._props.totalIs.amount;
    }
    
    const result = Money.create(total, this._props.totalDocument.currency);
    if (Result.isOk(result)) {
      return result.value;
    }
    const zero = Money.create(0, this._props.totalDocument.currency);
    if (Result.isOk(zero)) {
      return zero.value;
    }
    throw new Error('Failed to create Money for totalTaxes');
  }

  /**
   * Documento pode ser editado?
   */
  get isEditable(): boolean {
    return this._props.status === 'DRAFT';
  }

  /**
   * Documento está autorizado?
   */
  get isAuthrized(): boolean {
    return this._props.status === 'AUTHORIZED';
  }

  /**
   * Documento pode ser cancelado?
   */
  get canBeCancelled(): boolean {
    if (this._props.status !== 'AUTHORIZED') {
      return false;
    }
    
    // Verificar prazo de 24h
    if (!this._props.authorizedAt) {
      return false;
    }
    
    const now = new Date();
    const deadline = new Date(this._props.authorizedAt);
    deadline.setHours(deadline.getHours() + 24);
    
    return now <= deadline;
  }

  // ============ BEHAVIORS ============

  /**
   * Adiciona item ao documento
   */
  addItem(item: FiscalDocumentItem): Result<void, string> {
    if (!this.isEditable) {
      return Result.fail(
        new DocumentAlreadyAuthorizedError(this.id).message
      );
    }

    this._props.items.push(item);
    this.recalculateTotals();
    this._updatedAt = new Date();
    this._props.version++;

    return Result.ok(undefined);
  }

  /**
   * Remove item do documento
   */
  removeItem(itemId: string): Result<void, string> {
    if (!this.isEditable) {
      return Result.fail(
        new DocumentAlreadyAuthorizedError(this.id).message
      );
    }

    const index = this._props.items.findIndex(i => i.id === itemId);
    if (index === -1) {
      return Result.fail(`Item not found: ${itemId}`);
    }

    this._props.items.splice(index, 1);
    
    // Renumerar itens
    this._props.items.forEach((item, idx) => {
      // Items são imutáveis, então criamos props atualizadas
      // Na prática, seria necessário um método updateItemNumber
    });

    this.recalculateTotals();
    this._updatedAt = new Date();
    this._props.version++;

    return Result.ok(undefined);
  }

  /**
   * Envia para autorização (DRAFT → PENDING)
   */
  submit(): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(
        new InvalidStatusTransitionError(this._props.status, 'PENDING').message
      );
    }

    if (this._props.items.length === 0) {
      return Result.fail(new EmptyDocumentError().message);
    }

    this._props.status = 'PENDING';
    this._updatedAt = new Date();
    this._props.version++;

    this._domainEvents.push(
      new FiscalDocumentSubmittedEvent(this.id, {
        documentType: this.documentType,
        number: this.number,
        series: this.series,
      })
    );

    return Result.ok(undefined);
  }

  /**
   * Marca como em processamento na SEFAZ
   */
  process(): Result<void, string> {
    if (this._props.status !== 'PENDING') {
      return Result.fail(
        new InvalidStatusTransitionError(this._props.status, 'PROCESSING').message
      );
    }

    this._props.status = 'PROCESSING';
    this._updatedAt = new Date();
    this._props.version++;

    return Result.ok(undefined);
  }

  /**
   * Marca como autorizado
   */
  authorize(params: {
    fiscalKey: FiscalKey;
    protocolNumber: string;
    protocolDate: Date;
  }): Result<void, string> {
    if (this._props.status !== 'PROCESSING') {
      return Result.fail(
        new InvalidStatusTransitionError(this._props.status, 'AUTHORIZED').message
      );
    }

    this._props.status = 'AUTHORIZED';
    this._props.fiscalKey = params.fiscalKey;
    this._props.protocolNumber = params.protocolNumber;
    this._props.protocolDate = params.protocolDate;
    this._props.authorizedAt = new Date();
    this._updatedAt = new Date();
    this._props.version++;

    this._domainEvents.push(
      new FiscalDocumentAuthorizedEvent(this.id, {
        fiscalKey: params.fiscalKey.value,
        protocolNumber: params.protocolNumber,
      })
    );

    return Result.ok(undefined);
  }

  /**
   * Cancela documento
   */
  cancel(params: {
    reason: string;
    protocolNumber: string;
  }): Result<void, string> {
    if (this._props.status === 'CANCELLED') {
      return Result.fail(
        new DocumentAlreadyCancelledError(this.id).message
      );
    }

    if (this._props.status !== 'AUTHORIZED') {
      return Result.fail(
        new InvalidStatusTransitionError(this._props.status, 'CANCELLED').message
      );
    }

    if (!this.canBeCancelled) {
      const authorizedAt = this._props.authorizedAt;
      if (authorizedAt) {
        return Result.fail(
          new CancellationDeadlineExpiredError(this.id, authorizedAt).message
        );
      }
      return Result.fail('Cannot cancel: document not properly authorized');
    }

    this._props.status = 'CANCELLED';
    this._props.cancelledAt = new Date();
    this._props.cancellationReason = params.reason;
    this._props.cancellationProtocol = params.protocolNumber;
    this._updatedAt = new Date();
    this._props.version++;

    this._domainEvents.push(
      new FiscalDocumentCancelledEvent(this.id, {
        reason: params.reason,
        protocolNumber: params.protocolNumber,
      })
    );

    return Result.ok(undefined);
  }

  /**
   * Recalcula totais com base nos itens
   */
  private recalculateTotals(): void {
    let totalProducts = 0;
    let totalIcms = 0;
    let totalIpi = 0;
    let totalPis = 0;
    let totalCofins = 0;
    let totalDiscount = 0;

    for (const item of this._props.items) {
      totalProducts += item.totalPrice.amount;
      totalIcms += item.icmsValue?.amount ?? 0;
      totalIpi += item.ipiValue?.amount ?? 0;
      totalPis += item.pisValue?.amount ?? 0;
      totalCofins += item.cofinsValue?.amount ?? 0;
      totalDiscount += item.discount?.amount ?? 0;
    }

    const currency = this._props.totalDocument.currency;
    
    const createMoney = (amount: number): Money => {
      const result = Money.create(amount, currency);
      if (Result.isOk(result)) {
        return result.value;
      }
      const zero = Money.create(0, currency);
      if (Result.isOk(zero)) {
        return zero.value;
      }
      throw new Error('Failed to create Money');
    };

    this._props.totalProducts = createMoney(totalProducts);
    this._props.totalIcms = createMoney(totalIcms);
    this._props.totalIpi = createMoney(totalIpi);
    this._props.totalPis = createMoney(totalPis);
    this._props.totalCofins = createMoney(totalCofins);
    this._props.totalDiscount = createMoney(totalDiscount);

    // Total do documento
    const totalDoc = totalProducts - totalDiscount +
                     this._props.totalFreight.amount +
                     this._props.totalInsurance.amount +
                     this._props.totalOtherCosts.amount +
                     totalIpi;
    
    this._props.totalDocument = createMoney(totalDoc);
  }

  /**
   * Limpa eventos
   */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  // ============ FACTORY ============

  /**
   * Cria novo documento fiscal
   */
  static create(props: {
    id: string;
    organizationId: number;
    branchId: number;
    documentType: DocumentType;
    series: string;
    number: string;
    issuerId: string;
    issuerCnpj: string;
    issuerName: string;
    recipientId?: string;
    recipientCnpjCpf?: string;
    recipientName?: string;
    issueDate: Date;
    exitDate?: Date;
    notes?: string;
    internalNotes?: string;
    taxRegime?: TaxRegime;
    ibsCbsMunicipalityCode?: string;
    governmentPurchase?: { entityType: number; rateReduction: number };
  }): Result<FiscalDocument, string> {
    // Validações
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Document ID is required');
    }

    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Organization ID must be positive');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Branch ID must be positive');
    }

    if (!props.series || props.series.trim() === '') {
      return Result.fail('Series is required');
    }

    if (!props.number || props.number.trim() === '') {
      return Result.fail('Document number is required');
    }

    if (!props.issuerCnpj || props.issuerCnpj.trim() === '') {
      return Result.fail('Issuer CNPJ is required');
    }

    const zeroMoney = Money.create(0, 'BRL');
    if (Result.isFail(zeroMoney)) {
      return Result.fail('Failed to initialize money values');
    }

    // Determinar regime tributário baseado na data de emissão
    let taxRegime = props.taxRegime;
    if (!taxRegime) {
      const regimeResult = TaxRegime.fromDate(props.issueDate);
      if (Result.isFail(regimeResult)) {
        return Result.fail(`Failed to determine tax regime: ${regimeResult.error}`);
      }
      taxRegime = regimeResult.value;
    }

    const now = new Date();

    return Result.ok(new FiscalDocument(
      {
        id: props.id,
        organizationId: props.organizationId,
        branchId: props.branchId,
        documentType: props.documentType,
        status: 'DRAFT',
        series: props.series,
        number: props.number,
        issuerId: props.issuerId,
        issuerCnpj: props.issuerCnpj,
        issuerName: props.issuerName,
        recipientId: props.recipientId,
        recipientCnpjCpf: props.recipientCnpjCpf,
        recipientName: props.recipientName,
        issueDate: props.issueDate,
        exitDate: props.exitDate,
        totalProducts: zeroMoney.value,
        totalServices: zeroMoney.value,
        totalDiscount: zeroMoney.value,
        totalFreight: zeroMoney.value,
        totalInsurance: zeroMoney.value,
        totalOtherCosts: zeroMoney.value,
        totalIcms: zeroMoney.value,
        totalIpi: zeroMoney.value,
        totalPis: zeroMoney.value,
        totalCofins: zeroMoney.value,
        totalDocument: zeroMoney.value,
        taxRegime,
        ibsCbsMunicipalityCode: props.ibsCbsMunicipalityCode,
        governmentPurchase: props.governmentPurchase,
        items: [],
        notes: props.notes,
        internalNotes: props.internalNotes,
        version: 1,
      },
      now,
      now
    ));
  }

  /**
   * Reconstitui do banco
   */
  static reconstitute(
    id: string,
    props: Omit<FiscalDocumentProps, 'id'>,
    createdAt: Date,
    updatedAt: Date
  ): FiscalDocument {
    return new FiscalDocument(
      { id, ...props },
      createdAt,
      updatedAt
    );
  }
}
