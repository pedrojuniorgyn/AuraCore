import { Result, Money } from '@/shared/domain';
import { TaxEngineFactory } from '../tax/engines/TaxEngineFactory';

/**
 * Input para simulação
 */
export interface SimulateInput {
  baseValue: Money;
  ufOrigem: string;
  ufDestino: string;
  years: number[];
}

/**
 * Output de um cenário simulado
 */
export interface SimulatedScenario {
  year: number;
  regime: 'CURRENT' | 'TRANSITION' | 'NEW';
  currentSystemTaxes: {
    icms: Money;
    pis: Money;
    cofins: Money;
  };
  newSystemTaxes: {
    ibsUf: Money;
    ibsMun: Money;
    cbs: Money;
  };
  totalTaxBurden: Money;
}

/**
 * Output da simulação completa
 */
export interface SimulationOutput {
  scenarios: SimulatedScenario[];
  summary: {
    currentSystemTotal: Money;
    newSystemTotal: Money;
    difference: Money;
    percentageChange: number;
  };
}

/**
 * Tax Scenario Simulator (Domain Service)
 * 
 * Responsável por simular cenários tributários durante a transição.
 * Compara carga tributária do sistema atual vs novo para múltiplos anos.
 * 
 * Não persiste dados - apenas simula cenários baseados em inputs.
 */
export class TaxScenarioSimulator {
  private readonly taxEngineFactory: TaxEngineFactory;

  constructor() {
    this.taxEngineFactory = new TaxEngineFactory();
  }

  /**
   * Simula cenários para múltiplos anos
   */
  async simulate(input: SimulateInput): Promise<Result<SimulationOutput, string>> {
    // Validar input
    if (input.years.length === 0) {
      return Result.fail('At least one year must be provided');
    }

    if (input.baseValue.amount <= 0) {
      return Result.fail('Base value must be positive');
    }

    // Simular cada ano
    const scenarios: SimulatedScenario[] = [];
    let currentSystemTotal = 0;
    let newSystemTotal = 0;

    for (const year of input.years) {
      const scenarioResult = this.simulateYear(year, input.baseValue, input.ufOrigem, input.ufDestino);
      if (Result.isFail(scenarioResult)) {
        return Result.fail(`Failed to simulate year ${year}: ${scenarioResult.error}`);
      }

      const scenario = scenarioResult.value;
      scenarios.push(scenario);

      // Acumular totais para summary
      currentSystemTotal += scenario.currentSystemTaxes.icms.amount +
                           scenario.currentSystemTaxes.pis.amount +
                           scenario.currentSystemTaxes.cofins.amount;
      
      newSystemTotal += scenario.newSystemTaxes.ibsUf.amount +
                       scenario.newSystemTaxes.ibsMun.amount +
                       scenario.newSystemTaxes.cbs.amount;
    }

    // Calcular diferença e percentual
    const difference = newSystemTotal - currentSystemTotal;
    const percentageChange = currentSystemTotal > 0 
      ? (difference / currentSystemTotal) * 100 
      : 0;

    const currentTotalResult = Money.create(currentSystemTotal, input.baseValue.currency);
    const newTotalResult = Money.create(newSystemTotal, input.baseValue.currency);
    const diffResult = Money.create(difference, input.baseValue.currency);

    if (Result.isFail(currentTotalResult) || Result.isFail(newTotalResult) || Result.isFail(diffResult)) {
      return Result.fail('Failed to create summary Money objects');
    }

    return Result.ok({
      scenarios,
      summary: {
        currentSystemTotal: currentTotalResult.value,
        newSystemTotal: newTotalResult.value,
        difference: diffResult.value,
        percentageChange,
      },
    });
  }

