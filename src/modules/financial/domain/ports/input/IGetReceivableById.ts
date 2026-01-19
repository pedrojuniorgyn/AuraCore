/**
 * IGetReceivableById - Port de Input para buscar conta a receber por ID
 */
import { Result } from '@/shared/domain';

export interface GetReceivableByIdInput {
  id: string;
}

export interface ReceivableOutput {
  id: string;
  customerId: number;
  documentNumber: string;
  description: string;
  amount: number;
  currency: string;
  amountReceived: number;
  remainingAmount: number;
  issueDate: Date;
  dueDate: Date;
  receiveDate: Date | null;
  status: string;
  origin: string;
  categoryId: number | null;
  costCenterId: number | null;
  chartAccountId: number | null;
  notes: string | null;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetReceivableById {
  execute(
    input: GetReceivableByIdInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<ReceivableOutput | null, string>>;
}
