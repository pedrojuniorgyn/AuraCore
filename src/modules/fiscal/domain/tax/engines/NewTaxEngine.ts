import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { ITaxEngine, TaxCalculationResult } from './ITaxEngine';
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
import { ISCalculator, ISCalculationParams, ISCalculationResult } from '../calculators/ISCalculator';
import { TaxAmount, AliquotaIBS, AliquotaCBS } from '../value-objects';
import { IBSCBSGroup } from '../value-objects/IBSCBSGroup';
import { CSTIbsCbs } from '../value-objects/CSTIbsCbs';
import { ClassificacaoTributaria } from '../value-objects/ClassificacaoTributaria';

/**
 * Resultado do cálculo no novo sistema tributário
 */
export interface NewTaxCalculationResult extends TaxCalculationResult {
  // IBS (substitui ICMS + ISS)
  ibs?: IBSCalculationResult;
  
  // CBS (substitui PIS + COFINS)
  cbs?: CBSCalculationResult;
  
  // IS (Imposto Seletivo - para produtos específicos)
  is?: ISCalculationResult;
  
  // Grupo IBS/CBS completo (se aplicável)
  ibsCbsGroup?: IBSCBSGroup;
}

/**
 * New Tax Engine
 * 
 * Implementa o novo sistema tributário brasileiro (2033+).
 * 
 * Sistema completamente novo:
 * - IBS (Imposto sobre Bens e Serviços) - substitui ICMS + ISS
 * - CBS (Contribuição sobre Bens e Serviços) - substitui PIS + COFINS
 * - IS (Imposto Seletivo) - para produtos específicos
 * 
 * Características:
 * - IVA dual (IBS estadual/municipal + CBS federal)
 * - Não cumulatividade plena
 * - Base única de cálculo
 * - Destino da operação define competência
 * - Alíquotas:
 *   - IBS: 17,7% (estimativa, pode variar por UF/Município)
 *   - CBS: 8,8%
 *   - IS: variável por produto
 * 
 * Vantagens:
 * - Simplificação (2 impostos principais vs 5 atuais)
 * - Fim da guerra fiscal
 * - Crédito integral
 * - Transparência
 * 
 * Base Legal: LC 214/2025 (Reforma Tributária)
 * Vigência: A partir de 1º/01/2033
 */
export class NewTaxEngine implements ITaxEngine {
  private ibsCalculator: IBSCalculator;
  private cbsCalculator: CBSCalculator;
  private isCalculator: ISCalculator;

  constructor() {
    this.ibsCalculator = new IBSCalculator();
    this.cbsCalculator = new CBSCalculator();
    this.isCalculator = new ISCalculator();
  }

  /**
   * ICMS não existe no novo sistema (substituído por IBS)
   * Este método retorna erro pois ICMS foi extinto
   */
  calculateICMS(params: ICMSCalculationParams): Result<ICMSCalculationResult, string> {
    return Result.fail(
      'ICMS foi extinto em 2033 e substituído por IBS. Use calculateIBS() em vez disso.'
    );
  }

  /**
   * IPI é mantido no novo sistema (imposto sobre produtos industrializados)
   * Nota: Na prática, IPI pode ser incorporado ao IS para alguns produtos
   */
  calculateIPI(params: IPICalculationParams): Result<TaxAmount, string> {
    return Result.fail(
      'IPI foi extinto/incorporado ao IS em 2033. Use calculateIS() para produtos sujeitos a tributação seletiva.'
    );
  }

  /**
   * PIS não existe no novo sistema (substituído por CBS)
   */
  calculatePIS(params: PISCalculationParams): Result<TaxAmount, string> {
    return Result.fail(
      'PIS foi extinto em 2027 e substituído por CBS. Use calculateCBS() em vez disso.'
    );
  }

  /**
   * COFINS não existe no novo sistema (substituído por CBS)
   */
  calculateCOFINS(params: COFINSCalculationParams): Result<TaxAmount, string> {
    return Result.fail(
      'COFINS foi extinto em 2027 e substituído por CBS. Use calculateCBS() em vez disso.'
    );
  }

  /**
   * ISS não existe no novo sistema (substituído por IBS)
   */
  calculateISS(params: ISSCalculationParams): Result<TaxAmount, string> {
    return Result.fail(
      'ISS foi extinto em 2033 e substituído por IBS. Use calculateIBS() em vez disso.'
    );
  }

  /**
   * Calcula IBS (substitui ICMS + ISS)
   */
  calculateIBS(params: IBSCalculationParams): Result<IBSCalculationResult, string> {
    return this.ibsCalculator.calculate(params);
  }

  /**
   * Calcula CBS (substitui PIS + COFINS)
   */
  calculateCBS(params: CBSCalculationParams): Result<CBSCalculationResult, string> {
    return this.cbsCalculator.calculate(params);
  }

  /**
   * Calcula IS (Imposto Seletivo)
   */
  calculateIS(params: ISCalculationParams): Result<ISCalculationResult, string> {
    return this.isCalculator.calculate(params);
  }

