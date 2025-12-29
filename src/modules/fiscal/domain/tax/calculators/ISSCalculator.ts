import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { Aliquota, BaseCalculo, TaxAmount } from '../value-objects';
import { MissingTaxParametersError, InvalidServiceCodeError } from '../errors';

/**
 * Parâmetros para cálculo de ISS
 */
export interface ISSCalculationParams {
  baseValue: Money;
  aliquota: Aliquota; // 2% a 5%
  municipalityCode: string; // Código IBGE do município
  serviceCode: string; // Código do serviço (LC 116/2003)
  retainISS: boolean; // Retenção na fonte
}

/**
 * Calculator: ISS (Imposto sobre Serviços)
 * 
 * Aplicável para:
 * - Serviços (definidos na LC 116/2003)
 * - CT-e (transporte)
 * - NFS-e (serviços diversos)
 * 
 * Alíquotas:
 * - Mínima: 2%
 * - Máxima: 5%
 * - Definida por cada município
 * 
 * Base legal: LC 116/2003
 */
export class ISSCalculator {
  /**
   * Alíquota mínima permitida
   */
  private static readonly ALIQUOTA_MINIMA = 2.0;

  /**
   * Alíquota máxima permitida
   */
  private static readonly ALIQUOTA_MAXIMA = 5.0;

  /**
   * Calcula ISS
   */
  calculate(params: ISSCalculationParams): Result<TaxAmount, string> {
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

    // Validar alíquota
    if (params.aliquota.percentual < ISSCalculator.ALIQUOTA_MINIMA) {
      return Result.fail(`ISS aliquota cannot be less than ${ISSCalculator.ALIQUOTA_MINIMA}%`);
    }

    if (params.aliquota.percentual > ISSCalculator.ALIQUOTA_MAXIMA) {
      return Result.fail(`ISS aliquota cannot exceed ${ISSCalculator.ALIQUOTA_MAXIMA}%`);
    }

    // Calcular ISS
    return TaxAmount.calculate(baseCalculo, params.aliquota);
  }

  /**
   * Valida parâmetros obrigatórios
   */
  private validateParams(params: ISSCalculationParams): Result<void, string> {
    const missing: string[] = [];

    if (params.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    if (!params.municipalityCode || params.municipalityCode.length !== 7) {
      return Result.fail('Municipality code must be a valid 7-digit IBGE code');
    }

    if (!params.serviceCode) {
      missing.push('serviceCode');
    }

    // Validar formato do código de serviço (XX.YY)
    const serviceCodePattern = /^\d{1,2}\.\d{2}$/;
    if (params.serviceCode && !serviceCodePattern.test(params.serviceCode)) {
      return Result.fail(new InvalidServiceCodeError(params.serviceCode).message);
    }

    if (missing.length > 0) {
      return Result.fail(new MissingTaxParametersError(missing).message);
    }

    return Result.ok(undefined);
  }

  /**
   * Verifica se código de serviço é válido (LC 116/2003)
   * 
   * Códigos principais:
   * 01 - Análise e desenvolvimento de sistemas
   * 02 - Programação
   * ...
   * 16 - Serviços de transporte
   */
  static isValidServiceCode(serviceCode: string): boolean {
    const pattern = /^\d{1,2}\.\d{2}$/;
    return pattern.test(serviceCode);
  }

  /**
   * Retorna código de serviço para transporte rodoviário
   */
  static getTransportServiceCode(): string {
    return '16.01'; // Serviços de transporte de natureza municipal
  }
}

