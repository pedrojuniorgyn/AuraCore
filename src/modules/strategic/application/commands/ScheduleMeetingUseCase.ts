/**
 * Use Case: ScheduleMeetingUseCase
 * Agendar reunião WarRoom
 *
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { WarRoomMeeting } from '../../domain/entities/WarRoomMeeting';
import type { IScheduleMeetingUseCase, ScheduleMeetingDTO } from '../../domain/ports/input/IScheduleMeetingUseCase';
import type { IWarRoomMeetingRepository } from '../../domain/ports/output/IWarRoomMeetingRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ScheduleMeetingUseCase implements IScheduleMeetingUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.WarRoomMeetingRepository)
    private readonly repository: IWarRoomMeetingRepository
  ) {}

  async execute(dto: ScheduleMeetingDTO): Promise<Result<WarRoomMeeting, string>> {
    // Validar data futura
    if (dto.scheduledAt <= new Date()) {
      return Result.fail('Data da reunião deve ser futura');
    }

    // Criar entity
    const meetingResult = WarRoomMeeting.create({
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      strategyId: dto.strategyId,
      meetingType: dto.meetingType,
      title: dto.title,
      description: dto.description,
      scheduledAt: dto.scheduledAt,
      expectedDuration: dto.expectedDuration,
      participants: dto.participants,
      facilitatorUserId: dto.facilitatorUserId,
      createdBy: dto.createdBy,
    });

    if (Result.isFail(meetingResult)) {
      return meetingResult;
    }

    const meeting = meetingResult.value;

    // Persistir
    await this.repository.save(meeting);

    return Result.ok(meeting);
  }
}
