import { Result, Money } from '@/shared/domain';
import { StockMovement } from '../entities/StockMovement';
import { StockItem } from '../entities/StockItem';
import { StockQuantity } from '../value-objects/StockQuantity';

/**
 * StockCalculator: Domain Service para cálculos de estoque
 * 
 * E7.8 WMS - Semana 1
 * 
 * Responsabilidades:
 * - Calcular custo médio
 * - Calcular custo FIFO (First In, First Out)
 * - Calcular valor total do estoque
 * - Projetar estoque futuro
 * 
 * Padrão: Domain Service (stateless)
 */

export class StockCalculator {
  /**
   * Calcula o custo médio ponderado de um produto baseado nas movimentações
   * 
   * Fórmula: Custo Médio = Σ(quantidade * custo unitário) / Σ(quantidade)
   * 
   * @param movements Movimentações de entrada do produto
   * @returns Result<Money, string> Custo médio ponderado
   */
  static calculateAverageCost(movements: StockMovement[]): Result<Money, string> {
    if (movements.length === 0) {
      return Result.fail('Cannot calculate average cost without movements');
    }

    // Filtrar apenas entradas
    const entries = movements.filter(m => m.type.increasesStock());
    
    if (entries.length === 0) {
      return Result.fail('Cannot calculate average cost without entry movements');
    }

    let totalValue = 0;
    let totalQuantity = 0;
    const currency = entries[0].unitCost.currency;

    for (const movement of entries) {
      // Verificar moeda consistente
      if (movement.unitCost.currency !== currency) {
        return Result.fail('All movements must have the same currency');
      }

      totalValue += movement.unitCost.amount * movement.quantity.value;
      totalQuantity += movement.quantity.value;
    }

    if (totalQuantity === 0) {
      return Result.fail('Total quantity is zero');
    }

    const averageCost = totalValue / totalQuantity;
    return Money.create(averageCost, currency);
  }

  /**
   * Calcula o custo FIFO (First In, First Out) para uma quantidade específica
   * 
   * @param movements Movimentações de entrada ordenadas por data (mais antiga primeiro)
   * @param quantity Quantidade para calcular o custo
   * @returns Result<Money, string> Custo FIFO
   */
  static calculateFIFOCost(movements: StockMovement[], quantity: StockQuantity): Result<Money, string> {
    if (movements.length === 0) {
      return Result.fail('Cannot calculate FIFO cost without movements');
    }

    if (!quantity.isPositive()) {
      return Result.fail('Quantity must be positive');
    }

    // Filtrar apenas entradas
    const entries = movements.filter(m => m.type.increasesStock());
    
    if (entries.length === 0) {
      return Result.fail('Cannot calculate FIFO cost without entry movements');
    }

    // Ordenar por data de execução (FIFO)
    const sortedEntries = [...entries].sort((a, b) => 
      a.executedAt.getTime() - b.executedAt.getTime()
    );

    let remainingQuantity = quantity.value;
    let totalCost = 0;
    const currency = sortedEntries[0].unitCost.currency;

    for (const movement of sortedEntries) {
      // Verificar moeda consistente
      if (movement.unitCost.currency !== currency) {
        return Result.fail('All movements must have the same currency');
      }

      // Verificar unidade consistente
      if (movement.quantity.unit !== quantity.unit) {
        return Result.fail('Movement unit must match quantity unit');
      }

      const availableInMovement = movement.quantity.value;
      
      if (availableInMovement >= remainingQuantity) {
        // Essa movimentação cobre o restante
        totalCost += remainingQuantity * movement.unitCost.amount;
        remainingQuantity = 0;
        break;
      } else {
        // Consumir toda essa movimentação
        totalCost += availableInMovement * movement.unitCost.amount;
        remainingQuantity -= availableInMovement;
      }
    }

    if (remainingQuantity > 0) {
      return Result.fail('Insufficient movements to cover requested quantity');
    }

    return Money.create(totalCost, currency);
  }

  /**
   * Calcula o valor total do estoque (somando todos os itens)
   * 
   * @param items Itens de estoque
   * @returns Result<Money, string> Valor total
   */
  static calculateTotalValue(items: StockItem[]): Result<Money, string> {
    if (items.length === 0) {
      return Result.fail('Cannot calculate total value without items');
    }

    let totalValue = 0;
    const currency = items[0].unitCost.currency;

    for (const item of items) {
      // Verificar moeda consistente
      if (item.unitCost.currency !== currency) {
        return Result.fail('All items must have the same currency');
      }

      // ⚠️ S1.3-FIX: getTotalCost() agora retorna Result<Money, string>
      const totalCostResult = item.getTotalCost();
      if (Result.isFail(totalCostResult)) {
        return Result.fail(`Failed to get total cost for item ${item.id}: ${totalCostResult.error}`);
      }

      totalValue += totalCostResult.value.amount;
    }

    return Money.create(totalValue, currency);
  }

  /**
   * Projeta o estoque futuro baseado nas movimentações planejadas
   * 
   * @param currentStock Estoque atual
   * @param plannedMovements Movimentações planejadas
   * @returns Result<StockQuantity, string> Estoque projetado
   */
  static projectStock(
    currentStock: StockQuantity,
    plannedMovements: StockMovement[]
  ): Result<StockQuantity, string> {
    let projectedValue = currentStock.value;
    const unit = currentStock.unit;

    for (const movement of plannedMovements) {
      // Verificar unidade consistente
      if (movement.quantity.unit !== unit) {
        return Result.fail('Movement unit must match current stock unit');
      }

      if (movement.type.increasesStock()) {
        projectedValue += movement.quantity.value;
      } else if (movement.type.decreasesStock()) {
        projectedValue -= movement.quantity.value;
      }
      // TRANSFER não altera o total
    }

    return StockQuantity.create(projectedValue, unit, true); // allowNegative = true para projeções
  }

  /**
   * Calcula a taxa de cobertura (dias de estoque disponível)
   * 
   * @param currentStock Estoque atual
   * @param averageDailyUsage Uso médio diário
   * @returns number Dias de cobertura
   */
  static calculateCoverageDays(
    currentStock: StockQuantity,
    averageDailyUsage: StockQuantity
  ): Result<number, string> {
    // Verificar unidade consistente
    if (currentStock.unit !== averageDailyUsage.unit) {
      return Result.fail('Stock and usage must have the same unit');
    }

    if (averageDailyUsage.value === 0) {
      return Result.fail('Average daily usage cannot be zero');
    }

    if (averageDailyUsage.isNegative()) {
      return Result.fail('Average daily usage cannot be negative');
    }

    const days = currentStock.value / averageDailyUsage.value;
    return Result.ok<number>(Math.floor(days));
  }

  /**
   * Calcula o turnover (giro) do estoque
   * 
   * @param soldQuantity Quantidade vendida no período
   * @param averageStock Estoque médio no período
   * @returns Result<number, string> Taxa de turnover
   */
  static calculateTurnover(
    soldQuantity: StockQuantity,
    averageStock: StockQuantity
  ): Result<number, string> {
    // Verificar unidade consistente
    if (soldQuantity.unit !== averageStock.unit) {
      return Result.fail('Sold and average stock must have the same unit');
    }

    if (averageStock.value === 0) {
      return Result.fail('Average stock cannot be zero');
    }

    const turnover = soldQuantity.value / averageStock.value;
    return Result.ok<number>(turnover);
  }
}

