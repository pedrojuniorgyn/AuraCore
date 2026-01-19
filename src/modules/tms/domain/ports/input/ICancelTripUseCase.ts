/**
 * ICancelTripUseCase - Port de Input para cancelar viagem
 */
import { Result } from '@/shared/domain';

export interface CancelTripInput {
  tripId: number;
  reason: string;
}

export interface CancelTripOutput {
  id: number;
  tripNumber: string;
  status: string;
}

export interface ICancelTripUseCase {
  execute(
    input: CancelTripInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CancelTripOutput, string>>;
}
