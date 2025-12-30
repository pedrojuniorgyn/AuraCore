import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { AliquotaCBS, BaseCalculo, TaxAmount, Aliquota } from '../value-objects';

/**
 * Parâmetros para cálculo de CBS
 */
export interface CBSCalculationParams {
  // Base de cálculo
  baseValue: Money;
  
  // Alíquota
  cbsRate: AliquotaCBS;
  
  // Redução (se aplicável)
  reductionRate?: number; // Percentual de redução (0-100%)
  
  // Diferimento (se aplicável)
  deferralRate?: number; // Percentual de diferimento (0-100%)
}

/**
 * Resultado do cálculo de CBS
 */
export interface CBSCalculationResult {
  // Base de cálculo
  baseCalculo: BaseCalculo;
  baseCalculoEfetiva: BaseCalculo; // Após reduções
  
  // CBS
  cbsRate: AliquotaCBS;
  cbsValue: TaxAmount;
  cbsEffectiveRate?: AliquotaCBS; // Após reduções
  
  // Diferimento (se aplicável)
  deferredValue?: Money;
  deferralRate?: number;
  
  // Redução (se aplicável)
  reductionRate?: number;
}

/**
 * Calculator: CBS (Contribuição sobre Bens e Serviços)
 * 
 * Implementa cálculo da CBS conforme LC 214/2025 (Reforma Tributária).
 * 
 * A CBS substitui PIS + COFINS e é um tributo federal.
 * 
 * Características:
 * - Federal (alíquota uniforme em todo território nacional)
 * - Não cumulativa (crédito na entrada)
 * - Base única com IBS
 * - Alíquota padrão estimada: 8,8%
 * 
 * Período de transição:
 * - 2026: 0,9% (teste)
 * - 2027+: 8,8% (alíquota cheia, PIS/COFINS extintos)
 * 
 * Base Legal: LC 214/2025
 */
export class CBSCalculator {
  /**
   * Calcula CBS
   */
  calculate(params: CBSCalculationParams): Result<CBSCalculationResult, string> {
    // Validar parâmetros
    const validationResult = this.validateParams(params);
    if (Result.isFail(validationResult)) {
      return validationResult;
    }

    // Criar base de cálculo
    const baseCalculoResult = BaseCalculo.create(params.baseValue);
    if (Result.isFail(baseCalculoResult)) {
      return Result.fail(baseCalculoResult.error);
    }
    const baseCalculo = baseCalculoResult.value;

    // Aplicar redução se houver
    let baseCalculoEfetiva = baseCalculo;
    let cbsEffectiveRate: AliquotaCBS | undefined;

    if (params.reductionRate && params.reductionRate > 0) {
      const reductionMultiplier = 1 - (params.reductionRate / 100);
      const reducedAmount = params.baseValue.amount * reductionMultiplier;
      const reducedMoneyResult = Money.create(reducedAmount, params.baseValue.currency);
      
      if (Result.isFail(reducedMoneyResult)) {
        return Result.fail(reducedMoneyResult.error);
      }

      const reducedBaseResult = BaseCalculo.create(reducedMoneyResult.value);
      if (Result.isFail(reducedBaseResult)) {
        return Result.fail(reducedBaseResult.error);
      }
      baseCalculoEfetiva = reducedBaseResult.value;

      // Calcular alíquota efetiva
      const effectiveRate = params.cbsRate.percentual * reductionMultiplier;
      const cbsEffResult = AliquotaCBS.fromPercentage(effectiveRate);
      
      if (Result.isOk(cbsEffResult)) {
        cbsEffectiveRate = cbsEffResult.value;
      }
    }

    // Calcular CBS
    const aliquotaGeneric = Aliquota.fromPercentage(params.cbsRate.percentual);
    if (Result.isFail(aliquotaGeneric)) {
      return Result.fail(`Failed to convert CBS rate: ${aliquotaGeneric.error}`);
    }
    const cbsValueResult = TaxAmount.calculate(baseCalculoEfetiva, aliquotaGeneric.value);
    if (Result.isFail(cbsValueResult)) {
      return Result.fail(cbsValueResult.error);
    }
    const cbsValue = cbsValueResult.value;

    // Calcular diferimento se aplicável
    let deferredValue: Money | undefined;
    if (params.deferralRate && params.deferralRate > 0) {
      const deferredAmount = cbsValue.value.amount * (params.deferralRate / 100);
      const deferredResult = Money.create(deferredAmount, params.baseValue.currency);
      if (Result.isOk(deferredResult)) {
        deferredValue = deferredResult.value;
      }
    }

    return Result.ok({
      baseCalculo,
      baseCalculoEfetiva,
      cbsRate: params.cbsRate,
      cbsValue,
      cbsEffectiveRate,
      deferredValue,
      deferralRate: params.deferralRate,
      reductionRate: params.reductionRate,
    });
  }

  /**
   * Valida parâmetros obrigatórios
   */
  private validateParams(params: CBSCalculationParams): Result<void, string> {
    if (params.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    if (params.reductionRate !== undefined) {
      if (params.reductionRate < 0 || params.reductionRate > 100) {
        return Result.fail('Reduction rate must be between 0% and 100%');
      }
    }

    if (params.deferralRate !== undefined) {
      if (params.deferralRate < 0 || params.deferralRate > 100) {
        return Result.fail('Deferral rate must be between 0% and 100%');
      }
    }

    return Result.ok(undefined);
  }
}

