import { inject, injectable } from 'tsyringe';
import type { ILocationRepository } from '../../domain/ports/ILocationRepository';
import type { IStockRepository } from '../../domain/ports/IStockRepository';
import type { IMovementRepository } from '../../domain/ports/IMovementRepository';
import { StockMovement } from '../../domain/entities/StockMovement';
import { StockItem } from '../../domain/entities/StockItem';
import { MovementType, MovementTypeEnum } from '../../domain/value-objects/MovementType';
import { StockQuantity, UnitOfMeasure } from '../../domain/value-objects/StockQuantity'
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
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
    @inject(TOKENS.MovementRepository) private readonly movementRepository: IMovementRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
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

    // ========================================
    // FASE 1: BUSCAR DADOS (Read-Only)
    // ========================================
    
    // Buscar estoque no destino (pode não existir)
    const toStockItem = await this.stockRepository.findByProductAndLocation(
      input.productId,
      input.toLocationId,
      context.organizationId,
      context.branchId
    );

    // ========================================
    // FASE 2: CALCULAR E VALIDAR TUDO (Em Memória - Sem Salvar)
    // ========================================
    
    // 2.1 Criar quantidade de transferência
    const quantityResult = StockQuantity.create(input.quantity, input.unit as UnitOfMeasure);
    if (!Result.isOk(quantityResult)) {
      return Result.fail(quantityResult.error);
    }

    // 2.2 Verificar disponibilidade na origem
    if (fromStockItem.availableQuantity.value < input.quantity) {
      return Result.fail(`Insufficient stock in from location. Available: ${fromStockItem.availableQuantity.value} ${fromStockItem.availableQuantity.unit}`);
    }

    // 2.3 Calcular custo médio no destino (se já existir estoque)
    let destinationUnitCost = fromStockItem.unitCost;
    if (toStockItem) {
      const oldQuantity = toStockItem.quantity.value;
      const newTotalQuantity = oldQuantity + input.quantity;
      
      const totalExistingValue = oldQuantity * toStockItem.unitCost.amount;
      const totalNewValue = input.quantity * fromStockItem.unitCost.amount;
      const avgCost = (totalExistingValue + totalNewValue) / newTotalQuantity;
      
      // Bug 17 Fix: Validar Money.create() ANTES de salvar qualquer coisa
      const avgCostResult = Money.create(avgCost, toStockItem.unitCost.currency);
      if (!Result.isOk(avgCostResult)) {
        return Result.fail(`Failed to calculate weighted average cost: ${avgCostResult.error}`);
      }
      destinationUnitCost = avgCostResult.value;
    }

    // 2.4 Preparar origem atualizada (em memória)
    const removeResult = fromStockItem.removeQuantity(quantityResult.value);
    if (!Result.isOk(removeResult)) {
      return Result.fail(removeResult.error);
    }

    // 2.5 Preparar destino atualizado (em memória)
    let updatedToStockItem: StockItem;
    if (toStockItem) {
      // Atualizar estoque existente
      const addResult = toStockItem.addQuantity(quantityResult.value);
      if (!Result.isOk(addResult)) {
        return Result.fail(addResult.error);
      }
      
      // Bug 17 Fix: Validar updateUnitCost() ANTES de salvar qualquer coisa
      const updateCostResult = toStockItem.updateUnitCost(destinationUnitCost);
      if (!Result.isOk(updateCostResult)) {
        return Result.fail(updateCostResult.error);
      }
      
      updatedToStockItem = toStockItem;
    } else {
      // Criar novo estoque no destino
      const reservedQty = StockQuantity.create(0, input.unit as UnitOfMeasure);
      if (!Result.isOk(reservedQty)) {
        return Result.fail(reservedQty.error);
      }

      // Bug 14 Fix: Usar reconstitute() ao invés de create() para transferências
      // Bug 18 Fix: SEMPRE usar destinationUnitCost (variável calculada), não fromStockItem.unitCost
      const stockItemResult = StockItem.reconstitute({
        id: this.uuidGenerator.generate(),
        organizationId: context.organizationId,
        branchId: context.branchId,
        productId: input.productId,
        locationId: input.toLocationId,
        quantity: quantityResult.value,
        reservedQuantity: reservedQty.value,
        lotNumber: fromStockItem.lotNumber,
        expirationDate: fromStockItem.expirationDate,
        unitCost: destinationUnitCost, // Bug 18 fix: usar variável calculada
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (!Result.isOk(stockItemResult)) {
        return Result.fail(stockItemResult.error);
      }
      
      updatedToStockItem = stockItemResult.value;
    }

    // 2.6 Criar movimentação (em memória)
    const movementTypeResult = MovementType.create(MovementTypeEnum.TRANSFER);
    if (!Result.isOk(movementTypeResult)) {
      return Result.fail(movementTypeResult.error);
    }

    const movementResult = StockMovement.create({
      id: this.uuidGenerator.generate(),
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

    // ========================================
    // FASE 3: PERSISTIR TUDO (Ordem: Destino → Origem → Movimento)
    // ========================================
    // Bug 17 Fix: Persistir DESTINO primeiro, depois ORIGEM, por último MOVIMENTO
    // Se destino falhar, nada foi modificado
    // Se origem falhar após destino, temos estoque extra (melhor que perder)
    // Se movimento falhar, estoque está correto mas sem registro de movimentação
    
    await this.stockRepository.save(updatedToStockItem);
    await this.stockRepository.save(fromStockItem);
    await this.movementRepository.save(movementResult.value);

    return Result.ok({
      movementId: movementResult.value.id,
      fromStockItemId: fromStockItem.id,
      toStockItemId: updatedToStockItem.id,
      quantity: quantityResult.value.value,
      unit: quantityResult.value.unit,
      fromRemainingQuantity: fromStockItem.quantity.value,
      toNewQuantity: updatedToStockItem.quantity.value,
      executedAt: movementResult.value.executedAt
    });
  }
}

