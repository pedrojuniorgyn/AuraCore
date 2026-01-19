/**
 * IReceivePayment - Port de Input para registrar recebimento
 */
import { Result } from '@/shared/domain';

export interface ReceivePaymentInput {
  receivableId: string;
  amount: number;
  bankAccountId: number;
  paymentDate?: Date;
  notes?: string;
}

export interface ReceivePaymentOutput {
  id: string;
  amountReceived: number;
  remainingAmount: number;
  status: string;
  receiveDate: Date | null;
}

export interface IReceivePayment {
  execute(
    input: ReceivePaymentInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ReceivePaymentOutput, string>>;
}
