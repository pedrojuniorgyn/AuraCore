import { inject, injectable} from 'tsyringe';
import type { IStockRepository } from '../../domain/ports/IStockRepository';
import type { IMovementRepository } from '../../domain/ports/IMovementRepository';
import type { IInventoryCountRepository } from '../../domain/ports/IInventoryCountRepository';
import { InventoryCount } from '../../domain/entities/InventoryCount';
import { InventoryStatus, InventoryStatusEnum } from '../../domain/value-objects/InventoryStatus';
import { StockQuantity, UnitOfMeasure } from '../../domain/value-objects/StockQuantity'
import { StockMovement } from '../../domain/entities/StockMovement';
import { MovementType, MovementTypeEnum } from '../../domain/value-objects/MovementType';
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { CompleteInventoryCountInput, CompleteInventoryCountOutput } from '../dtos/InventoryCountDTO';
import type { ExecutionContext } from '../dtos/ExecutionContext';

/**
 * CompleteInventoryCount Use Case - E7.8 WMS Semana 2
 * 
 * Completa contagem de inventário e cria ajuste se necessário
 */
@injectable()
export class CompleteInventoryCount {
  constructor(
    @inject(TOKENS.StockRepository) private readonly stockRepository: IStockRepository,
    @inject(TOKENS.MovementRepository) private readonly movementRepository: IMovementRepository,
    @inject(TOKENS.InventoryCountRepository) private readonly inventoryCountRepository: IInventoryCountRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {}

  async execute(
    input: CompleteInventoryCountInput,
    context: ExecutionContext
  ): Promise<Result<CompleteInventoryCountOutput, string>> {
    // Buscar inventário existente
    const existingCount = await this.inventoryCountRepository.findByProductAndLocation(
      input.productId,
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (!existingCount) {
      return Result.fail('Inventory count not found');
    }

    // Buscar estoque
    const stockItem = await this.stockRepository.findByProductAndLocation(
      input.productId,
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (!stockItem) {
      return Result.fail('Product not found in location');
    }

    // Criar countedQuantity
    const countedQtyResult = StockQuantity.create(input.countedQuantity, stockItem.quantity.unit);
    if (!Result.isOk(countedQtyResult)) {
      return Result.fail(countedQtyResult.error);
    }

    // Registrar contagem no InventoryCount usando método do domain
    const recordResult = existingCount.recordCount(countedQtyResult.value, context.userId);
    if (!Result.isOk(recordResult)) {
      return Result.fail(recordResult.error);
    }

    // Calcular diferença
    const difference = input.countedQuantity - stockItem.quantity.value;

    let adjustmentMovementId: string | undefined;

    // Se houver diferença, criar movimentação de ajuste
    if (difference !== 0) {
      const absDifference = Math.abs(difference);
      const adjustmentQtyResult = StockQuantity.create(absDifference, stockItem.quantity.unit);
      
      if (!Result.isOk(adjustmentQtyResult)) {
        return Result.fail(adjustmentQtyResult.error);
      }

      const movementTypeValue = difference > 0 ? MovementTypeEnum.ADJUSTMENT_PLUS : MovementTypeEnum.ADJUSTMENT_MINUS;
      const movementTypeResult = MovementType.create(movementTypeValue);
      
      if (!Result.isOk(movementTypeResult)) {
        return Result.fail(movementTypeResult.error);
      }

      const movementResult = StockMovement.create({
        id: this.uuidGenerator.generate(),
        organizationId: context.organizationId,
        branchId: context.branchId,
        productId: input.productId,
        fromLocationId: difference < 0 ? input.locationId : undefined,
        toLocationId: difference > 0 ? input.locationId : undefined,
        type: movementTypeResult.value,
        quantity: adjustmentQtyResult.value,
        unitCost: stockItem.unitCost,
        referenceType: 'INVENTORY',
        referenceId: existingCount.id,
        reason: `Inventory count adjustment: counted ${input.countedQuantity}, system had ${stockItem.quantity.value}`,
        executedBy: context.userId,
        executedAt: new Date(),
        createdAt: new Date()
      });

      if (!Result.isOk(movementResult)) {
        return Result.fail(movementResult.error);
      }

      // STEP 1: Atualizar quantidade no estoque ANTES de salvar movimento
      if (difference > 0) {
        const addQtyResult = StockQuantity.create(difference, stockItem.quantity.unit);
        if (!Result.isOk(addQtyResult)) {
          return Result.fail(`Failed to create adjustment quantity: ${addQtyResult.error}`);
        }
        const addResult = stockItem.addQuantity(addQtyResult.value);
        if (!Result.isOk(addResult)) {
          return Result.fail(`Failed to add quantity to stock: ${addResult.error}`);
        }
      } else {
        const removeQtyResult = StockQuantity.create(Math.abs(difference), stockItem.quantity.unit);
        if (!Result.isOk(removeQtyResult)) {
          return Result.fail(`Failed to create adjustment quantity: ${removeQtyResult.error}`);
        }
        const removeResult = stockItem.removeQuantity(removeQtyResult.value);
        if (!Result.isOk(removeResult)) {
          return Result.fail(`Failed to remove quantity from stock: ${removeResult.error}`);
        }
      }

      // STEP 2: Salvar estoque ANTES de salvar movimento (Stock-First Pattern)
      await this.stockRepository.save(stockItem);

      // STEP 3: Salvar movimento APÓS estoque estar atualizado
      await this.movementRepository.save(movementResult.value);
      adjustmentMovementId = movementResult.value.id;
      
      // Registrar ajuste no InventoryCount
      const recordAdjustmentResult = existingCount.recordAdjustment(adjustmentMovementId);
      if (!Result.isOk(recordAdjustmentResult)) {
        return Result.fail(recordAdjustmentResult.error);
      }
    }

    // Persistir InventoryCount atualizado no banco
    await this.inventoryCountRepository.save(existingCount);

    return Result.ok({
      id: existingCount.id,
      productId: existingCount.productId,
      locationId: existingCount.locationId,
      systemQuantity: existingCount.systemQuantity.value,
      countedQuantity: countedQtyResult.value.value,
      difference,
      status: existingCount.status.value,
      adjustmentMovementId: existingCount.adjustmentMovementId,
      countedBy: existingCount.countedBy,
      countedAt: existingCount.countedAt
    });
  }
}


