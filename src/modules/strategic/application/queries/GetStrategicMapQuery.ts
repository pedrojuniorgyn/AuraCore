/**
 * Query: GetStrategicMapQuery
 * Obter mapa estratégico (Strategic Map)
 *
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IGetStrategicMapUseCase, GetStrategicMapDTO, GetStrategicMapResult } from '../../domain/ports/input/IGetStrategicMapUseCase';
import type { IStrategyRepository } from '../../domain/ports/output/IStrategyRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class GetStrategicMapQuery implements IGetStrategicMapUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategyRepository)
    private readonly strategyRepository: IStrategyRepository
  ) {}

  async execute(dto: GetStrategicMapDTO): Promise<Result<GetStrategicMapResult, string>> {
    // TODO: Implementar lógica completa de Strategic Map
    // Por ora, retorna estrutura vazia

    const result: GetStrategicMapResult = {
      nodes: [],
      edges: [],
    };

    return Result.ok(result);
  }
}
