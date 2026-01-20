/**
 * Adapter para tax-calculator legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  ITaxCalculatorGateway, 
  TaxCalculationParams,
  TaxMatrixResult,
  IcmsCalculationParams,
  IcmsCalculationResult,
} from '../../domain/ports/output/ITaxCalculatorGateway';

// Import legado
import { calculateTax as legacyCalculateTax, calculateIcmsValue as legacyCalculateIcms } from '@/services/fiscal/tax-calculator';

@injectable()
export class TaxCalculatorAdapter implements ITaxCalculatorGateway {
  async calculateTax(params: TaxCalculationParams): Promise<Result<TaxMatrixResult, string>> {
    try {
      // O serviço legado aceita um objeto com campos específicos
      const result = await legacyCalculateTax({
        organizationId: params.organizationId,
        originUf: params.originUf,
        destinationUf: params.destinationUf,
        regime: 'NORMAL',
      });

      return Result.ok(result as TaxMatrixResult);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no cálculo de impostos: ${message}`);
    }
  }

  calculateIcmsValue(params: IcmsCalculationParams): Result<IcmsCalculationResult, string> {
    try {
      // O serviço legado aceita (value, taxInfo)
      const result = legacyCalculateIcms(params.value, params.taxInfo as Parameters<typeof legacyCalculateIcms>[1]);
      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no cálculo de ICMS: ${message}`);
    }
  }
}
