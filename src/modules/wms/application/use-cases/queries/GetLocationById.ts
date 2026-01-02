import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ILocationRepository } from '@/modules/wms/domain/ports/ILocationRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';

export interface GetLocationByIdInput {
  id: string;
}

export interface GetLocationByIdOutput {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  capacity: number | null;
  capacityUnit: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class GetLocationById {
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
