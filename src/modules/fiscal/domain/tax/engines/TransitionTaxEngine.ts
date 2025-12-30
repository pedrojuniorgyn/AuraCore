import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { ITaxEngine, TaxCalculationResult } from './ITaxEngine';
import { CurrentTaxEngine } from './CurrentTaxEngine';
import {
  ICMSCalculationParams,
  ICMSCalculationResult,
  IPICalculationParams,
  PISCalculationParams,
  COFINSCalculationParams,
  ISSCalculationParams,
} from '../calculators';
import { IBSCalculator, IBSCalculationParams, IBSCalculationResult } from '../calculators/IBSCalculator';
import { CBSCalculator, CBSCalculationParams, CBSCalculationResult } from '../calculators/CBSCalculator';
import { TaxAmount, AliquotaIBS, AliquotaCBS } from '../value-objects';

/**
 * Alíquotas do período de transição por ano
 */
export interface TransitionRates {
  year: number;
  currentMultiplier: number; // Multiplicador para impostos atuais (ICMS/ISS/PIS/COFINS)
  ibsRate: number; // Alíquota IBS (percentual)
  cbsRate: number; // Alíquota CBS (percentual)
}

/**
 * Resultado do cálculo no período de transição
 */
export interface TransitionTaxCalculationResult extends TaxCalculationResult {
  // Impostos atuais (gradualmente reduzidos)
  currentTaxes?: {
    icms?: ICMSCalculationResult;
    ipi?: TaxAmount;
    pis?: TaxAmount;
    cofins?: TaxAmount;
    iss?: TaxAmount;
    totalCurrent: Money;
    appliedMultiplier: number;
  };
  
  // Novos impostos (gradualmente aumentados)
  newTaxes?: {
    ibs?: IBSCalculationResult;
    cbs?: CBSCalculationResult;
    totalNew: Money;
  };
  
  // Compensação aplicada (se houver)
  compensation?: Money;
  
  // Ano de referência e alíquotas aplicadas
  transitionYear: number;
  appliedRates: TransitionRates;
}

/**
 * Transition Tax Engine
 * 
 * Implementa o sistema tributário brasileiro no período de transição (2026-2032).
 * 
 * Características do período de transição:
 * - 2026: PIS/COFINS substituídos por CBS (0,9%), ICMS/ISS mantidos (100%), IBS teste (0,1%)
 * - 2027: PIS/COFINS extintos, CBS alíquota cheia (8,8%), IBS teste (0,1%)
 * - 2029-2032: Redução gradual de ICMS/ISS e aumento de IBS
 * - 2033: Sistema completamente novo (IBS/CBS/IS)
 * 
 * Cronograma oficial (LC 214/2025):
 * - 2026: ICMS/ISS 100%, CBS 0,9%, IBS 0,1%
 * - 2027: ICMS/ISS 100%, CBS 8,8%, IBS 0,1%
 * - 2029: ICMS/ISS 90%, CBS 8,8%, IBS 1,77% (10%)
 * - 2030: ICMS/ISS 80%, CBS 8,8%, IBS 3,54% (20%)
 * - 2031: ICMS/ISS 60%, CBS 8,8%, IBS 7,08% (40%)
 * - 2032: ICMS/ISS 40%, CBS 8,8%, IBS 10,62% (60%)
 * - 2033: ICMS/ISS extintos, CBS 8,8%, IBS 17,7% (100%)
 * 
 * Base Legal: LC 214/2025 (Reforma Tributária)
 */
export class TransitionTaxEngine implements ITaxEngine {
  private currentEngine: CurrentTaxEngine;
  private ibsCalculator: IBSCalculator;
  private cbsCalculator: CBSCalculator;

  constructor() {
    this.currentEngine = new CurrentTaxEngine();
    this.ibsCalculator = new IBSCalculator();
    this.cbsCalculator = new CBSCalculator();
  }