  /**
   * Simula um único ano
   */
  private simulateYear(
    year: number, 
    baseValue: Money, 
    ufOrigem: string, 
    ufDestino: string
  ): Result<SimulatedScenario, string> {
    // Determinar regime para o ano
    const date = new Date(year, 0, 1);
    const engineType = this.taxEngineFactory.determineEngineType(date);
    const regime = engineType;

    // Simular sistema atual (ICMS, PIS, COFINS)
    const icmsRate = year >= 2029 ? this.getIcmsReductionMultiplier(year) * 0.18 : 0.18;
    const pisRate = year >= 2027 ? 0 : 0.0165;
    const cofinsRate = year >= 2027 ? 0 : 0.076;

    const icmsAmount = baseValue.amount * icmsRate;
    const pisAmount = baseValue.amount * pisRate;
    const cofinsAmount = baseValue.amount * cofinsRate;

    // Simular novo sistema (IBS, CBS)
    const ibsRates = this.getIbsCbsRates(year);
    const ibsUfAmount = baseValue.amount * (ibsRates.ibsUfRate / 100);
    const ibsMunAmount = baseValue.amount * (ibsRates.ibsMunRate / 100);
    const cbsAmount = baseValue.amount * (ibsRates.cbsRate / 100);

    // Criar Money objects
    const icmsResult = Money.create(icmsAmount, baseValue.currency);
    const pisResult = Money.create(pisAmount, baseValue.currency);
    const cofinsResult = Money.create(cofinsAmount, baseValue.currency);
    const ibsUfResult = Money.create(ibsUfAmount, baseValue.currency);
    const ibsMunResult = Money.create(ibsMunAmount, baseValue.currency);
    const cbsResult = Money.create(cbsAmount, baseValue.currency);

    if (
      Result.isFail(icmsResult) || 
      Result.isFail(pisResult) || 
      Result.isFail(cofinsResult) ||
      Result.isFail(ibsUfResult) || 
      Result.isFail(ibsMunResult) || 
      Result.isFail(cbsResult)
    ) {
      return Result.fail('Failed to create Money objects for scenario');
    }

    // Calcular carga tributária total
    const totalBurden = icmsAmount + pisAmount + cofinsAmount + 
                       ibsUfAmount + ibsMunAmount + cbsAmount;
    const totalBurdenResult = Money.create(totalBurden, baseValue.currency);

    if (Result.isFail(totalBurdenResult)) {
      return Result.fail('Failed to create total burden Money');
    }

    return Result.ok({
      year,
      regime,
      currentSystemTaxes: {
        icms: icmsResult.value,
        pis: pisResult.value,
        cofins: cofinsResult.value,
      },
      newSystemTaxes: {
        ibsUf: ibsUfResult.value,
        ibsMun: ibsMunResult.value,
        cbs: cbsResult.value,
      },
      totalTaxBurden: totalBurdenResult.value,
    });
  }

  /**
   * Retorna multiplicador de redução do ICMS durante transição
   */
  private getIcmsReductionMultiplier(year: number): number {
    if (year < 2029) return 1.0;
    if (year === 2029) return 0.9;
    if (year === 2030) return 0.8;
    if (year === 2031) return 0.6;
    if (year === 2032) return 0.4;
    return 0.0; // 2033+
  }

  /**
   * Retorna alíquotas IBS/CBS para o ano (conforme TransitionTaxEngine)
   */
  private getIbsCbsRates(year: number): {
    ibsUfRate: number;
    ibsMunRate: number;
    cbsRate: number;
  } {
    // Alíquotas conforme TransitionTaxEngine (Semana 2)
    const rates: Record<number, { ibsRate: number; cbsRate: number }> = {
      2026: { ibsRate: 0.10, cbsRate: 0.90 },
      2027: { ibsRate: 0.10, cbsRate: 8.80 },
      2028: { ibsRate: 0.10, cbsRate: 8.80 },
      2029: { ibsRate: 1.77, cbsRate: 8.80 },
      2030: { ibsRate: 3.54, cbsRate: 8.80 },
      2031: { ibsRate: 7.08, cbsRate: 8.80 },
      2032: { ibsRate: 10.62, cbsRate: 8.80 },
    };

    const rate = rates[year] || { ibsRate: 17.70, cbsRate: 8.80 }; // 2033+ alíquotas cheias

    // IBS dividido: 60% UF, 40% Município
    return {
      ibsUfRate: rate.ibsRate * 0.6,
      ibsMunRate: rate.ibsRate * 0.4,
      cbsRate: rate.cbsRate,
    };
  }
}

