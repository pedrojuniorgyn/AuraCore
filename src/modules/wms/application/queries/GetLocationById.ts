import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { ILocationRepository } from '@/modules/wms/domain/ports/output/ILocationRepository';
import type { IGetLocationById, GetLocationByIdInput, GetLocationByIdOutput } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../dtos/ExecutionContext';

/**
 * GetLocationById Query - E7.8 WMS Semana 2
 * 
 * @implements IGetLocationById - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class GetLocationById implements IGetLocationById {
  constructor(
    @inject('LocationRepository')
    private locationRepository: ILocationRepository
  ) {}

  async execute(
    input: GetLocationByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetLocationByIdOutput, string>> {
    const location = await this.locationRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (!location) {
      return Result.fail('Location not found');
    }

    return Result.ok<GetLocationByIdOutput>({
      id: location.id,
      warehouseId: location.warehouseId,
      code: location.code.value,
      name: location.name,
      type: location.type,
      parentId: location.parentId ?? null,
      capacity: location.capacity?.value ?? null,
      capacityUnit: location.capacity?.unit ?? null,
      isActive: location.isActive,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt
    });
  }
}
