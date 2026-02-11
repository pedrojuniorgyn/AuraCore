import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import {
  ISimulateTaxReform,
  SimulateTaxReformInput,
  SimulateTaxReformOutput,
  ExecutionContext,
} from '../../domain/ports/input';

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
 * 
 * @see ARCH-010: Implementa ISimulateTaxReform
 */
@injectable()
export class SimulateTaxScenarioUseCase implements ISimulateTaxReform {
  constructor() {
    // Sem dependências
  }

  async execute(
    input: SimulateTaxReformInput,
    _ctx: ExecutionContext
  ): Promise<Result<SimulateTaxReformOutput, string>> {
    // Validação de input (USE-CASE-007)
    const trimmedDocumentId = input.documentId?.trim() ?? '';
    if (!trimmedDocumentId) {
      return Result.fail('documentId is required');
    }

    // TODO: Implementar simulação completa
    // Por enquanto, retorna stub básico

    return Result.ok({
      documentId: input.documentId,
      currentScenario: {
        scenario: 'CURRENT',
        taxes: [],
        totalTax: 0,
        totalDocument: 0,
      },
      reformScenario: {
        scenario: 'REFORM_2026',
        taxes: [],
        totalTax: 0,
        totalDocument: 0,
      },
      difference: {
        taxDifference: 0,
        percentageChange: 0,
      },
      simulatedAt: new Date(),
    });
  }
}

