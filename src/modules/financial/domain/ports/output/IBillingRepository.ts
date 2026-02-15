// Billing Repository Interface
export interface BillingInvoiceFilter {
  organizationId: number;
  branchId?: number;
  customerId?: number;
  status?: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  page?: number;
  pageSize?: number;
}

export interface IBillingRepository {
  // Invoice operations
  findInvoiceById(id: number, organizationId: number): Promise<unknown>;
  findInvoiceByNumber(invoiceNumber: string, organizationId: number): Promise<unknown>;
  findInvoices(filter: BillingInvoiceFilter): Promise<{ items: unknown[]; total: number }>;
  saveInvoice(invoice: unknown): Promise<void>;
  updateInvoice(id: number, invoice: unknown): Promise<void>;
  deleteInvoice(id: number, organizationId: number): Promise<void>;

  // Item operations
  findItemsByInvoiceId(invoiceId: number): Promise<unknown[]>;
  saveItem(item: unknown): Promise<void>;
  deleteItemsByInvoiceId(invoiceId: number): Promise<void>;
}
