// Bank Account Repository Interface
export interface BankAccountFilter {
  organizationId: number;
  branchId?: number;
  bankCode?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  accountType?: 'CHECKING' | 'SAVINGS' | 'INVESTMENT';
  page?: number;
  pageSize?: number;
}

export interface IBankAccountRepository {
  findById(id: number, organizationId: number): Promise<unknown>;
  findByBankAndAccount(bankCode: string, accountNumber: string, organizationId: number): Promise<unknown>;
  findMany(filter: BankAccountFilter): Promise<{ items: unknown[]; total: number }>;
  save(bankAccount: unknown): Promise<void>;
  update(id: number, bankAccount: unknown): Promise<void>;
  delete(id: number, organizationId: number): Promise<void>;
  updateBalance(id: number, newBalance: number): Promise<void>;
}
