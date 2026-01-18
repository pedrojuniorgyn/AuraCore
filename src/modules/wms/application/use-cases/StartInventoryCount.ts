import { inject, injectable } from 'tsyringe';
import type { IStockRepository } from '../../domain/ports/IStockRepository';
import type { IInventoryCountRepository } from '../../domain/ports/IInventoryCountRepository';
import type { IStartInventoryCount } from '../../domain/ports/input';
import { InventoryCount } from '../../domain/entities/InventoryCount';
import { InventoryStatus, InventoryStatusEnum } from '../../domain/value-objects/InventoryStatus';
import { Result } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { StartInventoryCountInput, StartInventoryCountOutput } from '../dtos/InventoryCountDTO';
import type { ExecutionContext } from '../dtos/ExecutionContext';

/**
 * StartInventoryCount Use Case - E7.8 WMS Semana 2
 * 
 * Inicia contagem de inventário para um produto em uma localização
 * 
 * @implements IStartInventoryCount - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class StartInventoryCount implements IStartInventoryCount {
  constructor(
    @inject(TOKENS.StockRepository) private readonly stockRepository: IStockRepository,
    @inject(TOKENS.InventoryCountRepository) private readonly inventoryCountRepository: IInventoryCountRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {}

  async execute(
    input: StartInventoryCountInput,
    context: ExecutionContext
  ): Promise<Result<StartInventoryCountOutput, string>> {
    // Bug 13 Fix: Verificar se já existe contagem pendente para evitar duplicação
    const existingPendingCount = await this.inventoryCountRepository.findPendingByProductAndLocation(
      input.productId,
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (existingPendingCount) {
      return Result.fail('Inventory count already in progress for this product/location');
    }

    // Buscar estoque existente
    const stockItem = await this.stockRepository.findByProductAndLocation(
      input.productId,
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (!stockItem) {
      return Result.fail('Product not found in location');
    }

    // Criar status PENDING
    const statusResult = InventoryStatus.create(InventoryStatusEnum.PENDING);
    if (!Result.isOk(statusResult)) {
      return Result.fail(statusResult.error);
    }

    // Criar InventoryCount
    const inventoryCountResult = InventoryCount.create({
      id: this.uuidGenerator.generate(),
      organizationId: context.organizationId,
      branchId: context.branchId,
      locationId: input.locationId,
      productId: input.productId,
      systemQuantity: stockItem.quantity,
      status: statusResult.value,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (!Result.isOk(inventoryCountResult)) {
      return Result.fail(inventoryCountResult.error);
    }

    const inventoryCount = inventoryCountResult.value;

    // Persistir no banco
    await this.inventoryCountRepository.save(inventoryCount);

    return Result.ok({
      id: inventoryCount.id,
      productId: inventoryCount.productId,
      locationId: inventoryCount.locationId,
      systemQuantity: inventoryCount.systemQuantity.value,
      systemUnit: inventoryCount.systemQuantity.unit,
      status: inventoryCount.status.value,
      createdAt: inventoryCount.createdAt
    });
  }
}

