import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { ILocationRepository } from '@/modules/wms/domain/ports/output/ILocationRepository';
import type { IListLocations, ListLocationsInput, LocationListItem } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../dtos/ExecutionContext';
import type { PaginatedResponse } from '../dtos/ListQueryDTO';
import type { Location } from '@/modules/wms/domain/entities/Location';

/**
 * ListLocations Query - E7.8 WMS Semana 2
 * 
 * @implements IListLocations - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class ListLocations implements IListLocations {
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
