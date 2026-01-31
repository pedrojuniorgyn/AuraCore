/**
 * Query: GetBSCDashboardQuery
 * Obter dashboard do Balanced Scorecard
 *
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IGetBSCDashboardUseCase, GetBSCDashboardDTO, GetBSCDashboardResult } from '../../domain/ports/input/IGetBSCDashboardUseCase';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class GetBSCDashboardQuery implements IGetBSCDashboardUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(dto: GetBSCDashboardDTO): Promise<Result<GetBSCDashboardResult, string>> {
    // TODO: Implementar lógica completa de BSC Dashboard
    // Por ora, retorna estrutura vazia

    const result: GetBSCDashboardResult = {
      perspectives: [
        {
          perspective: 'FINANCIAL',
          label: 'Financeira',
          goals: [],
        },
        {
          perspective: 'CUSTOMER',
          label: 'Clientes',
          goals: [],
        },
        {
          perspective: 'INTERNAL_PROCESS',
          label: 'Processos Internos',
          goals: [],
        },
        {
          perspective: 'LEARNING_GROWTH',
          label: 'Aprendizado e Crescimento',
          goals: [],
        },
      ],
      overallScore: 0,
      lastUpdated: new Date(),
    };

    return Result.ok(result);
  }
}
