/**
 * Port Input: IScheduleMeetingUseCase
 * Agendar reunião WarRoom
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { WarRoomMeeting, MeetingType } from '../../entities/WarRoomMeeting';

export interface ScheduleMeetingDTO {
  organizationId: number;
  branchId: number;
  strategyId?: string;
  meetingType: MeetingType;
  title: string;
  description?: string;
  scheduledAt: Date;
  expectedDuration?: number; // minutos
  participants?: string[];
  facilitatorUserId: string;
  createdBy: string;
}

export interface IScheduleMeetingUseCase {
  execute(dto: ScheduleMeetingDTO): Promise<Result<WarRoomMeeting, string>>;
}
