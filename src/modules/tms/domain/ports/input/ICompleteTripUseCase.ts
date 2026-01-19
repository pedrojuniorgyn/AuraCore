/**
 * ICompleteTripUseCase - Port de Input para completar viagem
 */
import { Result } from '@/shared/domain';

export interface CompleteTripInput {
  tripId: number;
  actualRevenue?: number;
  actualCost?: number;
}

export interface CompleteTripOutput {
  id: number;
  tripNumber: string;
  status: string;
  actualEnd: Date;
}

export interface ICompleteTripUseCase {
  execute(
    input: CompleteTripInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CompleteTripOutput, string>>;
}
