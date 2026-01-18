import { inject, injectable } from 'tsyringe';
import type { ILocationRepository } from '../../domain/ports/ILocationRepository';
import type { IStockRepository } from '../../domain/ports/IStockRepository';
import type { IMovementRepository } from '../../domain/ports/IMovementRepository';
import type { IRegisterStockExit } from '../../domain/ports/input';
import { StockMovement } from '../../domain/entities/StockMovement';
import { MovementType, MovementTypeEnum } from '../../domain/value-objects/MovementType';
import { StockQuantity, UnitOfMeasure } from '../../domain/value-objects/StockQuantity'
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { RegisterStockExitInput, RegisterStockExitOutput } from '../dtos/RegisterStockExitDTO';
import type { ExecutionContext } from '../dtos/ExecutionContext';

/**
 * RegisterStockExit Use Case - E7.8 WMS Semana 2
 * 
 * Registra saída de estoque de uma localização
 * 
 * @implements IRegisterStockExit - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class RegisterStockExit implements IRegisterStockExit {
  constructor(
    @inject(TOKENS.LocationRepository) private readonly locationRepository: ILocationRepository,
    @inject(TOKENS.StockRepository) private readonly stockRepository: IStockRepository,
    @inject(TOKENS.MovementRepository) private readonly movementRepository: IMovementRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {}

  async execute(
    input: RegisterStockExitInput,
    context: ExecutionContext
  ): Promise<Result<RegisterStockExitOutput, string>> {
    // Validação: localização existe
    const location = await this.locationRepository.findById(
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (!location) {
      return Result.fail('Location not found');
    }

    // Bug 19 Fix: Validar localização ativa (consistência com RegisterStockEntry e TransferStock)
    if (!location.isActive) {
      return Result.fail('Location is not active');
    }

    // Buscar StockItem
    const stockItem = await this.stockRepository.findByProductAndLocation(
      input.productId,
      input.locationId,
      context.organizationId,
      context.branchId
    );

    if (!stockItem) {
      return Result.fail('Product not found in location');
    }

    // Criar StockQuantity
    const quantityResult = StockQuantity.create(input.quantity, input.unit as UnitOfMeasure);
    if (!Result.isOk(quantityResult)) {
      return Result.fail(quantityResult.error);
    }

    // Verificar se há quantidade disponível
    if (stockItem.availableQuantity.value < input.quantity) {
      return Result.fail(`Insufficient stock. Available: ${stockItem.availableQuantity.value} ${stockItem.availableQuantity.unit}`);
    }

    // Criar MovementType
    const movementTypeResult = MovementType.create(MovementTypeEnum.EXIT);
    if (!Result.isOk(movementTypeResult)) {
      return Result.fail(movementTypeResult.error);
    }

    // Criar StockMovement
    const movementResult = StockMovement.create({
      id: this.uuidGenerator.generate(),
      organizationId: context.organizationId,
      branchId: context.branchId,
      productId: input.productId,
      fromLocationId: input.locationId,
      type: movementTypeResult.value,
      quantity: quantityResult.value,
      unitCost: stockItem.unitCost,
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

    // STEP 1: Remover quantidade do estoque ANTES de salvar movimento
    const removeResult = stockItem.removeQuantity(quantityResult.value);
    if (!Result.isOk(removeResult)) {
      return Result.fail(removeResult.error);
    }

    await this.stockRepository.save(stockItem);

    // STEP 2: Salvar movimentação APÓS estoque estar atualizado
    await this.movementRepository.save(movementResult.value);

    return Result.ok({
      movementId: movementResult.value.id,
      stockItemId: stockItem.id,
      quantity: quantityResult.value.value,
      unit: quantityResult.value.unit,
      unitCost: stockItem.unitCost.amount,
      totalCost: movementResult.value.totalCost.amount,
      currency: stockItem.unitCost.currency,
      remainingQuantity: stockItem.quantity.value,
      executedAt: movementResult.value.executedAt
    });
  }
}

