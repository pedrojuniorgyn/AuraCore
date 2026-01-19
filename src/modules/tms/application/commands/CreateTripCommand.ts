/**
 * CreateTripCommand - Command para criar viagem
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ICreateTripUseCase, CreateTripInput, CreateTripOutput } from '../../domain/ports/input/ICreateTripUseCase';
import type { ITripRepository } from '../../domain/ports/output/ITripRepository';
import type { IDriverRepository } from '../../domain/ports/output/IDriverRepository';
import type { IVehicleRepository } from '../../domain/ports/output/IVehicleRepository';
import { Trip } from '../../domain/entities/Trip';

@injectable()
export class CreateTripCommand implements ICreateTripUseCase {
  constructor(
    @inject('ITripRepository') private tripRepository: ITripRepository,
    @inject('IDriverRepository') private driverRepository: IDriverRepository,
    @inject('IVehicleRepository') private vehicleRepository: IVehicleRepository
  ) {}

  async execute(
    input: CreateTripInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreateTripOutput, string>> {
    // 1. Validar motorista
    const driverResult = await this.driverRepository.findById(input.driverId, context.organizationId);
    if (Result.isFail(driverResult)) {
      return Result.fail(`Erro ao buscar motorista: ${driverResult.error}`);
    }
    if (!driverResult.value) {
      return Result.fail('Motorista não encontrado');
    }
    if (!driverResult.value.canDrive) {
      return Result.fail('Motorista não pode dirigir (inativo, bloqueado ou CNH vencida)');
    }

    // 2. Validar veículo
    const vehicleResult = await this.vehicleRepository.findById(input.vehicleId, context.organizationId);
    if (Result.isFail(vehicleResult)) {
      return Result.fail(`Erro ao buscar veículo: ${vehicleResult.error}`);
    }
    if (!vehicleResult.value) {
      return Result.fail('Veículo não encontrado');
    }
    if (!vehicleResult.value.canBeAllocated) {
      return Result.fail('Veículo não pode ser alocado (indisponível, em manutenção ou documentação vencida)');
    }

    // 3. Criar entity Trip
    const tripResult = Trip.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      driverType: input.driverType,
      trailer1Id: input.trailer1Id ?? null,
      trailer2Id: input.trailer2Id ?? null,
      pickupOrderIds: input.pickupOrderIds,
      scheduledStart: input.scheduledStart ?? null,
      scheduledEnd: input.scheduledEnd ?? null,
      estimatedRevenue: input.estimatedRevenue,
      estimatedCost: input.estimatedCost,
      notes: input.notes,
      createdBy: context.userId,
    });

    if (Result.isFail(tripResult)) {
      return Result.fail(tripResult.error);
    }

    // 4. Persistir
    const saveResult = await this.tripRepository.save(tripResult.value);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    // 5. Retornar output
    return Result.ok({
      id: saveResult.value,
      tripNumber: tripResult.value.tripNumber,
      status: tripResult.value.status.value,
    });
  }
}
