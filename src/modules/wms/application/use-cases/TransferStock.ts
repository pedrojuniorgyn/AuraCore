import { inject, injectable } from 'tsyringe';
import type { ILocationRepository } from '../../domain/ports/ILocationRepository';
import type { IStockRepository } from '../../domain/ports/IStockRepository';
import type { IMovementRepository } from '../../domain/ports/IMovementRepository';
import { StockMovement } from '../../domain/entities/StockMovement';
import { StockItem } from '../../domain/entities/StockItem';
import { MovementType, MovementTypeEnum } from '../../domain/value-objects/MovementType';
import { StockQuantity, UnitOfMeasure } from '../../domain/value-objects/StockQuantity'
import { Result, Money } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { TransferStockInput, TransferStockOutput } from '../dtos/TransferStockDTO';
import type { ExecutionContext } from '../dtos/ExecutionContext';

/**
 * TransferStock Use Case - E7.8 WMS Semana 2
 * 
 * Transfere estoque entre duas localizações
 */
@injectable()
export class TransferStock {
  constructor(
    @inject(TOKENS.LocationRepository) private readonly locationRepository: ILocationRepository,
    @inject(TOKENS.StockRepository) private readonly stockRepository: IStockRepository,
    @inject(TOKENS.MovementRepository) private readonly movementRepository: IMovementRepository
  ) {}

  async execute(
    input: TransferStockInput,
    context: ExecutionContext
  ): Promise<Result<TransferStockOutput, string>> {
    // Validação: localizações existem e são diferentes
    if (input.fromLocationId === input.toLocationId) {
      return Result.fail('From and To locations must be different');
    }

    const fromLocation = await this.locationRepository.findById(
      input.fromLocationId,
      context.organizationId,
      context.branchId
    );

    if (!fromLocation) {
      return Result.fail('From location not found');
    }

    if (!fromLocation.isActive) {
      return Result.fail('From location is not active');
    }

    const toLocation = await this.locationRepository.findById(
      input.toLocationId,
      context.organizationId,
      context.branchId
    );

    if (!toLocation) {
      return Result.fail('To location not found');
    }

    if (!toLocation.isActive) {
      return Result.fail('To location is not active');
    }

    // Buscar StockItem origem
    const fromStockItem = await this.stockRepository.findByProductAndLocation(
      input.productId,
      input.fromLocationId,
      context.organizationId,
      context.branchId
    );

    if (!fromStockItem) {
      return Result.fail('Product not found in from location');
    }

    // Criar StockQuantity
    const quantityResult = StockQuantity.create(input.quantity, input.unit as UnitOfMeasure);
    if (!Result.isOk(quantityResult)) {
      return Result.fail(quantityResult.error);
    }

    // Verificar disponibilidade
    if (fromStockItem.availableQuantity.value < input.quantity) {
      return Result.fail(`Insufficient stock in from location. Available: ${fromStockItem.availableQuantity.value} ${fromStockItem.availableQuantity.unit}`);
    }

    // Criar MovementType
    const movementTypeResult = MovementType.create(MovementTypeEnum.TRANSFER);
    if (!Result.isOk(movementTypeResult)) {
      return Result.fail(movementTypeResult.error);
    }

    // Criar StockMovement
    const movementResult = StockMovement.create({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      branchId: context.branchId,
      productId: input.productId,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      type: movementTypeResult.value,
      quantity: quantityResult.value,
      unitCost: fromStockItem.unitCost,
      reason: input.reason,
      executedBy: context.userId,
      executedAt: new Date(),
      createdAt: new Date()
    });

    if (!Result.isOk(movementResult)) {
      return Result.fail(movementResult.error);
    }

    // STEP 1: Remover da origem
    const removeResult = fromStockItem.removeQuantity(quantityResult.value);
    if (!Result.isOk(removeResult)) {
      return Result.fail(removeResult.error);
    }

    await this.stockRepository.save(fromStockItem);

    // STEP 2: Buscar ou criar estoque no destino
    let toStockItem = await this.stockRepository.findByProductAndLocation(
      input.productId,
      input.toLocationId,
      context.organizationId,
      context.branchId
    );

    if (toStockItem) {
      // Calcular nova quantidade e custo médio ANTES de modificar
      const oldQuantity = toStockItem.quantity.value;
      const newTotalQuantity = oldQuantity + input.quantity;
      
      // Calcular custo médio ponderado
      const totalExistingValue = oldQuantity * toStockItem.unitCost.amount;
      const totalNewValue = input.quantity * fromStockItem.unitCost.amount;
      const avgCost = (totalExistingValue + totalNewValue) / newTotalQuantity;
      
      const avgCostResult = Money.create(avgCost, toStockItem.unitCost.currency);
      if (!Result.isOk(avgCostResult)) {
        return Result.fail(`Failed to calculate weighted average cost: ${avgCostResult.error}`);
      }
      
      // Aplicar mudanças
      const addResult = toStockItem.addQuantity(quantityResult.value);
      if (!Result.isOk(addResult)) {
        return Result.fail(addResult.error);
      }
      
      const updateCostResult = toStockItem.updateUnitCost(avgCostResult.value);
      if (!Result.isOk(updateCostResult)) {
        return Result.fail(updateCostResult.error);
      }

      await this.stockRepository.save(toStockItem);
    } else {
      const reservedQty = StockQuantity.create(0, input.unit as UnitOfMeasure);
      if (!Result.isOk(reservedQty)) {
        return Result.fail(reservedQty.error);
      }

      // Bug 14 Fix: Usar reconstitute() ao invés de create() para transferências
      // Estamos "movendo" dados já validados na entrada original, não criando novos
      // Isso permite transferir produtos expirados sem falhar na validação
      const stockItemResult = StockItem.reconstitute({
        id: crypto.randomUUID(),
        organizationId: context.organizationId,
        branchId: context.branchId,
        productId: input.productId,
        locationId: input.toLocationId,
        quantity: quantityResult.value,
        reservedQuantity: reservedQty.value,
        lotNumber: fromStockItem.lotNumber,
        expirationDate: fromStockItem.expirationDate,
        unitCost: fromStockItem.unitCost,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (!Result.isOk(stockItemResult)) {
        return Result.fail(stockItemResult.error);
      }

      await this.stockRepository.save(stockItemResult.value);
      toStockItem = stockItemResult.value;
    }

    // STEP 3: Salvar movimentação APÓS ambos os estoques estarem atualizados
    await this.movementRepository.save(movementResult.value);

    return Result.ok({
      movementId: movementResult.value.id,
      fromStockItemId: fromStockItem.id,
      toStockItemId: toStockItem.id,
      quantity: quantityResult.value.value,
      unit: quantityResult.value.unit,
      fromRemainingQuantity: fromStockItem.quantity.value,
      toNewQuantity: toStockItem.quantity.value,
      executedAt: movementResult.value.executedAt
    });
  }
}

