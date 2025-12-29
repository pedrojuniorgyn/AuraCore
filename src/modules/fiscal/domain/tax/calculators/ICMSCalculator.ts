import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { CST, CSOSN, Aliquota, BaseCalculo, TaxAmount } from '../value-objects';
import { InvalidTaxCalculationError, MissingTaxParametersError } from '../errors';

/**
 * Tipo de regime tributário para ICMS
 */
export type ICMSTaxRegime = 'NORMAL' | 'SIMPLES_NACIONAL';

/**
 * Tipo de operação
 */
export type OperationType = 'ENTRY' | 'EXIT';

/**
 * Parâmetros para cálculo de ICMS
 */
export interface ICMSCalculationParams {
  regime: ICMSTaxRegime;
  operationType: OperationType;
  baseValue: Money;
  cst?: CST;
  csosn?: CSOSN;
  aliquota?: Aliquota;
  reductionRate?: Aliquota;
  
  // Substituição tributária
  aliquotaST?: Aliquota;
  mva?: number; // Margem Valor Agregado (%)
  
  // Crédito de ICMS (Simples Nacional)
  creditAliquota?: Aliquota;
  
  // UFs para operação interestadual
  isInterstate: boolean;
  originUF?: string;
  destinationUF?: string;
}

/**
 * Resultado do cálculo de ICMS
 */
export interface ICMSCalculationResult {
  // ICMS Normal
  baseCalculo: BaseCalculo;
  aliquota: Aliquota;
  valor: TaxAmount;
  
  // Substituição Tributária (se aplicável)
  baseCalculoST?: BaseCalculo;
  aliquotaST?: Aliquota;
  valorST?: TaxAmount;
  
  // Crédito (Simples Nacional)
  creditValue?: TaxAmount;
  
  // Totais
  totalICMS: Money;
}

/**
 * Calculator: ICMS (Imposto sobre Circulação de Mercadorias e Serviços)
 * 
 * Implementa cálculo de ICMS conforme legislação brasileira:
 * - Regime Normal: CST 00, 10, 20, 30, 40, 41, 50, 51, 60, 70, 90
 * - Simples Nacional: CSOSN 101, 102, 103, 201, 202, 203, 300, 400, 500, 900
 * - Substituição Tributária
 * - Redução de Base de Cálculo
 * - Crédito de ICMS
 */
export class ICMSCalculator {
  /**
   * Calcula ICMS
   */
  calculate(params: ICMSCalculationParams): Result<ICMSCalculationResult, string> {
    // Validar parâmetros
    const validationResult = this.validateParams(params);
    if (Result.isFail(validationResult)) {
      return validationResult;
    }

    // Calcular conforme regime
    if (params.regime === 'SIMPLES_NACIONAL') {
      return this.calculateSimplesNacional(params);
    } else {
      return this.calculateRegimeNormal(params);
    }
  }

