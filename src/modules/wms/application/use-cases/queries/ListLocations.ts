import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ILocationRepository } from '@/modules/wms/domain/ports/ILocationRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';
import type { PaginatedResponse } from '../../dtos/ListQueryDTO';
import type { Location } from '@/modules/wms/domain/entities/Location';

export interface ListLocationsInput {
  page: number;
  limit: number;
  type?: string;
  warehouseId?: string;
  isActive?: boolean;
}

export interface LocationListItem {
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
}

@injectable()
export class ListLocations {
  constructor(
    @inject('LocationRepository')
    private locationRepository: ILocationRepository
  ) {}

  async execute(
    input: ListLocationsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<LocationListItem>, string>> {
    if (input.page < 1) {
      return Result.fail('Page must be at least 1');
    }
    if (input.limit < 1 || input.limit > 100) {
      return Result.fail('Limit must be between 1 and 100');
    }

    const locations = await this.locationRepository.findMany(
      context.organizationId,
      context.branchId,
      {
        type: input.type,
        warehouseId: input.warehouseId,
        isActive: input.isActive
      },
      {
        page: input.page,
        limit: input.limit
      }
    );

    const total = await this.locationRepository.count(
      context.organizationId,
      context.branchId,
      {
        type: input.type,
        warehouseId: input.warehouseId,
        isActive: input.isActive
      }
    );

    const items: LocationListItem[] = locations.map((loc: Location) => ({
      id: loc.id,
      warehouseId: loc.warehouseId,
      code: loc.code.value,
      name: loc.name,
      type: loc.type,
      parentId: loc.parentId ?? null,
      capacity: loc.capacity?.value ?? null,
      capacityUnit: loc.capacity?.unit ?? null,
      isActive: loc.isActive,
      createdAt: loc.createdAt
    }));

    return Result.ok<PaginatedResponse<LocationListItem>>({
      items,
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit)
    });
  }
}
