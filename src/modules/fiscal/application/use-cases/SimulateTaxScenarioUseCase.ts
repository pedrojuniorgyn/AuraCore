import { injectable } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import { TaxScenarioSimulator, SimulateInput } from '../../domain/services/TaxScenarioSimulator';
import { 
  SimulateTaxScenarioInput,
  SimulateTaxScenarioInputSchema,
  SimulateTaxScenarioOutput,
  TaxScenario,
  TaxComparison,
} from '../dtos/SimulateTaxScenarioDto';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Simular Cenários Tributários
 * 
 * Responsabilidades:
 * - Validar input (Zod)
 * - Simular carga tributária para múltiplos anos
 * - Comparar sistema atual vs novo
 * - Retornar projeções
 * 
 * Útil para planejamento estratégico durante transição tributária.
 */
@injectable()
export class SimulateTaxScenarioUseCase implements IUseCaseWithContext<SimulateTaxScenarioInput, SimulateTaxScenarioOutput> {
  private readonly simulator: TaxScenarioSimulator;

  constructor() {
    this.simulator = new TaxScenarioSimulator();
  }

  async execute(
    input: SimulateTaxScenarioInput,
    ctx: ExecutionContext
  ): Promise<Result<SimulateTaxScenarioOutput, string>> {
    // 1. Validar input com Zod
    const validation = SimulateTaxScenarioInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Verificar multi-tenancy
    if (data.organizationId !== ctx.organizationId || data.branchId !== ctx.branchId) {
      return Result.fail('Access denied: organizationId or branchId mismatch');
    }

    // 3. Criar Money para base
    const baseValueResult = Money.create(data.baseValue, 'BRL');
    if (Result.isFail(baseValueResult)) {
      return Result.fail(`Invalid base value: ${baseValueResult.error}`);
    }

    // 4. Preparar input para simulador
    const simulateInput: SimulateInput = {
      baseValue: baseValueResult.value,
      ufOrigem: data.ufOrigem,
      ufDestino: data.ufDestino,
      years: data.years,
    };

    // 5. Executar simulação
    const simulationResult = await this.simulator.simulate(simulateInput);
    if (Result.isFail(simulationResult)) {
      return Result.fail(`Simulation failed: ${simulationResult.error}`);
    }

    const simulation = simulationResult.value;

    // 6. Converter para DTO
    const scenarios: TaxScenario[] = simulation.scenarios.map(scenario => ({
      year: scenario.year,
      regime: scenario.regime,
      currentTaxes: {
        icms: {
          amount: scenario.currentSystemTaxes.icms.amount,
          currency: scenario.currentSystemTaxes.icms.currency,
        },
        pis: {
          amount: scenario.currentSystemTaxes.pis.amount,
          currency: scenario.currentSystemTaxes.pis.currency,
        },
        cofins: {
          amount: scenario.currentSystemTaxes.cofins.amount,
          currency: scenario.currentSystemTaxes.cofins.currency,
        },
      },
      newTaxes: {
        ibsUf: {
          amount: scenario.newSystemTaxes.ibsUf.amount,
          currency: scenario.newSystemTaxes.ibsUf.currency,
        },
        ibsMun: {
          amount: scenario.newSystemTaxes.ibsMun.amount,
          currency: scenario.newSystemTaxes.ibsMun.currency,
        },
        cbs: {
          amount: scenario.newSystemTaxes.cbs.amount,
          currency: scenario.newSystemTaxes.cbs.currency,
        },
      },
      totalTaxBurden: {
        amount: scenario.totalTaxBurden.amount,
        currency: scenario.totalTaxBurden.currency,
      },
    }));

    const comparison: TaxComparison = {
      currentSystemTotal: {
        amount: simulation.summary.currentSystemTotal.amount,
        currency: simulation.summary.currentSystemTotal.currency,
      },
      newSystemTotal: {
        amount: simulation.summary.newSystemTotal.amount,
        currency: simulation.summary.newSystemTotal.currency,
      },
      difference: {
        amount: simulation.summary.difference.amount,
        currency: simulation.summary.difference.currency,
      },
      percentageChange: simulation.summary.percentageChange,
    };

    return Result.ok({
      scenarios,
      comparison,
    });
  }
}

