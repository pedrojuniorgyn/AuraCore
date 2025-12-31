import { Result } from '@/shared/domain';
import { InventoryCount } from '../entities/InventoryCount';
import { StockMovement } from '../entities/StockMovement';
import { StockQuantity } from '../value-objects/StockQuantity';
import { MovementType } from '../value-objects/MovementType';

/**
 * InventoryValidator: Domain Service para validação de inventário
 * 
 * E7.8 WMS - Semana 1
 * 
 * Responsabilidades:
 * - Validar contagem de inventário
 * - Calcular ajuste necessário
 * - Detectar anomalias
 * 
 * Padrão: Domain Service (stateless)
 */

/**
 * Anomalia detectada no inventário
 */
export interface InventoryAnomaly {
  countId: string;
  type: 'MAJOR_DIVERGENCE' | 'EXPIRED_PRODUCT' | 'NEGATIVE_STOCK' | 'DUPLICATE_COUNT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  recommendation?: string;
}

export class InventoryValidator {
  /**
   * Limiar para divergência significativa (%)
   */
  private static readonly MAJOR_DIVERGENCE_THRESHOLD = 10; // 10%

  /**
   * Valida uma contagem de inventário
   * 
   * @param count Contagem de inventário
   * @returns Result<void, string>
   */
  static validateCount(count: InventoryCount): Result<void, string> {
    // Verificar se foi contado
    if (!count.isCounted()) {
      return Result.fail('Inventory has not been counted yet');
    }

    // Verificar se tem divergência não resolvida
    if (count.hasDivergence() && !count.isAdjusted()) {
      return Result.fail('Inventory has unresolved divergence');
    }

    // Verificar se a diferença é razoável (< 100%)
    const difference = count.difference;
    if (difference) {
      const systemValue = count.systemQuantity.value;
      if (systemValue !== 0) {
        const percentDiff = Math.abs(difference.value / systemValue) * 100;
        if (percentDiff > 100) {
          return Result.fail(`Divergence is too large (${percentDiff.toFixed(2)}%)`);
        }
      }
    }

    return Result.ok(undefined);
  }

  /**
   * Calcula a movimentação de ajuste necessária para corrigir o inventário
   * 
   * @param count Contagem de inventário com divergência
   * @param executedBy Usuário que executa o ajuste
   * @param unitCost Custo unitário do produto
   * @returns Result<StockMovement, string> Movimentação de ajuste
   */
  static calculateAdjustment(
    count: InventoryCount,
    executedBy: string,
    unitCost: import('@/shared/domain').Money
  ): Result<StockMovement, string> {
    // Verificar se tem divergência
    if (!count.hasDivergence()) {
      return Result.fail('Cannot calculate adjustment without divergence');
    }

    const difference = count.difference!;
    
    // Determinar tipo de ajuste (positivo ou negativo)
    let movementTypeResult: Result<MovementType, string>;
    let adjustmentQuantity: StockQuantity;

    if (difference.isPositive()) {
      // Quantidade contada > quantidade sistema → ajuste positivo
      movementTypeResult = MovementType.adjustmentPlus();
      adjustmentQuantity = difference;
    } else {
      // Quantidade contada < quantidade sistema → ajuste negativo
      movementTypeResult = MovementType.adjustmentMinus();
      const absResult = StockQuantity.create(Math.abs(difference.value), difference.unit);
      if (!Result.isOk(absResult)) {
        return Result.fail(absResult.error);
      }
      adjustmentQuantity = absResult.value;
    }

    if (!Result.isOk(movementTypeResult)) {
      return Result.fail(movementTypeResult.error);
    }

    // Criar movimentação de ajuste
    const movementResult = StockMovement.create({
      id: `ADJ-${count.id}`,
      organizationId: count.organizationId,
      branchId: count.branchId,
      productId: count.productId,
      toLocationId: difference.isPositive() ? count.locationId : undefined,
      fromLocationId: difference.isNegative() ? count.locationId : undefined,
      type: movementTypeResult.value,
      quantity: adjustmentQuantity,
      unitCost: unitCost,
      referenceType: 'INVENTORY',
      referenceId: count.id,
      reason: `Inventory adjustment - Count ID: ${count.id}`,
      executedBy,
      executedAt: new Date(),
      createdAt: new Date(),
    });

    return movementResult;
  }

