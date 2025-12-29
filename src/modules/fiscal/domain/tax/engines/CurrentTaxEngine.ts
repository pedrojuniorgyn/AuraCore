import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { ITaxEngine, TaxCalculationResult } from './ITaxEngine';
import {
  ICMSCalculator,
  IPICalculator,
  PISCalculator,
  COFINSCalculator,
  ISSCalculator,
  ICMSCalculationParams,
  ICMSCalculationResult,
  IPICalculationParams,
  PISCalculationParams,
  COFINSCalculationParams,
  ISSCalculationParams,
} from '../calculators';
import { TaxAmount } from '../value-objects';

/**
 * Current Tax Engine
 * 
 * Implementa o sistema tributário brasileiro atual (até 2025):
 * - ICMS (estadual)
 * - ISS (municipal)
 * - IPI (federal)
 * - PIS (federal)
 * - COFINS (federal)
 * 
 * Este engine será substituído pelo TransitionTaxEngine em 2026
 * e pelo NewTaxEngine em 2033.
 */
export class CurrentTaxEngine implements ITaxEngine {
  private readonly icmsCalculator: ICMSCalculator;
  private readonly ipiCalculator: IPICalculator;
  private readonly pisCalculator: PISCalculator;
  private readonly cofinsCalculator: COFINSCalculator;
  private readonly issCalculator: ISSCalculator;

  constructor() {
    this.icmsCalculator = new ICMSCalculator();
    this.ipiCalculator = new IPICalculator();
    this.pisCalculator = new PISCalculator();
    this.cofinsCalculator = new COFINSCalculator();
    this.issCalculator = new ISSCalculator();
  }

  /**
   * Calcula ICMS
   */
  calculateICMS(params: ICMSCalculationParams): Result<ICMSCalculationResult, string> {
    return this.icmsCalculator.calculate(params);
  }

  /**
   * Calcula IPI
   */
  calculateIPI(params: IPICalculationParams): Result<TaxAmount, string> {
    return this.ipiCalculator.calculate(params);
  }

  /**
   * Calcula PIS
   */
  calculatePIS(params: PISCalculationParams): Result<TaxAmount, string> {
    return this.pisCalculator.calculate(params);
  }

  /**
   * Calcula COFINS
   */
  calculateCOFINS(params: COFINSCalculationParams): Result<TaxAmount, string> {
    return this.cofinsCalculator.calculate(params);
  }

  /**
   * Calcula ISS
   */
  calculateISS(params: ISSCalculationParams): Result<TaxAmount, string> {
    return this.issCalculator.calculate(params);
  }

  /**
   * Calcula todos os impostos
   * 
   * Nota: Este método recebe `unknown` como parâmetro conforme interface ITaxEngine.
   * Na prática, cada engine define sua própria estrutura de entrada.
   * Para CurrentTaxEngine, espera-se um objeto com os parâmetros de cada imposto.
   */
  calculateAll(params: unknown): Result<TaxCalculationResult, string> {
    // Por enquanto, retorna apenas uma estrutura básica
    // Este método será implementado completamente quando tivermos
    // a integração com FiscalDocument em semanas futuras

    const typedParams = params as {
      icms?: ICMSCalculationParams;
      ipi?: IPICalculationParams;
      pis?: PISCalculationParams;
      cofins?: COFINSCalculationParams;
      iss?: ISSCalculationParams;
    };

    // Criar Money zero de forma segura
    const zeroMoneyResult = Money.create(0);
    if (Result.isFail(zeroMoneyResult)) {
      return Result.fail('Failed to create zero Money for initial total');
    }

    const result: TaxCalculationResult = {
      totalTaxes: zeroMoneyResult.value,
    };

    // Calcular ICMS se fornecido
    if (typedParams.icms) {
      const icmsResult = this.calculateICMS(typedParams.icms);
      if (Result.isOk(icmsResult)) {
        result.icms = icmsResult.value;
      }
    }

    // Calcular IPI se fornecido
    if (typedParams.ipi) {
      const ipiResult = this.calculateIPI(typedParams.ipi);
      if (Result.isOk(ipiResult)) {
        result.ipi = ipiResult.value;
      }
    }

    // Calcular PIS se fornecido
    if (typedParams.pis) {
      const pisResult = this.calculatePIS(typedParams.pis);
      if (Result.isOk(pisResult)) {
        result.pis = pisResult.value;
      }
    }

    // Calcular COFINS se fornecido
    if (typedParams.cofins) {
      const cofinsResult = this.calculateCOFINS(typedParams.cofins);
      if (Result.isOk(cofinsResult)) {
        result.cofins = cofinsResult.value;
      }
    }

    // Calcular ISS se fornecido
    if (typedParams.iss) {
      const issResult = this.calculateISS(typedParams.iss);
      if (Result.isOk(issResult)) {
        result.iss = issResult.value;
      }
    }

    // Calcular total
    let total = Money.create(0);
    if (Result.isFail(total)) {
      return Result.fail('Failed to create zero Money for total');
    }

    let totalMoney = total.value;

    if (result.icms) {
      const addResult = totalMoney.add(result.icms.totalICMS);
      if (Result.isOk(addResult)) {
        totalMoney = addResult.value;
      }
    }

    if (result.ipi) {
      const addResult = totalMoney.add(result.ipi.value);
      if (Result.isOk(addResult)) {
        totalMoney = addResult.value;
      }
    }

    if (result.pis) {
      const addResult = totalMoney.add(result.pis.value);
      if (Result.isOk(addResult)) {
        totalMoney = addResult.value;
      }
    }

    if (result.cofins) {
      const addResult = totalMoney.add(result.cofins.value);
      if (Result.isOk(addResult)) {
        totalMoney = addResult.value;
      }
    }

    if (result.iss) {
      const addResult = totalMoney.add(result.iss.value);
      if (Result.isOk(addResult)) {
        totalMoney = addResult.value;
      }
    }

    result.totalTaxes = totalMoney;

    return Result.ok(result);
  }
}

