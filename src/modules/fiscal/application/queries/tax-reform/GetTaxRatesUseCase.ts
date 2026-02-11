import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { TaxEngineFactory } from '../../domain/tax/engines/TaxEngineFactory';
import { 
  GetTaxRatesInput,
  GetTaxRatesInputSchema,
  GetTaxRatesOutput,
  TaxRates,
} from '../dtos/TaxRatesDto';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Obter Alíquotas Vigentes
 * 
 * Responsabilidades:
 * - Validar input (Zod)
 * - Buscar alíquotas IBS/CBS vigentes para UF/Município/Data
 * - Retornar rates com source (DATABASE ou DEFAULT)
 * 
 * Nota: Em produção, consultar ITaxRateRepository.
 * Esta versão usa alíquotas default.
 */
@injectable()
export class GetTaxRatesUseCase implements IUseCaseWithContext<GetTaxRatesInput, GetTaxRatesOutput> {
  private readonly taxEngineFactory: TaxEngineFactory;

  constructor() {
    this.taxEngineFactory = new TaxEngineFactory();
  }

  async execute(
    input: GetTaxRatesInput,
    ctx: ExecutionContext
  ): Promise<Result<GetTaxRatesOutput, string>> {
    // 1. Validar input com Zod
    const validation = GetTaxRatesInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Verificar multi-tenancy
    if (data.organizationId !== ctx.organizationId || data.branchId !== ctx.branchId) {
      return Result.fail('Access denied: organizationId or branchId mismatch');
    }

    // 3. Determinar regime tributário para a data
    const engineType = this.taxEngineFactory.determineEngineType(data.date);
    const year = data.date.getFullYear();

    // 4. Obter alíquotas (usando defaults - em produção, consultar repositório)
    const rates = this.getDefaultRates(engineType, year);

    return Result.ok({
      uf: data.uf,
      municipioCode: data.municipioCode,
      date: data.date.toISOString(),
      rates,
      source: 'DEFAULT', // Em produção: verificar se veio do DB ou default
    });
  }

  /**
   * Retorna alíquotas default baseado no regime e ano
   */
  private getDefaultRates(engineType: string, year: number): TaxRates {
    if (engineType === 'CURRENT') {
      return {
        ibsUf: 0,
        ibsMun: 0,
        cbs: 0,
        is: undefined,
      };
    }

    if (engineType === 'TRANSITION') {
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
      
      return {
        ibsUf: rate.ibsRate * 0.6,
        ibsMun: rate.ibsRate * 0.4,
        cbs: rate.cbsRate,
      };
    }

    // NEW: Alíquotas cheias (2033+)
    return {
      ibsUf: 17.70 * 0.6, // 10.62%
      ibsMun: 17.70 * 0.4, // 7.08%
      cbs: 8.80,
    };
  }
}

