import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { Aliquota, BaseCalculo, TaxAmount } from '../value-objects';
import { MissingTaxParametersError } from '../errors';

/**
 * Regime de PIS
 */
export type PISRegime = 'CUMULATIVO' | 'NAO_CUMULATIVO';

/**
 * Parâmetros para cálculo de PIS
 */
export interface PISCalculationParams {
  baseValue: Money;
  cst: string; // 01-99
  regime: PISRegime;
  aliquota?: Aliquota;
}

/**
 * Calculator: PIS (Programa de Integração Social)
 * 
 * Alíquotas padrão:
 * - Regime Cumulativo: 0,65%
 * - Regime Não Cumulativo: 1,65%
 * 
 * Base legal: Lei 10.637/2002
 */
export class PISCalculator {
  /**
   * Alíquotas padrão
   */
  private static readonly ALIQUOTA_CUMULATIVO = 0.65;
  private static readonly ALIQUOTA_NAO_CUMULATIVO = 1.65;

  /**
   * Calcula PIS
   */
  calculate(params: PISCalculationParams): Result<TaxAmount, string> {
    // Validar parâmetros
    if (params.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    // Criar base de cálculo
    const baseCalculoResult = BaseCalculo.create(params.baseValue);
    if (Result.isFail(baseCalculoResult)) {
      return Result.fail(baseCalculoResult.error);
    }

    const baseCalculo = baseCalculoResult.value;

    // CSTs isentos ou não tributados
    const cstIsento = ['04', '05', '06', '07', '08', '09'];
    if (cstIsento.includes(params.cst)) {
      // ⚠️ S1.3-FIX: TaxAmount.zero() agora retorna Result<TaxAmount, string>
      return TaxAmount.zero(baseCalculo);
    }

    // Determinar alíquota
    let aliquota: Aliquota;
    
    if (params.aliquota) {
      aliquota = params.aliquota;
    } else {
      // Usar alíquota padrão conforme regime
      const defaultRate = params.regime === 'CUMULATIVO'
        ? PISCalculator.ALIQUOTA_CUMULATIVO
        : PISCalculator.ALIQUOTA_NAO_CUMULATIVO;
      
      const aliquotaResult = Aliquota.fromPercentage(defaultRate);
      if (Result.isFail(aliquotaResult)) {
        return Result.fail(aliquotaResult.error);
      }
      aliquota = aliquotaResult.value;
    }

    // Calcular PIS
    return TaxAmount.calculate(baseCalculo, aliquota);
  }

  /**
   * Retorna alíquota padrão para regime
   * 
   * ⚠️ S1.3: Agora retorna Result<Aliquota, string> ao invés de throw (DOMAIN-SVC-004)
   */
  static getDefaultRate(regime: PISRegime): Result<Aliquota, string> {
    const rate = regime === 'CUMULATIVO'
      ? PISCalculator.ALIQUOTA_CUMULATIVO
      : PISCalculator.ALIQUOTA_NAO_CUMULATIVO;
    
    return Aliquota.fromPercentage(rate);
  }
}

