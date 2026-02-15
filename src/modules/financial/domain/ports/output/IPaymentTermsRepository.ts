// Payment Terms Repository Interface
export interface PaymentTermsFilter {
  organizationId: number;
  type?: 'TERM' | 'CASH' | 'CUSTOM';
  status?: 'ACTIVE' | 'INACTIVE';
  page?: number;
  pageSize?: number;
}

export interface IPaymentTermsRepository {
  findById(id: number, organizationId: number): Promise<unknown>;
  findByCode(code: string, organizationId: number): Promise<unknown>;
  findMany(filter: PaymentTermsFilter): Promise<{ items: unknown[]; total: number }>;
  save(paymentTerm: unknown): Promise<void>;
  update(id: number, paymentTerm: unknown): Promise<void>;
  delete(id: number, organizationId: number): Promise<void>;
}
