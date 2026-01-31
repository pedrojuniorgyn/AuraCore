/**
 * Port Input: IRecordDecisionUseCase
 * Registrar decisão de reunião WarRoom
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { WarRoomMeeting } from '../../entities/WarRoomMeeting';

export interface RecordDecisionDTO {
  meetingId: string;
  organizationId: number;
  branchId: number;
  description: string;
  responsible: string;
  deadline?: Date;
  actionPlanId?: string;
}

export interface IRecordDecisionUseCase {
  execute(dto: RecordDecisionDTO): Promise<Result<WarRoomMeeting, string>>;
}