  /**
   * Calcula ICMS (com multiplicador de transição)
   */
  calculateICMS(params: ICMSCalculationParams): Result<ICMSCalculationResult, string> {
    return this.currentEngine.calculateICMS(params);
  }

  /**
   * Calcula IPI (mantido no período de transição)
   */
  calculateIPI(params: IPICalculationParams): Result<TaxAmount, string> {
    return this.currentEngine.calculateIPI(params);
  }

  /**
   * Calcula PIS (extinto em 2027, antes disso calculado com multiplicador)
   */
  calculatePIS(params: PISCalculationParams): Result<TaxAmount, string> {
    return this.currentEngine.calculatePIS(params);
  }

  /**
   * Calcula COFINS (extinto em 2027, antes disso calculado com multiplicador)
   */
  calculateCOFINS(params: COFINSCalculationParams): Result<TaxAmount, string> {
    return this.currentEngine.calculateCOFINS(params);
  }

  /**
   * Calcula ISS (com multiplicador de transição)
   */
  calculateISS(params: ISSCalculationParams): Result<TaxAmount, string> {
    return this.currentEngine.calculateISS(params);
  }

  /**
   * Calcula IBS (novo imposto)
   */
  calculateIBSTransition(params: IBSCalculationParams): Result<IBSCalculationResult, string> {
    return this.ibsCalculator.calculate(params);
  }

  /**
   * Calcula CBS (substitui PIS/COFINS)
   */
  calculateCBSTransition(params: CBSCalculationParams): Result<CBSCalculationResult, string> {
    return this.cbsCalculator.calculate(params);
  }

