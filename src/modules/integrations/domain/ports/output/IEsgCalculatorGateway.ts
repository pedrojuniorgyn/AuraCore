/**
 * IEsgCalculatorGateway - Output Port
 *
 * Interface para cálculo de emissões ESG.
 * Wrapa o serviço legado esg-carbon-calculator.ts
 *
 * @module integrations/domain/ports/output
 * @see E9 Fase 2: Migração de @/services/esg-carbon-calculator
 */

import { Result } from '@/shared/domain';

export interface EsgBatchCalculateParams {
  organizationId: number;
  branchId: number;
  startDate: Date;
  endDate: Date;
}

export interface EsgBatchCalculateResult {
  totalEmissions: number;
  totalTrips: number;
  averagePerTrip: number;
  byVehicleType: Record<string, number>;
}

export interface IEsgCalculatorGateway {
  batchCalculate(params: EsgBatchCalculateParams): Promise<Result<EsgBatchCalculateResult, string>>;
}
