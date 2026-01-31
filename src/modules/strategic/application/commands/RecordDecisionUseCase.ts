/**
 * Use Case: RecordDecisionUseCase
 * Registrar decisão de reunião WarRoom
 *
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { WarRoomMeeting } from '../../domain/entities/WarRoomMeeting';
import type { IRecordDecisionUseCase, RecordDecisionDTO } from '../../domain/ports/input/IRecordDecisionUseCase';
import type { IWarRoomMeetingRepository } from '../../domain/ports/output/IWarRoomMeetingRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class RecordDecisionUseCase implements IRecordDecisionUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.WarRoomMeetingRepository)
    private readonly repository: IWarRoomMeetingRepository
  ) {}

  async execute(dto: RecordDecisionDTO): Promise<Result<WarRoomMeeting, string>> {
    // Buscar reunião
    const meeting = await this.repository.findById(
      dto.meetingId,
      dto.organizationId,
      dto.branchId
    );

    if (!meeting) {
      return Result.fail('Reunião não encontrada');
    }

    // Registrar decisão
    const recordResult = meeting.recordDecision({
      description: dto.description,
      responsible: dto.responsible,
      deadline: dto.deadline,
      actionPlanId: dto.actionPlanId,
    });

    if (Result.isFail(recordResult)) {
      return Result.fail(recordResult.error);
    }

    // Persistir
    await this.repository.save(meeting);

    return Result.ok(meeting);
  }
}
