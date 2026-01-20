/**
 * Use Case: CreateSwotItemCommand
 * Cria um novo item de análise SWOT
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { ISwotAnalysisRepository } from '../../domain/ports/output/ISwotAnalysisRepository';
import type { IStrategyRepository } from '../../domain/ports/output/IStrategyRepository';
import { 
  SwotItem, 
  type SwotQuadrant, 
  type SwotCategory 
} from '../../domain/entities/SwotItem';
import { CreateSwotItemInputSchema } from '../dtos/CreateSwotItemDTO';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface CreateSwotItemInput {
  strategyId?: string;
  quadrant: SwotQuadrant;
  category?: SwotCategory;
  title: string;
  description?: string;
  impactScore: number;
  probabilityScore?: number;
}

export interface CreateSwotItemOutput {
  id: string;
  quadrant: SwotQuadrant;
  title: string;
  priorityScore: number;
  status: string;
}

export interface ICreateSwotItemUseCase {
  execute(
    input: CreateSwotItemInput,
    context: TenantContext
  ): Promise<Result<CreateSwotItemOutput, string>>;
}

@injectable()
export class CreateSwotItemCommand implements ICreateSwotItemUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.SwotAnalysisRepository)
    private readonly swotRepository: ISwotAnalysisRepository,
    @inject(STRATEGIC_TOKENS.StrategyRepository)
    private readonly strategyRepository: IStrategyRepository
  ) {}

  async execute(
    input: CreateSwotItemInput,
    context: TenantContext
  ): Promise<Result<CreateSwotItemOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }
    if (!context.userId) {
      return Result.fail('Usuário não autenticado');
    }

    // 2. Validar input com Zod
    const validationResult = CreateSwotItemInputSchema.safeParse(input);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((e) => e.message).join(', ');
      return Result.fail(`Validação falhou: ${errors}`);
    }

    const validatedInput = validationResult.data;

    // 3. Verificar se estratégia existe (se informada)
    if (validatedInput.strategyId) {
      const strategy = await this.strategyRepository.findById(
        validatedInput.strategyId,
        context.organizationId,
        context.branchId
      );
      if (!strategy) {
        return Result.fail('Estratégia não encontrada');
      }
    }

    // 4. Criar entidade
    const swotItemResult = SwotItem.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      strategyId: validatedInput.strategyId,
      quadrant: validatedInput.quadrant,
      title: validatedInput.title,
      description: validatedInput.description,
      impactScore: validatedInput.impactScore,
      probabilityScore: validatedInput.probabilityScore,
      category: validatedInput.category,
      createdBy: context.userId,
    });

    if (Result.isFail(swotItemResult)) {
      return Result.fail(swotItemResult.error);
    }

    const swotItem = swotItemResult.value;

    // 5. Persistir
    await this.swotRepository.save(swotItem);

    // 6. Retornar output
    return Result.ok({
      id: swotItem.id,
      quadrant: swotItem.quadrant,
      title: swotItem.title,
      priorityScore: swotItem.priorityScore,
      status: swotItem.status,
    });
  }
}