  /**
   * Calcula todos os impostos no período de transição
   */
  calculateAll(params: unknown): Result<TransitionTaxCalculationResult, string> {
    const typedParams = params as {
      // Ano de referência
      year: number;
      
      // Parâmetros para impostos atuais
      icms?: ICMSCalculationParams;
      ipi?: IPICalculationParams;
      pis?: PISCalculationParams;
      cofins?: COFINSCalculationParams;
      iss?: ISSCalculationParams;
      
      // Parâmetros para novos impostos
      ibs?: IBSCalculationParams;
      cbs?: CBSCalculationParams;
    };

    // Obter alíquotas do período de transição
    const transitionRates = this.getTransitionRates(typedParams.year);

    // Inicializar resultado com Money zero
    const zeroMoneyResult = Money.create(0);
    if (Result.isFail(zeroMoneyResult)) {
      return Result.fail('Failed to create zero Money for initial total');
    }
    let totalTaxes = zeroMoneyResult.value;

    // Calcular impostos atuais (se aplicável)
    let currentTaxes:
      | {
          icms?: ICMSCalculationResult;
          ipi?: TaxAmount;
          pis?: TaxAmount;
          cofins?: TaxAmount;
          iss?: TaxAmount;
          totalCurrent: Money;
          appliedMultiplier: number;
        }
      | undefined;

    if (transitionRates.currentMultiplier > 0) {
      let currentTotal = zeroMoneyResult.value;
      const current: {
        icms?: ICMSCalculationResult;
        ipi?: TaxAmount;
        pis?: TaxAmount;
        cofins?: TaxAmount;
        iss?: TaxAmount;
      } = {};

      // ICMS
      if (typedParams.icms) {
        const icmsResult = this.calculateICMS(typedParams.icms);
        if (Result.isOk(icmsResult)) {
          current.icms = icmsResult.value;
          
          // Aplicar multiplicador
          const icmsAdjusted = icmsResult.value.totalICMS.amount * transitionRates.currentMultiplier;
          const icmsAdjustedMoney = Money.create(icmsAdjusted, icmsResult.value.totalICMS.currency);
          
          if (Result.isOk(icmsAdjustedMoney)) {
            const addResult = currentTotal.add(icmsAdjustedMoney.value);
            if (Result.isOk(addResult)) {
              currentTotal = addResult.value;
            }
          }
        }
      }

      // IPI (sem multiplicador - mantido integralmente)
      if (typedParams.ipi) {
        const ipiResult = this.calculateIPI(typedParams.ipi);
        if (Result.isOk(ipiResult)) {
          current.ipi = ipiResult.value;
          const addResult = currentTotal.add(ipiResult.value.value);
          if (Result.isOk(addResult)) {
            currentTotal = addResult.value;
          }
        }
      }

      // PIS (apenas até 2026)
      if (typedParams.pis && transitionRates.year <= 2026) {
        const pisResult = this.calculatePIS(typedParams.pis);
        if (Result.isOk(pisResult)) {
          current.pis = pisResult.value;
          
          // Aplicar multiplicador
          const pisAdjusted = pisResult.value.value.amount * transitionRates.currentMultiplier;
          const pisAdjustedMoney = Money.create(pisAdjusted, pisResult.value.value.currency);
          
          if (Result.isOk(pisAdjustedMoney)) {
            const addResult = currentTotal.add(pisAdjustedMoney.value);
            if (Result.isOk(addResult)) {
              currentTotal = addResult.value;
            }
          }
        }
      }

      // COFINS (apenas até 2026)
      if (typedParams.cofins && transitionRates.year <= 2026) {
        const cofinsResult = this.calculateCOFINS(typedParams.cofins);
        if (Result.isOk(cofinsResult)) {
          current.cofins = cofinsResult.value;
          
          // Aplicar multiplicador
          const cofinsAdjusted = cofinsResult.value.value.amount * transitionRates.currentMultiplier;
          const cofinsAdjustedMoney = Money.create(cofinsAdjusted, cofinsResult.value.value.currency);
          
          if (Result.isOk(cofinsAdjustedMoney)) {
            const addResult = currentTotal.add(cofinsAdjustedMoney.value);
            if (Result.isOk(addResult)) {
              currentTotal = addResult.value;
            }
          }
        }
      }

      // ISS
      if (typedParams.iss) {
        const issResult = this.calculateISS(typedParams.iss);
        if (Result.isOk(issResult)) {
          current.iss = issResult.value;
          
          // Aplicar multiplicador
          const issAdjusted = issResult.value.value.amount * transitionRates.currentMultiplier;
          const issAdjustedMoney = Money.create(issAdjusted, issResult.value.value.currency);
          
          if (Result.isOk(issAdjustedMoney)) {
            const addResult = currentTotal.add(issAdjustedMoney.value);
            if (Result.isOk(addResult)) {
              currentTotal = addResult.value;
            }
          }
        }
      }

      currentTaxes = {
        ...current,
        totalCurrent: currentTotal,
        appliedMultiplier: transitionRates.currentMultiplier,
      };

      // Adicionar ao total
      const addResult = totalTaxes.add(currentTotal);
      if (Result.isOk(addResult)) {
        totalTaxes = addResult.value;
      }
    }

    // Calcular novos impostos
    let newTaxes:
      | {
          ibs?: IBSCalculationResult;
          cbs?: CBSCalculationResult;
          totalNew: Money;
        }
      | undefined;

    let newTotal = zeroMoneyResult.value;
    const newTax: {
      ibs?: IBSCalculationResult;
      cbs?: CBSCalculationResult;
    } = {};

    // IBS
    if (typedParams.ibs) {
      const ibsResult = this.calculateIBSTransition(typedParams.ibs);
      if (Result.isOk(ibsResult)) {
        newTax.ibs = ibsResult.value;
        const addResult = newTotal.add(ibsResult.value.totalIBS);
        if (Result.isOk(addResult)) {
          newTotal = addResult.value;
        }
      }
    }

    // CBS
    if (typedParams.cbs) {
      const cbsResult = this.calculateCBSTransition(typedParams.cbs);
      if (Result.isOk(cbsResult)) {
        newTax.cbs = cbsResult.value;
        const addResult = newTotal.add(cbsResult.value.cbsValue.value);
        if (Result.isOk(addResult)) {
          newTotal = addResult.value;
        }
      }
    }

    newTaxes = {
      ...newTax,
      totalNew: newTotal,
    };

    // Adicionar ao total
    const addNewResult = totalTaxes.add(newTotal);
    if (Result.isOk(addNewResult)) {
      totalTaxes = addNewResult.value;
    }

    return Result.ok({
      currentTaxes,
      newTaxes,
      totalTaxes,
      transitionYear: typedParams.year,
      appliedRates: transitionRates,
    });
  }