  /**
   * Valida parâmetros obrigatórios
   */
  private validateParams(params: ICMSCalculationParams): Result<void, string> {
    const missing: string[] = [];

    if (params.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    if (params.regime === 'SIMPLES_NACIONAL' && !params.csosn) {
      missing.push('csosn');
    }

    if (params.regime === 'NORMAL' && !params.cst) {
      missing.push('cst');
    }

    if (params.isInterstate && (!params.originUF || !params.destinationUF)) {
      missing.push('originUF', 'destinationUF');
    }

    if (missing.length > 0) {
      return Result.fail(new MissingTaxParametersError(missing).message);
    }

    return Result.ok(undefined);
  }

  /**
   * Calcula ICMS - Regime Normal
   */
  private calculateRegimeNormal(params: ICMSCalculationParams): Result<ICMSCalculationResult, string> {
    const cst = params.cst;
    if (!cst) {
      return Result.fail('CST is required for regime normal');
    }

    // Isento ou não tributado
    if (cst.isento) {
      return this.createZeroResult(params.baseValue);
    }

    // Diferido (não calcula ICMS agora)
    if (cst.isDiferido) {
      return this.createZeroResult(params.baseValue);
    }

    // Tributação normal
    if (!params.aliquota) {
      return Result.fail('Aliquota is required for taxed operations');
    }

    // Criar base de cálculo (com ou sem redução)
    const baseCalculoResult = params.reductionRate
      ? BaseCalculo.createWithReduction(params.baseValue, params.reductionRate)
      : BaseCalculo.create(params.baseValue);

    if (Result.isFail(baseCalculoResult)) {
      return Result.fail(baseCalculoResult.error);
    }

    const baseCalculo = baseCalculoResult.value;

    // Calcular ICMS
    const valorResult = TaxAmount.calculate(baseCalculo, params.aliquota);
    if (Result.isFail(valorResult)) {
      return Result.fail(valorResult.error);
    }

    const valor = valorResult.value;
    let totalICMS = valor.value;

    // Substituição tributária (CST 10, 30, 70)
    let baseCalculoST: BaseCalculo | undefined;
    let aliquotaST: Aliquota | undefined;
    let valorST: TaxAmount | undefined;

    if (cst.hasSubstituicao && params.aliquotaST && params.mva) {
      const stResult = this.calculateST(params.baseValue, params.aliquotaST, params.mva);
      if (Result.isOk(stResult)) {
        baseCalculoST = stResult.value.baseCalculoST;
        aliquotaST = stResult.value.aliquotaST;
        valorST = stResult.value.valorST;
        
        const addResult = totalICMS.add(valorST.value);
        if (Result.isOk(addResult)) {
          totalICMS = addResult.value;
        }
      }
    }

    return Result.ok({
      baseCalculo,
      aliquota: params.aliquota,
      valor,
      baseCalculoST,
      aliquotaST,
      valorST,
      totalICMS,
    });
  }

  /**
   * Calcula ICMS - Simples Nacional
   */
  private calculateSimplesNacional(params: ICMSCalculationParams): Result<ICMSCalculationResult, string> {
    const csosn = params.csosn;
    if (!csosn) {
      return Result.fail('CSOSN is required for Simples Nacional');
    }

    // Isento
    if (csosn.isento) {
      return this.createZeroResult(params.baseValue);
    }

    // Sem crédito (CSOSN 102, 202, 300, 400, 500, 900)
    if (!csosn.permiteCreditoICMS) {
      return this.createZeroResult(params.baseValue);
    }

    // Com crédito (CSOSN 101, 201)
    if (!params.creditAliquota) {
      return Result.fail('Credit aliquota is required for CSOSN 101/201');
    }

    const baseCalculoResult = BaseCalculo.create(params.baseValue);
    if (Result.isFail(baseCalculoResult)) {
      return Result.fail(baseCalculoResult.error);
    }

    const baseCalculo = baseCalculoResult.value;

    const creditValueResult = TaxAmount.calculate(baseCalculo, params.creditAliquota);
    if (Result.isFail(creditValueResult)) {
      return Result.fail(creditValueResult.error);
    }

    const creditValue = creditValueResult.value;

    return Result.ok({
      baseCalculo,
      aliquota: params.creditAliquota,
      valor: TaxAmount.zero(baseCalculo),
      creditValue,
      totalICMS: creditValue.value,
    });
  }

  /**
   * Calcula ICMS Substituição Tributária
   */
  private calculateST(
    baseValue: Money,
    aliquotaST: Aliquota,
    mva: number
  ): Result<{
    baseCalculoST: BaseCalculo;
    aliquotaST: Aliquota;
    valorST: TaxAmount;
  }, string> {
    // Base ST = Base * (1 + MVA)
    const baseSTAmount = baseValue.amount * (1 + mva / 100);
    const baseSTMoneyResult = Money.create(baseSTAmount, baseValue.currency);

    if (Result.isFail(baseSTMoneyResult)) {
      return Result.fail(baseSTMoneyResult.error);
    }

    const baseCalculoSTResult = BaseCalculo.create(baseSTMoneyResult.value);
    if (Result.isFail(baseCalculoSTResult)) {
      return Result.fail(baseCalculoSTResult.error);
    }

    const baseCalculoST = baseCalculoSTResult.value;

    const valorSTResult = TaxAmount.calculate(baseCalculoST, aliquotaST);
    if (Result.isFail(valorSTResult)) {
      return Result.fail(valorSTResult.error);
    }

    const valorST = valorSTResult.value;

    return Result.ok({ baseCalculoST, aliquotaST, valorST });
  }

  /**
   * Cria resultado com valores zerados
   */
  private createZeroResult(baseValue: Money): Result<ICMSCalculationResult, string> {
    const baseCalculoResult = BaseCalculo.create(baseValue);
    if (Result.isFail(baseCalculoResult)) {
      return Result.fail(baseCalculoResult.error);
    }

    const baseCalculo = baseCalculoResult.value;
    const zeroAliquota = Aliquota.zero();
    const zeroValor = TaxAmount.zero(baseCalculo);
    const zeroMoney = Money.create(0, baseValue.currency);

    if (Result.isFail(zeroMoney)) {
      return Result.fail(zeroMoney.error);
    }

    return Result.ok({
      baseCalculo,
      aliquota: zeroAliquota,
      valor: zeroValor,
      totalICMS: zeroMoney.value,
    });
  }
}

