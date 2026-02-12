/**
 * Billing Input Ports (ARCH-010) — F2.3
 */
import { Result } from '@/shared/domain';

// ===== Create =====
export interface CreateBillingInvoiceInput {
  customerId: number;
  periodStart: string;
  periodEnd: string;
  cteIds: number[];
  dueDate: string;
  notes?: string;
}

export interface CreateBillingInvoiceOutput {
  invoiceId: string;
  invoiceNumber: string;
  totalCtes: number;
  grossValue: number;
  netValue: number;
}

export interface ICreateBillingInvoice {
  execute(
    input: CreateBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreateBillingInvoiceOutput, string>>;
}

// ===== Update =====
export interface UpdateBillingInvoiceInput {
  invoiceId: string;
  dueDate?: string;
  discountValue?: number;
  notes?: string;
}

export interface UpdateBillingInvoiceOutput {
  id: string;
  updatedFields: string[];
}

export interface IUpdateBillingInvoice {
  execute(
    input: UpdateBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<UpdateBillingInvoiceOutput, string>>;
}

// ===== Cancel =====
export interface CancelBillingInvoiceInput {
  invoiceId: string;
  reason: string;
}

export interface CancelBillingInvoiceOutput {
  id: string;
  status: string;
}

export interface ICancelBillingInvoice {
  execute(
    input: CancelBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CancelBillingInvoiceOutput, string>>;
}

// ===== List =====
export interface ListBillingInvoicesInput {
  customerId?: number;
  status?: string;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  pageSize?: number;
}

export interface BillingInvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerId: number;
  customerName?: string;
  periodStart: string;
  periodEnd: string;
  grossValue: number;
  netValue: number;
  status: string;
  totalCtes: number;
  dueDate: string;
  sentAt: string | null;
}

export interface ListBillingInvoicesOutput {
  items: BillingInvoiceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IListBillingInvoices {
  execute(
    input: ListBillingInvoicesInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ListBillingInvoicesOutput, string>>;
}

// ===== GetById =====
export interface GetBillingInvoiceByIdInput {
  invoiceId: string;
}

export interface BillingInvoiceDetail extends BillingInvoiceSummary {
  discountValue: number;
  issueDate: string;
  accountsReceivableId: number | null;
  pdfUrl: string | null;
  sentTo: string | null;
  notes: string | null;
  items: Array<{
    cteId: number;
    cteNumber: number;
    cteKey: string | null;
    cteIssueDate: string;
    cteValue: number;
    originUf: string | null;
    destinationUf: string | null;
  }>;
}

export interface IGetBillingInvoiceById {
  execute(
    input: GetBillingInvoiceByIdInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<BillingInvoiceDetail, string>>;
}

// ===== SendEmail =====
export interface SendBillingInvoiceInput {
  invoiceId: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
}

export interface SendBillingInvoiceOutput {
  id: string;
  sentTo: string;
  sentAt: string;
}

export interface ISendBillingInvoice {
  execute(
    input: SendBillingInvoiceInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<SendBillingInvoiceOutput, string>>;
}

// ===== GeneratePdf =====
export interface GenerateBillingPdfInput {
  invoiceId: string;
}

export interface GenerateBillingPdfOutput {
  id: string;
  pdfUrl: string;
}

export interface IGenerateBillingPdf {
  execute(
    input: GenerateBillingPdfInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<GenerateBillingPdfOutput, string>>;
}
