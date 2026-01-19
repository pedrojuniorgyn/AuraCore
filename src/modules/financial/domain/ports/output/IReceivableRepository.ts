/**
 * IReceivableRepository - Port de Output para persistência de Receivables
 */
import { Result } from '@/shared/domain';
import type { AccountReceivable } from '../../entities/AccountReceivable';
import type { ReceivableStatusType } from '../../value-objects/ReceivableStatus';

export interface ReceivableFilter {
  organizationId: number;
  branchId: number;
  status?: ReceivableStatusType;
  customerId?: number;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ReceivableListResult {
  items: AccountReceivable[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReceivableSummary {
  totalAmount: number;
  totalReceived: number;
  totalPending: number;
  overdueCount: number;
}

export interface IReceivableRepository {
  findById(id: string, organizationId: number, branchId: number): Promise<Result<AccountReceivable | null, string>>;
  findByDocumentNumber(documentNumber: string, organizationId: number): Promise<Result<AccountReceivable | null, string>>;
  findMany(filter: ReceivableFilter): Promise<Result<ReceivableListResult, string>>;
  findByCustomer(customerId: number, organizationId: number, branchId: number): Promise<Result<AccountReceivable[], string>>;
  getSummary(organizationId: number, branchId: number): Promise<Result<ReceivableSummary, string>>;
  save(receivable: AccountReceivable): Promise<Result<void, string>>;
  delete(id: string, organizationId: number, branchId: number): Promise<Result<void, string>>;
}
