import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { AliquotaIBS, BaseCalculo, TaxAmount, Aliquota } from '../value-objects';
import { InvalidTaxCalculationError } from '../errors';

/**
 * Parâmetros para cálculo de IBS
 */
export interface IBSCalculationParams {
  // Base de cálculo
  baseValue: Money;
  
  // Alíquotas
  ibsUfRate: AliquotaIBS;
  ibsMunRate: AliquotaIBS;
  
  // Redução (se aplicável)
  reductionRate?: number; // Percentual de redução (0-100%)
  
  // Diferimento (se aplicável)
  deferralRate?: number; // Percentual de diferimento (0-100%)
  
  // UF e Município (para logging/auditoria)
  ufCode: string;
  municipioCode?: string;
}

/**
 * Resultado do cálculo de IBS
 */
export interface IBSCalculationResult {
  // Base de cálculo
  baseCalculo: BaseCalculo;
  baseCalculoEfetiva: BaseCalculo; // Após reduções
  
  // IBS UF
  ibsUfRate: AliquotaIBS;
  ibsUfValue: TaxAmount;
  ibsUfEffectiveRate?: AliquotaIBS; // Após reduções
  
  // IBS Municipal
  ibsMunRate: AliquotaIBS;
  ibsMunValue: TaxAmount;
  ibsMunEffectiveRate?: AliquotaIBS; // Após reduções
  
  // Totais
  totalIBS: Money;
  
  // Diferimento (se aplicável)
  deferredValue?: Money;
  deferralRate?: number;
  
  // Redução (se aplicável)
  reductionRate?: number;
}

/**
 * Calculator: IBS (Imposto sobre Bens e Serviços)
 * 
 * Implementa cálculo do IBS conforme LC 214/2025 (Reforma Tributária).
 * 
 * O IBS substitui ICMS + ISS e é dividido em:
 * - IBS UF (estadual)
 * - IBS Municipal
 * 
 * Características:
 * - Não cumulativo (crédito na entrada)
 * - Base única para mercadorias e serviços
 * - Destino da operação define competência
 * - Alíquota padrão estimada: 17,7% (quando 100% implementado)
 * 
 * Período de transição (2026-2032):
 * - 2026: 0,1% (teste)
 * - 2029-2032: Aumento gradual
 * - 2033+: 17,7% (alíquota cheia)
 * 
 * Base Legal: LC 214/2025
 */
export class IBSCalculator {
  /**
   * Calcula IBS
   */
  calculate(params: IBSCalculationParams): Result<IBSCalculationResult, string> {
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
    let ibsUfEffectiveRate: AliquotaIBS | undefined;
    let ibsMunEffectiveRate: AliquotaIBS | undefined;

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

      // Calcular alíquotas efetivas
      const effectiveUfRate = params.ibsUfRate.percentual * reductionMultiplier;
      const effectiveMunRate = params.ibsMunRate.percentual * reductionMultiplier;
      
      const ibsUfEffResult = AliquotaIBS.fromPercentage(effectiveUfRate);
      const ibsMunEffResult = AliquotaIBS.fromPercentage(effectiveMunRate);
      
      if (Result.isOk(ibsUfEffResult)) {
        ibsUfEffectiveRate = ibsUfEffResult.value;
      }
      if (Result.isOk(ibsMunEffResult)) {
        ibsMunEffectiveRate = ibsMunEffResult.value;
      }
    }

    // Calcular IBS UF
    const aliquotaUfGeneric = Aliquota.fromPercentage(params.ibsUfRate.percentual);
    if (Result.isFail(aliquotaUfGeneric)) {
      return Result.fail(`Failed to convert IBS UF rate: ${aliquotaUfGeneric.error}`);
    }
    const ibsUfValueResult = TaxAmount.calculate(baseCalculoEfetiva, aliquotaUfGeneric.value);
    if (Result.isFail(ibsUfValueResult)) {
      return Result.fail(ibsUfValueResult.error);
    }
    const ibsUfValue = ibsUfValueResult.value;

    // Calcular IBS Municipal
    const aliquotaMunGeneric = Aliquota.fromPercentage(params.ibsMunRate.percentual);
    if (Result.isFail(aliquotaMunGeneric)) {
      return Result.fail(`Failed to convert IBS Mun rate: ${aliquotaMunGeneric.error}`);
    }
    const ibsMunValueResult = TaxAmount.calculate(baseCalculoEfetiva, aliquotaMunGeneric.value);
    if (Result.isFail(ibsMunValueResult)) {
      return Result.fail(ibsMunValueResult.error);
    }
    const ibsMunValue = ibsMunValueResult.value;

    // Calcular total
    const totalIBSAmount = ibsUfValue.value.amount + ibsMunValue.value.amount;
    const totalIBSResult = Money.create(totalIBSAmount, params.baseValue.currency);
    if (Result.isFail(totalIBSResult)) {
      return Result.fail(totalIBSResult.error);
    }
    const totalIBS = totalIBSResult.value;

    // Calcular diferimento se aplicável
    let deferredValue: Money | undefined;
    if (params.deferralRate && params.deferralRate > 0) {
      const deferredAmount = totalIBS.amount * (params.deferralRate / 100);
      const deferredResult = Money.create(deferredAmount, params.baseValue.currency);
      if (Result.isOk(deferredResult)) {
        deferredValue = deferredResult.value;
      }
    }

    return Result.ok({
      baseCalculo,
      baseCalculoEfetiva,
      ibsUfRate: params.ibsUfRate,
      ibsUfValue,
      ibsUfEffectiveRate,
      ibsMunRate: params.ibsMunRate,
      ibsMunValue,
      ibsMunEffectiveRate,
      totalIBS,
      deferredValue,
      deferralRate: params.deferralRate,
      reductionRate: params.reductionRate,
    });
  }

  /**
   * Valida parâmetros obrigatórios
   */
  private validateParams(params: IBSCalculationParams): Result<void, string> {
    if (params.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    if (!params.ufCode || params.ufCode.length !== 2) {
      return Result.fail('Valid UF code (2 digits) is required');
    }

    if (params.municipioCode && params.municipioCode.length !== 7) {
      return Result.fail('Município code must have 7 digits when provided');
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

