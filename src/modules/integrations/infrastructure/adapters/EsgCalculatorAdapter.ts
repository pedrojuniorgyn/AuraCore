/**
 * EsgCalculatorAdapter
 * @see E9 Fase 2: Wrapper do @/services/esg-carbon-calculator
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IEsgCalculatorGateway,
  EsgBatchCalculateParams,
  EsgBatchCalculateResult,
} from '../../domain/ports/output/IEsgCalculatorGateway';

// TODO (E10): Migrar lógica para Domain Service
import { ESGCarbonCalculator } from '@/services/esg-carbon-calculator';

@injectable()
export class EsgCalculatorAdapter implements IEsgCalculatorGateway {
  async batchCalculate(params: EsgBatchCalculateParams): Promise<Result<EsgBatchCalculateResult, string>> {
    try {
      const result = await ESGCarbonCalculator.batchCalculate(
        params.organizationId,
        params.startDate,
        params.endDate
      );
      // O serviço retorna Record<string, unknown>, convertemos para nossa interface
      return Result.ok({
        totalEmissions: (result as Record<string, unknown>).totalEmissions as number || 0,
        totalTrips: (result as Record<string, unknown>).totalTrips as number || 0,
        averagePerTrip: (result as Record<string, unknown>).averagePerTrip as number || 0,
        byVehicleType: (result as Record<string, unknown>).byVehicleType as Record<string, number> || {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no cálculo ESG: ${message}`);
    }
  }
}
