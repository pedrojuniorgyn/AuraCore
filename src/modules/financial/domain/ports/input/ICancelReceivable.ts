/**
 * ICancelReceivable - Port de Input para cancelar conta a receber
 */
import { Result } from '@/shared/domain';

export interface CancelReceivableInput {
  id: string;
  reason: string;
}

export interface CancelReceivableOutput {
  id: string;
  status: string;
  cancelledAt: Date;
}

export interface ICancelReceivable {
  execute(
    input: CancelReceivableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CancelReceivableOutput, string>>;
}
