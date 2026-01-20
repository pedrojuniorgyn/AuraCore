/**
 * FreightCalculatorAdapter
 *
 * Implementa IFreightCalculatorGateway usando o serviço legado.
 * Wrapper temporário até migração completa da lógica para Domain Service.
 *
 * @module tms/infrastructure/adapters
 * @see E9 Fase 1: Wrapper do @/services/pricing/freight-calculator
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IFreightCalculatorGateway,
  FreightCalculationParams,
  FreightCalculationResult,
} from '../../domain/ports/output/IFreightCalculatorGateway';

// TODO (E9.2): Migrar lógica para Domain Service
import {
  calculateFreight as legacyCalculateFreight,
  simulateFreightScenarios as legacySimulateScenarios,
} from '@/services/pricing/freight-calculator';

@injectable()
export class FreightCalculatorAdapter implements IFreightCalculatorGateway {
  
  async calculate(params: FreightCalculationParams): Promise<Result<FreightCalculationResult, string>> {
    try {
      // Converter para formato legado (sem branchId que foi adicionado na interface)
      const legacyResult = await legacyCalculateFreight({
        organizationId: params.organizationId,
        customerId: params.customerId,
        realWeight: params.realWeight,
        volume: params.volume,
        invoiceValue: params.invoiceValue,
        originState: params.originState,
        destinationState: params.destinationState,
        transportType: params.transportType,
      });

      if (!legacyResult.success) {
        return Result.fail(legacyResult.error || 'Erro ao calcular frete');
      }

      return Result.ok({
        freightWeight: legacyResult.freightWeight,
        realWeight: legacyResult.realWeight,
        cubicWeight: legacyResult.cubicWeight,
        baseFreight: legacyResult.baseFreight,
        components: legacyResult.components,
        subtotal: legacyResult.subtotal,
        total: legacyResult.total,
        tableUsed: legacyResult.tableUsed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no cálculo de frete: ${message}`);
    }
  }

  async simulateScenarios(
    baseParams: FreightCalculationParams,
    scenarios: Partial<FreightCalculationParams>[]
  ): Promise<Result<FreightCalculationResult[], string>> {
    try {
      const legacyResults = await legacySimulateScenarios(
        {
          organizationId: baseParams.organizationId,
          customerId: baseParams.customerId,
          realWeight: baseParams.realWeight,
          volume: baseParams.volume,
          invoiceValue: baseParams.invoiceValue,
          originState: baseParams.originState,
          destinationState: baseParams.destinationState,
          transportType: baseParams.transportType,
        },
        scenarios.map(s => ({
          organizationId: s.organizationId,
          customerId: s.customerId,
          realWeight: s.realWeight,
          volume: s.volume,
          invoiceValue: s.invoiceValue,
          originState: s.originState,
          destinationState: s.destinationState,
          transportType: s.transportType,
        }))
      );

      const results = legacyResults
        .filter(r => r.success)
        .map(r => ({
          freightWeight: r.freightWeight,
          realWeight: r.realWeight,
          cubicWeight: r.cubicWeight,
          baseFreight: r.baseFreight,
          components: r.components,
          subtotal: r.subtotal,
          total: r.total,
          tableUsed: r.tableUsed,
        }));

      return Result.ok(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na simulação de frete: ${message}`);
    }
  }
}