  /**
   * Retorna as alíquotas do período de transição para um ano específico
   * 
   * Cronograma oficial:
   * - 2026: ICMS/ISS 100%, PIS/COFINS 100%, CBS 0,9%, IBS 0,1%
   * - 2027: ICMS/ISS 100%, PIS/COFINS 0%, CBS 8,8%, IBS 0,1%
   * - 2029: ICMS/ISS 90%, CBS 8,8%, IBS 1,77%
   * - 2030: ICMS/ISS 80%, CBS 8,8%, IBS 3,54%
   * - 2031: ICMS/ISS 60%, CBS 8,8%, IBS 7,08%
   * - 2032: ICMS/ISS 40%, CBS 8,8%, IBS 10,62%
   * - 2033+: ICMS/ISS 0%, CBS 8,8%, IBS 17,7%
   */
  public getTransitionRates(year: number): TransitionRates {
    const schedule: Record<number, TransitionRates> = {
      2026: {
        year: 2026,
        currentMultiplier: 1.0, // 100% tributos atuais
        ibsRate: 0.1, // 0,1% IBS (teste)
        cbsRate: 0.9, // 0,9% CBS (teste)
      },
      2027: {
        year: 2027,
        currentMultiplier: 0.0, // PIS/COFINS extintos (ICMS/ISS mantidos 100%)
        ibsRate: 0.1, // IBS ainda em teste
        cbsRate: 8.8, // CBS alíquota cheia
      },
      2028: {
        year: 2028,
        currentMultiplier: 1.0, // ICMS/ISS 100%
        ibsRate: 0.1, // IBS teste
        cbsRate: 8.8, // CBS alíquota cheia
      },
      2029: {
        year: 2029,
        currentMultiplier: 0.9, // ICMS/ISS 90%
        ibsRate: 1.77, // IBS 10%
        cbsRate: 8.8,
      },
      2030: {
        year: 2030,
        currentMultiplier: 0.8, // ICMS/ISS 80%
        ibsRate: 3.54, // IBS 20%
        cbsRate: 8.8,
      },
      2031: {
        year: 2031,
        currentMultiplier: 0.6, // ICMS/ISS 60%
        ibsRate: 7.08, // IBS 40%
        cbsRate: 8.8,
      },
      2032: {
        year: 2032,
        currentMultiplier: 0.4, // ICMS/ISS 40%
        ibsRate: 10.62, // IBS 60%
        cbsRate: 8.8,
      },
      2033: {
        year: 2033,
        currentMultiplier: 0.0, // ICMS/ISS extintos
        ibsRate: 17.7, // IBS 100%
        cbsRate: 8.8,
      },
    };

    // Retornar alíquotas do ano, ou default 2026 se ano não encontrado
    return schedule[year] || schedule[2026];
  }

  /**
   * Verifica se um ano está no período de transição
   */
  public static isTransitionPeriod(year: number): boolean {
    return year >= 2026 && year <= 2032;
  }

  /**
   * Verifica se PIS/COFINS ainda são aplicáveis em um ano
   */
  public static isPISCOFINSApplicable(year: number): boolean {
    return year <= 2026;
  }

  /**
   * Verifica se CBS é aplicável em um ano
   */
  public static isCBSApplicable(year: number): boolean {
    return year >= 2026;
  }

  /**
   * Verifica se IBS é aplicável em um ano
   */
  public static isIBSApplicable(year: number): boolean {
    return year >= 2026;
  }
}