  /**
   * Calcula todos os impostos no novo sistema tributário
   */
  calculateAll(params: unknown): Result<NewTaxCalculationResult, string> {
    const typedParams = params as {
      // Parâmetros para IBS
      ibs?: IBSCalculationParams;
      
      // Parâmetros para CBS
      cbs?: CBSCalculationParams;
      
      // Parâmetros para IS (opcional - apenas produtos específicos)
      is?: ISCalculationParams;
      
      // Opção para criar IBSCBSGroup (agrupamento para NFe)
      createGroup?: boolean;
      groupParams?: {
        cst: CSTIbsCbs;
        cClassTrib: ClassificacaoTributaria;
      };
    };

    // Inicializar resultado com Money zero
    const zeroMoneyResult = Money.create(0);
    if (Result.isFail(zeroMoneyResult)) {
      return Result.fail('Failed to create zero Money for initial total');
    }
    let totalTaxes = zeroMoneyResult.value;

    const result: NewTaxCalculationResult = {
      totalTaxes,
    };

    // Calcular IBS
    if (typedParams.ibs) {
      const ibsResult = this.calculateIBS(typedParams.ibs);
      if (Result.isFail(ibsResult)) {
        return Result.fail(`IBS calculation failed: ${ibsResult.error}`);
      }
      result.ibs = ibsResult.value;
      
      const addResult = totalTaxes.add(ibsResult.value.totalIBS);
      if (Result.isOk(addResult)) {
        totalTaxes = addResult.value;
      }
    }

    // Calcular CBS
    if (typedParams.cbs) {
      const cbsResult = this.calculateCBS(typedParams.cbs);
      if (Result.isFail(cbsResult)) {
        return Result.fail(`CBS calculation failed: ${cbsResult.error}`);
      }
      result.cbs = cbsResult.value;
      
      const addResult = totalTaxes.add(cbsResult.value.cbsValue.value);
      if (Result.isOk(addResult)) {
        totalTaxes = addResult.value;
      }
    }

    // Calcular IS (se aplicável)
    if (typedParams.is) {
      const isResult = this.calculateIS(typedParams.is);
      if (Result.isFail(isResult)) {
        return Result.fail(`IS calculation failed: ${isResult.error}`);
      }
      result.is = isResult.value;
      
      const addResult = totalTaxes.add(isResult.value.isValue.value);
      if (Result.isOk(addResult)) {
        totalTaxes = addResult.value;
      }
    }

    // Criar IBSCBSGroup se solicitado
    if (typedParams.createGroup && typedParams.groupParams && result.ibs && result.cbs) {
      const groupResult = this.createIBSCBSGroup(
        typedParams.groupParams.cst,
        typedParams.groupParams.cClassTrib,
        result.ibs,
        result.cbs
      );
      
      if (Result.isOk(groupResult)) {
        result.ibsCbsGroup = groupResult.value;
      }
    }

    result.totalTaxes = totalTaxes;

    return Result.ok(result);
  }

  /**
   * Cria um IBSCBSGroup a partir dos resultados de cálculo
   * Este método é útil para geração de NFe
   */
  private createIBSCBSGroup(
    cst: CSTIbsCbs,
    cClassTrib: ClassificacaoTributaria,
    ibsResult: IBSCalculationResult,
    cbsResult: CBSCalculationResult
  ): Result<IBSCBSGroup, string> {
    // Obter base de cálculo (deve ser a mesma para IBS e CBS)
    const baseValue = ibsResult.baseCalculo.value;

    return IBSCBSGroup.create({
      cst,
      cClassTrib,
      baseValue,
      ibsUfRate: ibsResult.ibsUfRate,
      ibsUfValue: ibsResult.ibsUfValue.value,
      ibsMunRate: ibsResult.ibsMunRate,
      ibsMunValue: ibsResult.ibsMunValue.value,
      cbsRate: cbsResult.cbsRate,
      cbsValue: cbsResult.cbsValue.value,
    });
  }

  /**
   * Verifica se um produto está sujeito ao IS
   */
  static isSubjectToIS(ncmCode: string): boolean {
    return ISCalculator.isSubjectToIS(ncmCode);
  }

  /**
   * Retorna as alíquotas padrão do novo sistema (2033+)
   * 
   * Nota: Na prática, estas alíquotas virão de um repositório
   * que consultará tabelas de UF/Município/Produto específicas
   */
  static getDefaultRates(): {
    ibsRate: number;
    cbsRate: number;
  } {
    return {
      ibsRate: 17.7, // 17,7% (alíquota padrão estimada)
      cbsRate: 8.8, // 8,8% (alíquota padrão)
    };
  }

  /**
   * Calcula alíquota combinada IBS + CBS
   * (Total de tributação sobre consumo)
   */
  static getCombinedRate(): number {
    const rates = NewTaxEngine.getDefaultRates();
    return rates.ibsRate + rates.cbsRate; // 26,5%
  }

  /**
   * Verifica se um ano está no período do novo sistema
   */
  static isNewSystem(year: number): boolean {
    return year >= 2033;
  }
}