  /**
   * Detecta anomalias em uma lista de contagens de inventário
   * 
   * @param counts Contagens de inventário
   * @returns InventoryAnomaly[]
   */
  static detectAnomalies(counts: InventoryCount[]): InventoryAnomaly[] {
    const anomalies: InventoryAnomaly[] = [];

    for (const count of counts) {
      // Anomalia 1: Divergência significativa
      if (count.hasDivergence()) {
        const difference = count.difference!;
        const systemValue = count.systemQuantity.value;
        
        if (systemValue !== 0) {
          const percentDiff = Math.abs(difference.value / systemValue) * 100;
          
          if (percentDiff > this.MAJOR_DIVERGENCE_THRESHOLD) {
            anomalies.push({
              countId: count.id,
              type: 'MAJOR_DIVERGENCE',
              severity: percentDiff > 50 ? 'HIGH' : 'MEDIUM',
              description: `Large divergence detected: ${percentDiff.toFixed(2)}% (${difference.value} ${difference.unit})`,
              recommendation: 'Recount recommended to confirm accuracy',
            });
          }
        }
      }

      // Anomalia 2: Quantidade contada negativa (impossível)
      if (count.countedQuantity && count.countedQuantity.isNegative()) {
        anomalies.push({
          countId: count.id,
          type: 'NEGATIVE_STOCK',
          severity: 'HIGH',
          description: 'Counted quantity is negative',
          recommendation: 'Recount is required',
        });
      }
    }

    // Anomalia 3: Contagens duplicadas (mesmo produto e localização)
    const seenKeys = new Set<string>();
    for (const count of counts) {
      const key = `${count.productId}-${count.locationId}`;
      if (seenKeys.has(key)) {
        anomalies.push({
          countId: count.id,
          type: 'DUPLICATE_COUNT',
          severity: 'MEDIUM',
          description: `Duplicate count for product ${count.productId} in location ${count.locationId}`,
          recommendation: 'Review and keep only one count',
        });
      }
      seenKeys.add(key);
    }

    return anomalies;
  }

  /**
   * Calcula a acurácia do inventário
   * 
   * @param counts Contagens de inventário
   * @returns Result<number, string> Acurácia (0-100%)
   */
  static calculateAccuracy(counts: InventoryCount[]): Result<number, string> {
    if (counts.length === 0) {
      return Result.fail('Cannot calculate accuracy without counts');
    }

    const countedCounts = counts.filter(c => c.isCounted());
    
    if (countedCounts.length === 0) {
      return Result.fail('No counted inventories');
    }

    const accurateCount = countedCounts.filter(c => !c.hasDivergence()).length;
    const accuracy = (accurateCount / countedCounts.length) * 100;

    return Result.ok<number>(accuracy);
  }

  /**
   * Verifica se o inventário está pronto para finalização
   * 
   * @param counts Contagens de inventário
   * @returns Result<void, string>
   */
  static validateForFinalization(counts: InventoryCount[]): Result<void, string> {
    // Verificar se todas foram contadas
    const uncountedCount = counts.filter(c => !c.isCounted()).length;
    if (uncountedCount > 0) {
      return Result.fail(`${uncountedCount} inventories have not been counted yet`);
    }

    // Verificar se há divergências não resolvidas
    const unresolvedDivergences = counts.filter(c => c.hasDivergence() && !c.isAdjusted()).length;
    if (unresolvedDivergences > 0) {
      return Result.fail(`${unresolvedDivergences} inventories have unresolved divergences`);
    }

    // Detectar anomalias críticas
    const anomalies = this.detectAnomalies(counts);
    const criticalAnomalies = anomalies.filter(a => a.severity === 'HIGH');
    if (criticalAnomalies.length > 0) {
      return Result.fail(`${criticalAnomalies.length} critical anomalies detected`);
    }

    return Result.ok(undefined);
  }
}

