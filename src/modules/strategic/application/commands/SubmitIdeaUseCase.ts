/**
 * Use Case: SubmitIdeaUseCase
 * Submeter nova ideia ao banco de ideias (IdeaBox)
 *
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { IdeaBox } from '../../domain/entities/IdeaBox';
import type { ISubmitIdeaUseCase, SubmitIdeaDTO } from '../../domain/ports/input/ISubmitIdeaUseCase';
import type { IIdeaBoxRepository } from '../../domain/ports/output/IIdeaBoxRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class SubmitIdeaUseCase implements ISubmitIdeaUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.IdeaBoxRepository)
    private readonly repository: IIdeaBoxRepository
  ) {}

  async execute(dto: SubmitIdeaDTO): Promise<Result<IdeaBox, string>> {
    // Gerar código sequencial
    const code = await this.repository.nextCode(dto.organizationId, dto.branchId);

    // Criar entity com validações
    const ideaResult = IdeaBox.create({
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      code,
      title: dto.title,
      description: dto.description,
      sourceType: dto.sourceType,
      category: dto.category,
      submittedBy: dto.submittedBy,
      submittedByName: dto.submittedByName,
      department: dto.department,
      urgency: dto.urgency,
      importance: dto.importance,
    });

    if (Result.isFail(ideaResult)) {
      return ideaResult;
    }

    const idea = ideaResult.value;

    // Persistir
    await this.repository.save(idea);

    return Result.ok(idea);
  }
}
