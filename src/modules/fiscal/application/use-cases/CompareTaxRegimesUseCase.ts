import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { 
  CompareTaxRegimesInput,
  CompareTaxRegimesInputSchema,
  CompareTaxRegimesOutput,
  CurrentRegimeTaxes,
  NewRegimeTaxes,
} from '../dtos/CompareTaxRegimesDto';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Comparar Regimes Tributários
 * 
 * Responsabilidades:
 * - Validar input (Zod)
 * - Buscar documento fiscal
 * - Comparar carga tributária: Atual (ICMS/PIS/COFINS) vs Novo (IBS/CBS)
 * - Calcular diferença e percentual
 * - Retornar recomendação
 * 
 * Útil para análise de impacto da Reforma Tributária.
 */
@injectable()
export class CompareTaxRegimesUseCase implements IUseCaseWithContext<CompareTaxRegimesInput, CompareTaxRegimesOutput> {
  constructor() {
    // Sem dependências externas nesta versão simplificada
  }

  async execute(
    input: CompareTaxRegimesInput,
    ctx: ExecutionContext
  ): Promise<Result<CompareTaxRegimesOutput, string>> {
    // 1. Validar input com Zod
    const validation = CompareTaxRegimesInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Verificar multi-tenancy
    if (data.organizationId !== ctx.organizationId || data.branchId !== ctx.branchId) {
      return Result.fail('Access denied: organizationId or branchId mismatch');
    }

    // 3. Simular comparação (em produção, buscar documento fiscal real)
    // Para esta versão, retornar dados mockados para demonstração
    const currentRegime: CurrentRegimeTaxes = {
      icms: { amount: 180.00, currency: 'BRL' },
      pis: { amount: 16.50, currency: 'BRL' },
      cofins: { amount: 76.00, currency: 'BRL' },
      ipi: { amount: 0, currency: 'BRL' },
      total: { amount: 272.50, currency: 'BRL' },
    };

    const newRegime: NewRegimeTaxes = {
      ibsUf: { amount: 106.20, currency: 'BRL' },
      ibsMun: { amount: 70.80, currency: 'BRL' },
      cbs: { amount: 88.00, currency: 'BRL' },
      is: { amount: 0, currency: 'BRL' },
      total: { amount: 265.00, currency: 'BRL' },
    };

    const difference = newRegime.total.amount - currentRegime.total.amount;
    const percentageChange = (difference / currentRegime.total.amount) * 100;

    let recommendation: string;
    if (percentageChange > 5) {
      recommendation = 'Novo sistema resultará em aumento significativo de carga tributária. Considere planejamento fiscal.';
    } else if (percentageChange < -5) {
      recommendation = 'Novo sistema resultará em redução significativa de carga tributária. Oportunidade de economia.';
    } else {
      recommendation = 'Impacto neutro. Carga tributária similar entre sistemas.';
    }

    return Result.ok({
      currentRegime,
      newRegime,
      difference: {
        amount: difference,
        currency: 'BRL',
      },
      percentageChange,
      recommendation,
    });
  }
}

