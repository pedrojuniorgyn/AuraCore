/**
 * Use Case: Create Strategy Version
 *
 * Cria uma nova versão de uma estratégia (BUDGET, FORECAST, SCENARIO).
 * Permite planejamento multi-cenário sem alterar a versão ACTUAL.
 *
 * Referência: SAP BPC Versions, Oracle Planning Scenarios
 * @see GAP-D01
 */

import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { IStrategyRepository } from '../../domain/ports/output/IStrategyRepository';
import type { StrategyVersionType } from '../../domain/entities/Strategy';

export interface CreateStrategyVersionInput {
  sourceStrategyId: string;
  versionType: Exclude<StrategyVersionType, 'ACTUAL'>;
  versionName: string;
  organizationId: number;
  branchId: number;
  createdBy: string;
}

export interface ICreateStrategyVersionUseCase {
  execute(input: CreateStrategyVersionInput): Promise<Result<string, string>>;
}

@injectable()
export class CreateStrategyVersionUseCase implements ICreateStrategyVersionUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategyRepository)
    private readonly strategyRepo: IStrategyRepository
  ) {}

  async execute(input: CreateStrategyVersionInput): Promise<Result<string, string>> {
    // 1. Buscar estratégia fonte
    const source = await this.strategyRepo.findById(
      input.sourceStrategyId,
      input.organizationId,
      input.branchId
    );

    if (!source) {
      return Result.fail('Source strategy not found');
    }

    // 2. Verificar se é ACTUAL
    if (source.versionType !== 'ACTUAL') {
      return Result.fail('Can only create versions from ACTUAL strategy');
    }

    // 3. Verificar se já existe versão do mesmo tipo
    const existingVersion = await this.strategyRepo.findVersionByType(
      input.sourceStrategyId,
      input.versionType,
      input.organizationId,
      input.branchId
    );

    if (existingVersion) {
      return Result.fail(`Version ${input.versionType} already exists for this strategy`);
    }

    // 4. Criar nova versão
    const versionResult = source.createVersion(
      input.versionType,
      input.versionName,
      input.createdBy
    );

    if (versionResult.isFailure) {
      return Result.fail(versionResult.error!);
    }

    // 5. Salvar
    const saveResult = await this.strategyRepo.save(versionResult.value!);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error!);
    }

    return Result.ok(versionResult.value!.id);
  }
}
