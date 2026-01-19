/**
 * CompleteTripCommand - Command para completar viagem
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ICompleteTripUseCase, CompleteTripInput, CompleteTripOutput } from '../../domain/ports/input/ICompleteTripUseCase';
import type { ITripRepository } from '../../domain/ports/output/ITripRepository';

@injectable()
export class CompleteTripCommand implements ICompleteTripUseCase {
  constructor(
    @inject('ITripRepository') private tripRepository: ITripRepository
  ) {}

  async execute(
    input: CompleteTripInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CompleteTripOutput, string>> {
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

    // 2. Completar viagem
    const completeResult = trip.complete(
      input.actualRevenue ?? null,
      input.actualCost ?? null,
      context.userId
    );

    if (Result.isFail(completeResult)) {
      return Result.fail(completeResult.error);
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
      actualEnd: trip.actualEnd!,
    });
  }
}
