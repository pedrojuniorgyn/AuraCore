/**
 * CancelTripCommand - Command para cancelar viagem
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ICancelTripUseCase, CancelTripInput, CancelTripOutput } from '../../domain/ports/input/ICancelTripUseCase';
import type { ITripRepository } from '../../domain/ports/output/ITripRepository';

@injectable()
export class CancelTripCommand implements ICancelTripUseCase {
  constructor(
    @inject('ITripRepository') private tripRepository: ITripRepository
  ) {}

  async execute(
    input: CancelTripInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CancelTripOutput, string>> {
    // 1. Buscar viagem
    const tripResult = await this.tripRepository.findById(
      input.tripId,
      context.organizationId,
      context.branchId
    );

    if (Result.isFail(tripResult)) {
      return Result.fail(`Erro ao buscar viagem: ${tripResult.error}`);
    }

    if (!tripResult.value) {
      return Result.fail('Viagem não encontrada');
    }

    const trip = tripResult.value;

    // 2. Cancelar viagem
    const cancelResult = trip.cancel(input.reason, context.userId);

    if (Result.isFail(cancelResult)) {
      return Result.fail(cancelResult.error);
    }

    // 3. Persistir
    const saveResult = await this.tripRepository.save(trip);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    // 4. Retornar output
    return Result.ok({
      id: trip.id,
      tripNumber: trip.tripNumber,
      status: trip.status.value,
    });
  }
}
