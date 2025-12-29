import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { Aliquota, BaseCalculo, TaxAmount } from '../value-objects';

/**
 * Parâmetros para cálculo de IS (Imposto Seletivo)
 */
export interface ISCalculationParams {
  // Base de cálculo
  baseValue: Money;
  
  // Alíquota IS (específica por produto)
  isRate: Aliquota;
  
  // NCM do produto (para auditoria)
  ncmCode: string;
  
  // Categoria do produto
  productCategory: string;
}

/**
 * Resultado do cálculo de IS
 */
export interface ISCalculationResult {
  // Base de cálculo
  baseCalculo: BaseCalculo;
  
  // IS
  isRate: Aliquota;
  isValue: TaxAmount;
  
  // Informações do produto
  ncmCode: string;
  productCategory: string;
}

/**
 * Calculator: IS (Imposto Seletivo)
 * 
 * Implementa cálculo do IS conforme LC 214/2025 (Reforma Tributária).
 * 
 * O IS incide sobre produtos específicos considerados nocivos à saúde
 * ou ao meio ambiente:
 * - Bebidas alcoólicas
 * - Cigarros e derivados do tabaco
 * - Veículos (conforme emissão de CO2)
 * - Bens minerais (minério de ferro, petróleo)
 * - Produtos com alto teor de açúcar
 * 
 * Características:
 * - Monofásico (uma única incidência na cadeia)
 * - Alíquota específica por produto/categoria
 * - Arrecadação federal
 * - Destinação: saúde e meio ambiente
 * 
 * Implementação em 2027 (após período de teste do IBS/CBS)
 * 
 * Base Legal: LC 214/2025, Art. 153-A CF
 */
export class ISCalculator {
  /**
   * Calcula IS
   */
  calculate(params: ISCalculationParams): Result<ISCalculationResult, string> {
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

    // Calcular IS
    const isValueResult = TaxAmount.calculate(baseCalculo, params.isRate);
    if (Result.isFail(isValueResult)) {
      return Result.fail(isValueResult.error);
    }
    const isValue = isValueResult.value;

    return Result.ok({
      baseCalculo,
      isRate: params.isRate,
      isValue,
      ncmCode: params.ncmCode,
      productCategory: params.productCategory,
    });
  }

  /**
   * Valida parâmetros obrigatórios
   */
  private validateParams(params: ISCalculationParams): Result<void, string> {
    if (params.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    if (!params.ncmCode || params.ncmCode.length !== 8) {
      return Result.fail('Valid NCM code (8 digits) is required');
    }

    if (!params.productCategory || params.productCategory.trim().length === 0) {
      return Result.fail('Product category is required');
    }

    return Result.ok(undefined);
  }

  /**
   * Verifica se produto está sujeito ao IS
   * 
   * @param ncmCode - Código NCM do produto
   * @returns true se sujeito ao IS, false caso contrário
   */
  static isSubjectToIS(ncmCode: string): boolean {
    // Categorias sujeitas ao IS (exemplos, lista completa virá do repositório)
    const subjectCategories = [
      // Bebidas alcoólicas (NCM 22.03 a 22.08)
      { start: '22030000', end: '22089999' },
      // Cigarros (NCM 24.02)
      { start: '24020000', end: '24029999' },
      // Veículos (NCM 87.03)
      { start: '87030000', end: '87039999' },
      // Minério de ferro (NCM 26.01)
      { start: '26010000', end: '26019999' },
      // Petróleo (NCM 27.09)
      { start: '27090000', end: '27099999' },
    ];

    return subjectCategories.some(
      (cat) => ncmCode >= cat.start && ncmCode <= cat.end
    );
  }
}

