import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { Aliquota, BaseCalculo, TaxAmount } from '../value-objects';
import { MissingTaxParametersError } from '../errors';

/**
 * Regime de COFINS
 */
export type COFINSRegime = 'CUMULATIVO' | 'NAO_CUMULATIVO';

/**
 * Parâmetros para cálculo de COFINS
 */
export interface COFINSCalculationParams {
  baseValue: Money;
  cst: string; // 01-99
  regime: COFINSRegime;
  aliquota?: Aliquota;
}

/**
 * Calculator: COFINS (Contribuição para o Financiamento da Seguridade Social)
 * 
 * Alíquotas padrão:
 * - Regime Cumulativo: 3%
 * - Regime Não Cumulativo: 7,6%
 * 
 * Base legal: Lei 10.833/2003
 */
export class COFINSCalculator {
  /**
   * Alíquotas padrão
   */
  private static readonly ALIQUOTA_CUMULATIVO = 3.0;
  private static readonly ALIQUOTA_NAO_CUMULATIVO = 7.6;

  /**
   * Calcula COFINS
   */
  calculate(params: COFINSCalculationParams): Result<TaxAmount, string> {
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
      return Result.ok(TaxAmount.zero(baseCalculo));
    }

    // Determinar alíquota
    let aliquota: Aliquota;
    
    if (params.aliquota) {
      aliquota = params.aliquota;
    } else {
      // Usar alíquota padrão conforme regime
      const defaultRate = params.regime === 'CUMULATIVO'
        ? COFINSCalculator.ALIQUOTA_CUMULATIVO
        : COFINSCalculator.ALIQUOTA_NAO_CUMULATIVO;
      
      const aliquotaResult = Aliquota.fromPercentage(defaultRate);
      if (Result.isFail(aliquotaResult)) {
        return Result.fail(aliquotaResult.error);
      }
      aliquota = aliquotaResult.value;
    }

    // Calcular COFINS
    return TaxAmount.calculate(baseCalculo, aliquota);
  }

  /**
   * Retorna alíquota padrão para regime
   * 
   * ⚠️ S1.3: Agora retorna Result<Aliquota, string> ao invés de throw (DOMAIN-SVC-004)
   */
  static getDefaultRate(regime: COFINSRegime): Result<Aliquota, string> {
    const rate = regime === 'CUMULATIVO'
      ? COFINSCalculator.ALIQUOTA_CUMULATIVO
      : COFINSCalculator.ALIQUOTA_NAO_CUMULATIVO;
    
    return Aliquota.fromPercentage(rate);
  }
}

