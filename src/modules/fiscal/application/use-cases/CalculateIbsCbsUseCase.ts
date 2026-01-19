import { injectable } from '@/shared/infrastructure/di/container';
import { Result, Money } from '@/shared/domain';
import { TaxCalculationOrchestrator, CalculationInput } from '../../domain/services/TaxCalculationOrchestrator';
import { 
  CalculateIbsCbsInput, 
  CalculateIbsCbsInputSchema, 
  CalculateIbsCbsOutput,
  CalculateIbsCbsItemOutput,
  CalculateTotals,
} from '../dtos/CalculateIbsCbsDto';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Calcular IBS/CBS
 * 
 * Responsabilidades:
 * - Validar input (Zod)
 * - Orquestrar cálculo via TaxCalculationOrchestrator
 * - Consolidar totais
 * - Retornar DTO
 * 
 * Nota: Este Use Case não persiste dados. Apenas calcula.
 * Para persistir, usar CreateFiscalDocumentUseCase.
 */
@injectable()
export class CalculateIbsCbsUseCase implements IUseCaseWithContext<CalculateIbsCbsInput, CalculateIbsCbsOutput> {
  private readonly orchestrator: TaxCalculationOrchestrator;

  constructor() {
    this.orchestrator = new TaxCalculationOrchestrator();
  }

  async execute(
    input: CalculateIbsCbsInput,
    ctx: ExecutionContext
  ): Promise<Result<CalculateIbsCbsOutput, string>> {
    // 1. Validar input com Zod
    const validation = CalculateIbsCbsInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Verificar multi-tenancy
    if (data.organizationId !== ctx.organizationId || data.branchId !== ctx.branchId) {
      return Result.fail('Access denied: organizationId or branchId mismatch');
    }

    // 3. Preparar inputs para cálculo
    const calculationInputs: CalculationInput[] = data.items.map(item => {
      const baseValueResult = Money.create(item.baseValue, 'BRL');
      if (Result.isFail(baseValueResult)) {
        throw new Error(`Invalid baseValue for item ${item.itemId}`);
      }

      return {
        itemId: item.itemId,
        baseValue: baseValueResult.value,
        operationDate: data.operationDate,
        cfop: item.cfop,
        ncm: item.ncm,
        ufOrigem: item.ufOrigem,
        ufDestino: item.ufDestino,
        municipioDestino: item.municipioDestino,
      };
    });

    // 4. Executar cálculo em batch
    const calculationResult = await this.orchestrator.calculateBatch(calculationInputs);
    if (Result.isFail(calculationResult)) {
      return Result.fail(`Tax calculation failed: ${calculationResult.error}`);
    }

    const calculations = calculationResult.value;

    // 5. Converter para DTO
    const itemsOutput: CalculateIbsCbsItemOutput[] = calculations.map(calc => ({
      itemId: calc.itemId,
      baseValue: {
        amount: calc.baseValue.amount,
        currency: calc.baseValue.currency,
      },
      ibsUfRate: calc.ibsUf.rate,
      ibsUfValue: {
        amount: calc.ibsUf.value.amount,
        currency: calc.ibsUf.value.currency,
      },
      ibsMunRate: calc.ibsMun.rate,
      ibsMunValue: {
        amount: calc.ibsMun.value.amount,
        currency: calc.ibsMun.value.currency,
      },
      cbsRate: calc.cbs.rate,
      cbsValue: {
        amount: calc.cbs.value.amount,
        currency: calc.cbs.value.currency,
      },
      isValue: calc.is ? {
        amount: calc.is.value.amount,
        currency: calc.is.value.currency,
      } : undefined,
    }));

    // 6. Calcular totais
    let totalBaseValue = 0;
    let totalIbsUf = 0;
    let totalIbsMun = 0;
    let totalCbs = 0;
    let totalIs = 0;

    for (const calc of calculations) {
      totalBaseValue += calc.baseValue.amount;
      totalIbsUf += calc.ibsUf.value.amount;
      totalIbsMun += calc.ibsMun.value.amount;
      totalCbs += calc.cbs.value.amount;
      if (calc.is) {
        totalIs += calc.is.value.amount;
      }
    }

    const totals: CalculateTotals = {
      totalBaseValue: {
        amount: totalBaseValue,
        currency: 'BRL',
      },
      totalIbsUf: {
        amount: totalIbsUf,
        currency: 'BRL',
      },
      totalIbsMun: {
        amount: totalIbsMun,
        currency: 'BRL',
      },
      totalCbs: {
        amount: totalCbs,
        currency: 'BRL',
      },
      totalIs: totalIs > 0 ? {
        amount: totalIs,
        currency: 'BRL',
      } : undefined,
    };

    // 7. Determinar regime (pega do primeiro item, todos na mesma data)
    const regime = calculations[0]?.regime || 'CURRENT';

    return Result.ok({
      regime,
      items: itemsOutput,
      totals,
    });
  }
}

