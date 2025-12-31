import { Result, Money } from '@/shared/domain';
import { TaxEngineFactory, TaxEngineType } from '../tax/engines/TaxEngineFactory';
import { ITaxEngine } from '../tax/engines/ITaxEngine';

/**
 * Input para cálculo
 */
export interface CalculationInput {
  itemId: string;
  baseValue: Money;
  operationDate: Date;
  cfop: string;
  ncm: string;
  ufOrigem: string;
  ufDestino: string;
  municipioDestino?: string;
}

/**
 * Output de um cálculo
 */
export interface CalculationOutput {
  itemId: string;
  regime: TaxEngineType;
  baseValue: Money;
  ibsUf: { rate: number; value: Money };
  ibsMun: { rate: number; value: Money };
  cbs: { rate: number; value: Money };
  is?: { rate: number; value: Money };
}

/**
 * Tax Calculation Orchestrator (Domain Service)
 * 
 * Orquestra o cálculo de tributos IBS/CBS:
 * - Determina regime tributário (CURRENT/TRANSITION/NEW)
 * - Seleciona engine apropriada via Factory
 * - Executa cálculo
 * - Retorna resultado consolidado
 * 
 * Não persiste dados - apenas orquestra lógica de cálculo.
 */
export class TaxCalculationOrchestrator {
  private readonly taxEngineFactory: TaxEngineFactory;

  constructor() {
    this.taxEngineFactory = new TaxEngineFactory();
  }

  /**
   * Calcula IBS/CBS para um item
   */
  async calculate(input: CalculationInput): Promise<Result<CalculationOutput, string>> {
    // Validar input
    if (input.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    // Determinar regime tributário para a data
    const engineType = this.taxEngineFactory.determineEngineType(input.operationDate);
    const engine = this.taxEngineFactory.getEngineByType(engineType);

    // Executar cálculo
    const calculationResult = await this.calculateWithEngine(engine, engineType, input);
    if (Result.isFail(calculationResult)) {
      return Result.fail(calculationResult.error);
    }

    return Result.ok(calculationResult.value);
  }

  /**
   * Executa cálculo com o engine selecionado
   */
  private async calculateWithEngine(
    engine: ITaxEngine,
    engineType: TaxEngineType,
    input: CalculationInput
  ): Promise<Result<CalculationOutput, string>> {
    // Obter alíquotas do engine
    const year = input.operationDate.getFullYear();
    const rates = this.getIbsCbsRates(engineType, year);

    // Calcular valores
    const ibsUfAmount = input.baseValue.amount * (rates.ibsUfRate / 100);
    const ibsMunAmount = input.baseValue.amount * (rates.ibsMunRate / 100);
    const cbsAmount = input.baseValue.amount * (rates.cbsRate / 100);

    // Criar Money objects
    const ibsUfValueResult = Money.create(ibsUfAmount, input.baseValue.currency);
    const ibsMunValueResult = Money.create(ibsMunAmount, input.baseValue.currency);
    const cbsValueResult = Money.create(cbsAmount, input.baseValue.currency);

    if (
      Result.isFail(ibsUfValueResult) || 
      Result.isFail(ibsMunValueResult) || 
      Result.isFail(cbsValueResult)
    ) {
      return Result.fail('Failed to create Money objects for tax values');
    }

    return Result.ok({
      itemId: input.itemId,
      regime: engineType,
      baseValue: input.baseValue,
      ibsUf: {
        rate: rates.ibsUfRate,
        value: ibsUfValueResult.value,
      },
      ibsMun: {
        rate: rates.ibsMunRate,
        value: ibsMunValueResult.value,
      },
      cbs: {
        rate: rates.cbsRate,
        value: cbsValueResult.value,
      },
    });
  }

  /**
   * Retorna alíquotas IBS/CBS baseado no regime e ano
   */
  private getIbsCbsRates(engineType: TaxEngineType, year: number): {
    ibsUfRate: number;
    ibsMunRate: number;
    cbsRate: number;
  } {
    if (engineType === TaxEngineType.CURRENT) {
      // Sistema atual: sem IBS/CBS
      return {
        ibsUfRate: 0,
        ibsMunRate: 0,
        cbsRate: 0,
      };
    }

    if (engineType === TaxEngineType.TRANSITION) {
      // Período de transição: alíquotas progressivas
      const transitionRates: Record<number, { ibsRate: number; cbsRate: number }> = {
        2026: { ibsRate: 0.10, cbsRate: 0.90 },
        2027: { ibsRate: 0.10, cbsRate: 8.80 },
        2028: { ibsRate: 0.10, cbsRate: 8.80 },
        2029: { ibsRate: 1.77, cbsRate: 8.80 },
        2030: { ibsRate: 3.54, cbsRate: 8.80 },
        2031: { ibsRate: 7.08, cbsRate: 8.80 },
        2032: { ibsRate: 10.62, cbsRate: 8.80 },
      };

      const rate = transitionRates[year] || { ibsRate: 0, cbsRate: 0 };

      // IBS dividido: 60% UF, 40% Município
      return {
        ibsUfRate: rate.ibsRate * 0.6,
        ibsMunRate: rate.ibsRate * 0.4,
        cbsRate: rate.cbsRate,
      };
    }

    // TaxEngineType.NEW: Novo sistema (2033+)
    // Alíquotas cheias
    const ibsTotalRate = 17.70;
    const cbsRate = 8.80;

    return {
      ibsUfRate: ibsTotalRate * 0.6, // 60% para UF
      ibsMunRate: ibsTotalRate * 0.4, // 40% para Município
      cbsRate,
    };
  }

  /**
   * Calcula múltiplos itens em batch
   */
  async calculateBatch(inputs: CalculationInput[]): Promise<Result<CalculationOutput[], string>> {
    const results: CalculationOutput[] = [];

    for (const input of inputs) {
      const result = await this.calculate(input);
      if (Result.isFail(result)) {
        return Result.fail(`Failed to calculate item ${input.itemId}: ${result.error}`);
      }
      results.push(result.value);
    }

    return Result.ok(results);
  }

  /**
   * Retorna informações sobre o regime tributário para uma data
   */
  getRegimeInfo(date: Date): {
    regime: TaxEngineType;
    year: number;
    description: string;
  } {
    const engineType = this.taxEngineFactory.determineEngineType(date);
    const year = date.getFullYear();

    let description: string;
    switch (engineType) {
      case TaxEngineType.CURRENT:
        description = 'Sistema Tributário Atual (ICMS/ISS/PIS/COFINS)';
        break;
      case TaxEngineType.TRANSITION:
        description = `Período de Transição (${year}) - Coexistência de sistemas`;
        break;
      case TaxEngineType.NEW:
        description = 'Novo Sistema Tributário (IBS/CBS/IS)';
        break;
      default:
        description = 'Sistema desconhecido';
    }

    return {
      regime: engineType,
      year,
      description,
    };
  }
}

