import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { Aliquota, BaseCalculo, TaxAmount } from '../value-objects';
import { MissingTaxParametersError } from '../errors';

/**
 * Parâmetros para cálculo de IPI
 */
export interface IPICalculationParams {
  baseValue: Money;
  cstIPI: string; // 00-99
  aliquota?: Aliquota;
  isento: boolean;
}

/**
 * Calculator: IPI (Imposto sobre Produtos Industrializados)
 * 
 * Aplicável para:
 * - Produtos industrializados
 * - Importação
 * 
 * Não aplicável para:
 * - Produtos primários
 * - Serviços
 */
export class IPICalculator {
  /**
   * Calcula IPI
   */
  calculate(params: IPICalculationParams): Result<TaxAmount, string> {
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

    // Isento
    if (params.isento || !params.aliquota || params.aliquota.isZero) {
      return Result.ok(TaxAmount.zero(baseCalculo));
    }

    // Alíquota obrigatória para tributado
    if (!params.aliquota) {
      return Result.fail(new MissingTaxParametersError(['aliquota']).message);
    }

    // Calcular IPI
    return TaxAmount.calculate(baseCalculo, params.aliquota);
  }
}

