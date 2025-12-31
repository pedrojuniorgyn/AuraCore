import { injectable } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import { 
  CalculateCompensationInput,
  CalculateCompensationInputSchema,
  CalculateCompensationOutput,
} from '../dtos/TaxRatesDto';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Calcular Compensação de Tributos
 * 
 * Responsabilidades:
 * - Validar input (Zod)
 * - Calcular créditos do sistema atual (PIS/COFINS)
 * - Calcular créditos do novo sistema (IBS/CBS)
 * - Determinar posição líquida
 * - Verificar se compensação é permitida
 * 
 * Nota: Em produção, consultar documentos fiscais do período.
 * Esta versão retorna dados mockados para demonstração.
 */
@injectable()
export class CalculateCompensationUseCase implements IUseCaseWithContext<CalculateCompensationInput, CalculateCompensationOutput> {
  constructor() {
    // Sem dependências externas nesta versão simplificada
  }

  async execute(
    input: CalculateCompensationInput,
    ctx: ExecutionContext
  ): Promise<Result<CalculateCompensationOutput, string>> {
    // 1. Validar input com Zod
    const validation = CalculateCompensationInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Verificar multi-tenancy
    if (data.organizationId !== ctx.organizationId || data.branchId !== ctx.branchId) {
      return Result.fail('Access denied: organizationId or branchId mismatch');
    }

    // 3. Validar período
    if (data.periodEnd <= data.periodStart) {
      return Result.fail('Period end must be after period start');
    }

    // 4. Calcular compensação (mockado - em produção, buscar docs fiscais)
    const pisCredits = Money.create(1500.00, 'BRL');
    const cofinsCredits = Money.create(7000.00, 'BRL');
    const ibsCredits = Money.create(5000.00, 'BRL');
    const cbsCredits = Money.create(3500.00, 'BRL');

    if (
      Result.isFail(pisCredits) || 
      Result.isFail(cofinsCredits) || 
      Result.isFail(ibsCredits) || 
      Result.isFail(cbsCredits)
    ) {
      return Result.fail('Failed to create Money objects for credits');
    }

    const currentTotal = pisCredits.value.amount + cofinsCredits.value.amount;
    const newTotal = ibsCredits.value.amount + cbsCredits.value.amount;
    const netPosition = newTotal - currentTotal;

    const currentTotalMoney = Money.create(currentTotal, 'BRL');
    const newTotalMoney = Money.create(newTotal, 'BRL');
    const netPositionMoney = Money.create(netPosition, 'BRL');

    if (
      Result.isFail(currentTotalMoney) || 
      Result.isFail(newTotalMoney) || 
      Result.isFail(netPositionMoney)
    ) {
      return Result.fail('Failed to create summary Money objects');
    }

    // 5. Determinar se compensação é permitida
    // Regra simplificada: permitido se net position > 0
    const compensationAllowed = netPosition > 0;

    return Result.ok({
      period: {
        start: data.periodStart.toISOString(),
        end: data.periodEnd.toISOString(),
      },
      currentCredits: {
        pis: {
          amount: pisCredits.value.amount,
          currency: pisCredits.value.currency,
        },
        cofins: {
          amount: cofinsCredits.value.amount,
          currency: cofinsCredits.value.currency,
        },
        total: {
          amount: currentTotalMoney.value.amount,
          currency: currentTotalMoney.value.currency,
        },
      },
      newCredits: {
        ibs: {
          amount: ibsCredits.value.amount,
          currency: ibsCredits.value.currency,
        },
        cbs: {
          amount: cbsCredits.value.amount,
          currency: cbsCredits.value.currency,
        },
        total: {
          amount: newTotalMoney.value.amount,
          currency: newTotalMoney.value.currency,
        },
      },
      netPosition: {
        amount: netPositionMoney.value.amount,
        currency: netPositionMoney.value.currency,
      },
      compensationAllowed,
    });
  }
}

