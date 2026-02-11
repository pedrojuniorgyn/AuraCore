/**
 * TaxCalculatorAdapter - Infrastructure Adapter
 *
 * Adapta o servico legacy de calculo de impostos para as interfaces
 * do Domain Port ITaxCalculatorGateway e ITaxCalculatorService.
 *
 * @see ARCH-011: Implementa interface de domain/ports/output/
 * @see ITaxCalculatorGateway (E9 Fase 2 - legacy)
 * @see ITaxCalculatorService (E10.3 - novo)
 * @since E9 Fase 2
 */
import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ITaxCalculatorGateway,
  TaxCalculationParams,
  TaxMatrixResult,
  IcmsCalculationParams,
  IcmsCalculationResult,
} from '../../domain/ports/output/ITaxCalculatorGateway';
import type {
  ITaxCalculatorService,
  TaxCalculationInput,
  TaxCalculationOutput,
  IcmsCalculationOutput,
} from '../../domain/ports/output/ITaxCalculatorService';

// Import legado
import {
  calculateTax as legacyCalculateTax,
  calculateIcmsValue as legacyCalculateIcms,
  hasTaxRule as legacyHasTaxRule,
} from '@/services/fiscal/tax-calculator';

@injectable()
export class TaxCalculatorAdapter implements ITaxCalculatorGateway, ITaxCalculatorService {
  // --- ITaxCalculatorGateway (legacy interface) ---

  async calculateTax(params: TaxCalculationParams & TaxCalculationInput): Promise<Result<TaxMatrixResult & TaxCalculationOutput, string>> {
    try {
      const result = await legacyCalculateTax({
        organizationId: params.organizationId,
        originUf: params.originUf,
        destinationUf: params.destinationUf,
        regime: params.regime ?? 'NORMAL',
      });

      return Result.ok(result as TaxMatrixResult & TaxCalculationOutput);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no cálculo de impostos: ${message}`);
    }
  }

  // --- ITaxCalculatorGateway.calculateIcmsValue (wrapped params) ---

  calculateIcmsValue(params: IcmsCalculationParams): Result<IcmsCalculationResult, string>;
  calculateIcmsValue(serviceValue: number, taxInfo: TaxCalculationOutput): Result<IcmsCalculationOutput, string>;
  calculateIcmsValue(
    paramsOrValue: IcmsCalculationParams | number,
    taxInfo?: TaxCalculationOutput,
  ): Result<IcmsCalculationResult | IcmsCalculationOutput, string> {
    try {
      let value: number;
      let tax: Parameters<typeof legacyCalculateIcms>[1];

      if (typeof paramsOrValue === 'number') {
        // ITaxCalculatorService signature: (serviceValue, taxInfo)
        value = paramsOrValue;
        tax = taxInfo as Parameters<typeof legacyCalculateIcms>[1];
      } else {
        // ITaxCalculatorGateway signature: (params)
        value = paramsOrValue.value;
        tax = paramsOrValue.taxInfo as Parameters<typeof legacyCalculateIcms>[1];
      }

      const result = legacyCalculateIcms(value, tax);

      // Map to both output shapes
      const output: IcmsCalculationResult & IcmsCalculationOutput = {
        base: result.base,
        value: result.value,
        effectiveRate: result.effectiveRate,
        baseValue: result.base,
        icmsValue: result.value,
        icmsRate: result.effectiveRate,
        icmsReduction: tax?.icmsReduction ?? 0,
      };

      return Result.ok(output);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no cálculo de ICMS: ${message}`);
    }
  }

  // --- ITaxCalculatorService.hasTaxRule ---

  async hasTaxRule(
    organizationId: number,
    originUf: string,
    destinationUf: string,
    regime?: string,
  ): Promise<Result<boolean, string>> {
    try {
      const exists = await legacyHasTaxRule(organizationId, originUf, destinationUf, regime ?? 'NORMAL');
      return Result.ok(exists);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao verificar regra fiscal: ${message}`);
    }
  }
}
