/**
 * BillingInvoice - Aggregate Root (F2.3)
 * 
 * Fatura de frete — agrupa CTes de um período/cliente para cobrança.
 */
import { AggregateRoot, Result, Money } from '@/shared/domain';

export type BillingStatus = 'DRAFT' | 'FINALIZED' | 'SENT' | 'CANCELLED';

interface BillingInvoiceProps {
  organizationId: number;
  branchId: number;
  invoiceNumber: string;
  customerId: number;
  periodStart: Date;
  periodEnd: Date;
  grossValue: Money;
  discountValue: Money;
  netValue: Money;
  issueDate: Date;
  dueDate: Date;
  status: BillingStatus;
  totalCtes: number;
  accountsReceivableId: number | null;
  pdfUrl: string | null;
  sentAt: Date | null;
  sentTo: string | null;
  notes: string | null;
  version: number;
}

export class BillingInvoice extends AggregateRoot<string> {
  private _props: BillingInvoiceProps;

  private constructor(id: string, props: BillingInvoiceProps, createdAt?: Date) {
    super(id, createdAt);
    this._props = props;
  }

  // Getters
  get organizationId(): number { return this._props.organizationId; }
  get branchId(): number { return this._props.branchId; }
  get invoiceNumber(): string { return this._props.invoiceNumber; }
  get customerId(): number { return this._props.customerId; }
  get periodStart(): Date { return this._props.periodStart; }
  get periodEnd(): Date { return this._props.periodEnd; }
  get grossValue(): Money { return this._props.grossValue; }
  get discountValue(): Money { return this._props.discountValue; }
  get netValue(): Money { return this._props.netValue; }
  get issueDate(): Date { return this._props.issueDate; }
  get dueDate(): Date { return this._props.dueDate; }
  get status(): BillingStatus { return this._props.status; }
  get totalCtes(): number { return this._props.totalCtes; }
  get accountsReceivableId(): number | null { return this._props.accountsReceivableId; }
  get pdfUrl(): string | null { return this._props.pdfUrl; }
  get sentAt(): Date | null { return this._props.sentAt; }
  get sentTo(): string | null { return this._props.sentTo; }
  get notes(): string | null { return this._props.notes; }
  get version(): number { return this._props.version; }

  static create(props: {
    id: string;
    organizationId: number;
    branchId: number;
    invoiceNumber: string;
    customerId: number;
    periodStart: Date;
    periodEnd: Date;
    grossValue: Money;
    discountValue: Money;
    netValue: Money;
    issueDate: Date;
    dueDate: Date;
    totalCtes: number;
    notes?: string;
  }): Result<BillingInvoice, string> {
    if (!props.organizationId || props.organizationId <= 0) return Result.fail('organizationId required');
    if (!props.branchId || props.branchId <= 0) return Result.fail('branchId required');
    if (!props.customerId || props.customerId <= 0) return Result.fail('customerId required');
    if (props.totalCtes <= 0) return Result.fail('At least 1 CTe required');
    if (props.periodEnd < props.periodStart) return Result.fail('periodEnd must be after periodStart');

    return Result.ok(new BillingInvoice(props.id, {
      ...props,
      status: 'DRAFT',
      accountsReceivableId: null,
      pdfUrl: null,
      sentAt: null,
      sentTo: null,
      notes: props.notes ?? null,
      version: 1,
    }));
  }

  static reconstitute(
    id: string,
    props: BillingInvoiceProps,
    createdAt: Date,
    updatedAt: Date
  ): BillingInvoice {
    const invoice = new BillingInvoice(id, props, createdAt);
    invoice._updatedAt = updatedAt;
    return invoice;
  }

  // Behaviors

  update(changes: {
    dueDate?: Date;
    discountValue?: Money;
    notes?: string;
  }): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot update billing invoice in status ${this._props.status}`);
    }

    if (changes.dueDate) this._props.dueDate = changes.dueDate;
    if (changes.discountValue) {
      this._props.discountValue = changes.discountValue;
      const netResult = this._props.grossValue.subtract(changes.discountValue);
      if (Result.isOk(netResult)) {
        this._props.netValue = netResult.value;
      }
    }
    if (changes.notes !== undefined) this._props.notes = changes.notes;

    this._props.version++;
    this.touch();
    return Result.ok(undefined);
  }

  finalize(receivableId: number): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot finalize billing invoice in status ${this._props.status}`);
    }
    this._props.status = 'FINALIZED';
    this._props.accountsReceivableId = receivableId;
    this._props.version++;
    this.touch();
    return Result.ok(undefined);
  }

  markAsSent(sentTo: string): Result<void, string> {
    if (this._props.status === 'CANCELLED') {
      return Result.fail('Cannot send cancelled invoice');
    }
    this._props.status = 'SENT';
    this._props.sentAt = new Date();
    this._props.sentTo = sentTo;
    this._props.version++;
    this.touch();
    return Result.ok(undefined);
  }

  setPdfUrl(url: string): void {
    this._props.pdfUrl = url;
    this.touch();
  }

  cancel(reason: string): Result<void, string> {
    if (this._props.status === 'CANCELLED') {
      return Result.fail('Already cancelled');
    }
    if (this._props.accountsReceivableId) {
      return Result.fail('Cannot cancel billing with linked receivable. Cancel receivable first.');
    }
    this._props.status = 'CANCELLED';
    this._props.notes = (this._props.notes ? this._props.notes + '\n' : '') + `Cancelado: ${reason}`;
    this._props.version++;
    this.touch();
    return Result.ok(undefined);
  }
}
