import { inject, injectable } from '@/shared/infrastructure/di/container';
import type { ILocationRepository } from '../../domain/ports/output/ILocationRepository';
import type { ICreateLocation } from '../../domain/ports/input';
import { Location } from '../../domain/entities/Location';
import { LocationCode } from '../../domain/value-objects/LocationCode';
import { StockQuantity, UnitOfMeasure } from '../../domain/value-objects/StockQuantity'
import { Result } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { CreateLocationInput, CreateLocationOutput } from '../dtos/CreateLocationDTO';
import type { ExecutionContext } from '../dtos/ExecutionContext';

/**
 * CreateLocation Use Case - E7.8 WMS Semana 2
 * 
 * Cria nova localização no armazém
 * 
 * @implements ICreateLocation - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class CreateLocation implements ICreateLocation {
  constructor(
    @inject(TOKENS.LocationRepository) private readonly locationRepository: ILocationRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {}

  async execute(
    input: CreateLocationInput,
    context: ExecutionContext
  ): Promise<Result<CreateLocationOutput, string>> {
    // Validar se código já existe
    const codeResult = LocationCode.create(input.code);
    if (!Result.isOk(codeResult)) {
      return Result.fail(codeResult.error);
    }

    const existing = await this.locationRepository.findByCode(
      codeResult.value,
      input.warehouseId,
      context.organizationId,
      context.branchId
    );

    if (existing) {
      return Result.fail(`Location with code ${input.code} already exists in this warehouse`);
    }

    // Bug 20 Fix: Validar parentId para tipos não-WAREHOUSE (fail-fast)
    if (input.type !== 'WAREHOUSE' && !input.parentId) {
      return Result.fail(`Parent location is required for type ${input.type}`);
    }

    // Se é WAREHOUSE, parentId deve ser null/undefined
    if (input.type === 'WAREHOUSE' && input.parentId) {
      return Result.fail('WAREHOUSE type cannot have a parent location');
    }

    // Validar parent se fornecido
    if (input.parentId) {
      const parent = await this.locationRepository.findById(
        input.parentId,
        context.organizationId,
        context.branchId
      );

      if (!parent) {
        return Result.fail('Parent location not found');
      }

      if (parent.warehouseId !== input.warehouseId) {
        return Result.fail('Parent location must be in the same warehouse');
      }
    }

    // Criar capacidade se fornecida
    let capacity: StockQuantity | undefined;
    if (input.capacity !== undefined && input.capacityUnit) {
      const capacityResult = StockQuantity.create(input.capacity, input.capacityUnit as UnitOfMeasure);
      if (!Result.isOk(capacityResult)) {
        return Result.fail(capacityResult.error);
      }
      capacity = capacityResult.value;
    }

    // Criar Location
    const locationResult = Location.create({
      id: this.uuidGenerator.generate(),
      organizationId: context.organizationId,
      branchId: context.branchId,
      warehouseId: input.warehouseId,
      code: codeResult.value,
      name: input.name,
      type: input.type,
      parentId: input.parentId,
      capacity,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (!Result.isOk(locationResult)) {
      return Result.fail(locationResult.error);
    }

    // Salvar
    await this.locationRepository.save(locationResult.value);

    return Result.ok({
      id: locationResult.value.id,
      code: locationResult.value.code.value,
      name: locationResult.value.name,
      type: locationResult.value.type,
      warehouseId: locationResult.value.warehouseId,
      parentId: locationResult.value.parentId,
      capacity: locationResult.value.capacity?.value,
      capacityUnit: locationResult.value.capacity?.unit,
      isActive: locationResult.value.isActive,
      createdAt: locationResult.value.createdAt
    });
  }
}

