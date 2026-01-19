/**
 * IListReceivables - Port de Input para listar contas a receber
 */
import { Result } from '@/shared/domain';
import type { ReceivableOutput } from './IGetReceivableById';
import type { ReceivableStatusType } from '../../value-objects/ReceivableStatus';

export interface ListReceivablesInput {
  status?: ReceivableStatusType;
  customerId?: number;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListReceivablesOutput {
  items: ReceivableOutput[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalAmount: number;
    totalReceived: number;
    totalPending: number;
    overdueCount: number;
  };
}

export interface IListReceivables {
  execute(
    input: ListReceivablesInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<ListReceivablesOutput, string>>;
}
