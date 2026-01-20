/**
 * Port Output: IWarRoomMeetingRepository
 * Interface do repositório de reuniões War Room
 * 
 * @module strategic/domain/ports/output
 */
import type { WarRoomMeeting, MeetingType, MeetingStatus } from '../../entities/WarRoomMeeting';

export interface WarRoomMeetingFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  strategyId?: string;
  meetingType?: MeetingType;
  status?: MeetingStatus;
  facilitatorUserId?: string;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface IWarRoomMeetingRepository {
  /**
   * Busca reunião por ID
   */
  findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting | null>;
  
  /**
   * Lista reuniões com paginação
   */
  findMany(filter: WarRoomMeetingFilter): Promise<{
    items: WarRoomMeeting[];
    total: number;
  }>;
  
  /**
   * Busca reuniões por estratégia
   */
  findByStrategy(
    strategyId: string,
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]>;
  
  /**
   * Busca próximas reuniões agendadas
   */
  findUpcoming(
    organizationId: number, 
    branchId: number,
    limit?: number
  ): Promise<WarRoomMeeting[]>;
  
  /**
   * Busca reuniões por facilitador
   */
  findByFacilitator(
    facilitatorUserId: string,
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]>;
  
  /**
   * Busca reuniões por participante
   */
  findByParticipant(
    participantUserId: string,
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]>;
  
  /**
   * Busca reuniões em andamento
   */
  findInProgress(
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]>;
  
  /**
   * Salva (insert ou update)
   */
  save(entity: WarRoomMeeting): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void>;
}
