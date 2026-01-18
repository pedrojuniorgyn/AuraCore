import { inject, injectable } from 'tsyringe';
import type { ILocationRepository } from '../../domain/ports/ILocationRepository';
import type { IStockRepository } from '../../domain/ports/IStockRepository';
import type { IMovementRepository } from '../../domain/ports/IMovementRepository';
import type { IRegisterStockEntry } from '../../domain/ports/input';
import { StockMovement } from '../../domain/entities/StockMovement';
import { StockItem } from '../../domain/entities/StockItem';
import { MovementType, MovementTypeEnum } from '../../domain/value-objects/MovementType';
import { StockQuantity, UnitOfMeasure } from '../../domain/value-objects/StockQuantity'
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { RegisterStockEntryInput, RegisterStockEntryOutput } from '../dtos/RegisterStockEntryDTO';
import type { ExecutionContext } from '../dtos/ExecutionContext';

/**
 * RegisterStockEntry Use Case - E7.8 WMS Semana 2
 * 
 * Registra entrada de estoque em uma localização
 * 
 * @implements IRegisterStockEntry - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class RegisterStockEntry implements IRegisterStockEntry {
  constructor(
    @inject(TOKENS.LocationRepository) private readonly locationRepository: ILocationRepository,
    @inject(TOKENS.StockRepository) private readonly stockRepository: IStockRepository,
    @inject(TOKENS.MovementRepository) private readonly movementRepository: IMovementRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {}

  async execute(
    input: RegisterStockEntryInput,
    context: ExecutionContext
  ): Promise<Result<RegisterStockEntryOutput, string>> {
    // Validação: localização existe
    const location = await this.locationRepository.findById(
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (!location) {
      return Result.fail('Location not found');
    }

    if (!location.isActive) {
      return Result.fail('Location is not active');
    }

    // Criar MovementType
    const movementTypeResult = MovementType.create(MovementTypeEnum.ENTRY);
    if (!Result.isOk(movementTypeResult)) {
      return Result.fail(movementTypeResult.error);
    }

    // Criar StockQuantity
    const quantityResult = StockQuantity.create(input.quantity, input.unit as UnitOfMeasure);
    if (!Result.isOk(quantityResult)) {
      return Result.fail(quantityResult.error);
    }

    // Criar Money para unitCost
    const unitCostResult = Money.create(input.unitCost, input.currency || 'BRL');
    if (!Result.isOk(unitCostResult)) {
      return Result.fail(unitCostResult.error);
    }

    // Criar StockMovement
    const movementResult = StockMovement.create({
      id: this.uuidGenerator.generate(),
      organizationId: context.organizationId,
      branchId: context.branchId,
      productId: input.productId,
      toLocationId: input.locationId,
      type: movementTypeResult.value,
      quantity: quantityResult.value,
      unitCost: unitCostResult.value,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason,
      executedBy: context.userId,
      executedAt: new Date(),
      createdAt: new Date()
    });

    if (!Result.isOk(movementResult)) {
      return Result.fail(movementResult.error);
    }

    // Buscar ou criar StockItem ANTES de salvar movimento
    let stockItem = await this.stockRepository.findByProductAndLocation(
      input.productId,
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (stockItem) {
      // STEP 1: Calcular nova quantidade e custo médio ANTES de modificar
      const oldQuantity = stockItem.quantity.value;
      const newTotalQuantity = oldQuantity + input.quantity;
      
      // Calcular custo médio ponderado
      const totalExistingValue = oldQuantity * stockItem.unitCost.amount;
      const totalNewValue = input.quantity * unitCostResult.value.amount;
      const avgCost = (totalExistingValue + totalNewValue) / newTotalQuantity;
      
      const avgCostResult = Money.create(avgCost, stockItem.unitCost.currency);
      if (!Result.isOk(avgCostResult)) {
        return Result.fail(`Failed to calculate weighted average cost: ${avgCostResult.error}`);
      }
      
      // STEP 2: Aplicar mudanças ao StockItem
      const addResult = stockItem.addQuantity(quantityResult.value);
      if (!Result.isOk(addResult)) {
        return Result.fail(addResult.error);
      }
      
      const updateCostResult = stockItem.updateUnitCost(avgCostResult.value);
      if (!Result.isOk(updateCostResult)) {
        return Result.fail(updateCostResult.error);
      }

      // STEP 3: Salvar estoque ANTES de salvar movimento
      await this.stockRepository.save(stockItem);
    } else {
      // Criar novo StockItem
      const reservedQty = StockQuantity.create(0, input.unit as UnitOfMeasure);
      if (!Result.isOk(reservedQty)) {
        return Result.fail(reservedQty.error);
      }

      const stockItemResult = StockItem.create({
        id: this.uuidGenerator.generate(),
        organizationId: context.organizationId,
        branchId: context.branchId,
        productId: input.productId,
        locationId: input.locationId,
        quantity: quantityResult.value,
        reservedQuantity: reservedQty.value,
        lotNumber: input.lotNumber,
        expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
        unitCost: unitCostResult.value,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (!Result.isOk(stockItemResult)) {
        return Result.fail(stockItemResult.error);
      }

      await this.stockRepository.save(stockItemResult.value);
      stockItem = stockItemResult.value;
    }

    // STEP 4: Salvar movimentação APÓS estoque estar atualizado
    await this.movementRepository.save(movementResult.value);

    return Result.ok({
      movementId: movementResult.value.id,
      stockItemId: stockItem.id,
      quantity: quantityResult.value.value,
      unit: quantityResult.value.unit,
      unitCost: unitCostResult.value.amount,
      totalCost: movementResult.value.totalCost.amount,
      currency: unitCostResult.value.currency,
      executedAt: movementResult.value.executedAt
    });
  }
}

