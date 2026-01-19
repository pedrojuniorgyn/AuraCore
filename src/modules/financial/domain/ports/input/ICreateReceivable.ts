/**
 * ICreateReceivable - Port de Input para criar conta a receber
 */
import { Result } from '@/shared/domain';

export interface CreateReceivableInput {
  customerId: number;
  documentNumber: string;
  description: string;
  amount: number;
  currency?: string;
  issueDate?: Date;
  dueDate: Date;
  discountUntil?: Date;
  discountAmount?: number;
  fineRate?: number;
  interestRate?: number;
  origin?: 'MANUAL' | 'FISCAL_NFE' | 'FISCAL_CTE' | 'SALE' | 'IMPORT';
  categoryId?: number;
  costCenterId?: number;
  chartAccountId?: number;
  notes?: string;
}

export interface CreateReceivableOutput {
  id: string;
  documentNumber: string;
  status: string;
  amount: number;
  currency: string;
  dueDate: Date;
  createdAt: Date;
}

export interface ICreateReceivable {
  execute(
    input: CreateReceivableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreateReceivableOutput, string>>;
}
