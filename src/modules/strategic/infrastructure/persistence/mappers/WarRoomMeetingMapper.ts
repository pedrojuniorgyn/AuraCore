/**
 * Mapper: WarRoomMeetingMapper
 * Converte entre Domain e Persistence
 * 
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { 
  WarRoomMeeting, 
  type MeetingType, 
  type MeetingStatus 
} from '../../../domain/entities/WarRoomMeeting';
import type { WarRoomMeetingRow, WarRoomMeetingInsert } from '../schemas/war-room-meeting.schema';

export class WarRoomMeetingMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: WarRoomMeetingRow): Result<WarRoomMeeting, string> {
    return WarRoomMeeting.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      strategyId: row.strategyId,
      meetingType: row.meetingType as MeetingType,
      title: row.title,
      description: row.description,
      scheduledAt: new Date(row.scheduledAt),
      expectedDuration: row.expectedDuration,
      startedAt: row.startedAt ? new Date(row.startedAt) : null,
      endedAt: row.endedAt ? new Date(row.endedAt) : null,
      participants: row.participants ? JSON.parse(row.participants) : [],
      agendaItems: row.agendaItems ? JSON.parse(row.agendaItems) : [],
      decisions: row.decisions ? JSON.parse(row.decisions) : [],
      minutes: row.minutes,
      minutesGeneratedAt: row.minutesGeneratedAt ? new Date(row.minutesGeneratedAt) : null,
      status: row.status as MeetingStatus,
      facilitatorUserId: row.facilitatorUserId,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: WarRoomMeeting): WarRoomMeetingInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      strategyId: entity.strategyId,
      meetingType: entity.meetingType,
      title: entity.title,
      description: entity.description,
      scheduledAt: entity.scheduledAt,
      expectedDuration: entity.expectedDuration,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
      participants: entity.participants.length > 0 ? JSON.stringify(entity.participants) : null,
      agendaItems: entity.agendaItems.length > 0 ? JSON.stringify(entity.agendaItems) : null,
      decisions: entity.decisions.length > 0 ? JSON.stringify(entity.decisions) : null,
      minutes: entity.minutes,
      minutesGeneratedAt: entity.minutesGeneratedAt,
      status: entity.status,
      facilitatorUserId: entity.facilitatorUserId,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
