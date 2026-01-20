/**
 * Repository: DrizzleWarRoomMeetingRepository
 * Implementação Drizzle do repositório de reuniões War Room
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, sql, gte, lte, asc } from 'drizzle-orm';
import type { 
  IWarRoomMeetingRepository, 
  WarRoomMeetingFilter 
} from '../../../domain/ports/output/IWarRoomMeetingRepository';
import { WarRoomMeeting, type MeetingType, type MeetingStatus } from '../../../domain/entities/WarRoomMeeting';
import { WarRoomMeetingMapper } from '../mappers/WarRoomMeetingMapper';
import { warRoomMeetingTable } from '../schemas/war-room-meeting.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';

export class DrizzleWarRoomMeetingRepository implements IWarRoomMeetingRepository {
  async findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting | null> {
    const rows = await db
      .select()
      .from(warRoomMeetingTable)
      .where(
        and(
          eq(warRoomMeetingTable.id, id),
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId),
          isNull(warRoomMeetingTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = WarRoomMeetingMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: WarRoomMeetingFilter): Promise<{
    items: WarRoomMeeting[];
    total: number;
  }> {
    const { 
      organizationId, branchId, strategyId, meetingType, status, 
      facilitatorUserId, scheduledFrom, scheduledTo,
      page = 1, pageSize = 20 
    } = filter;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(warRoomMeetingTable.organizationId, organizationId),
      eq(warRoomMeetingTable.branchId, branchId),
      isNull(warRoomMeetingTable.deletedAt)
    ];

    if (strategyId) {
      conditions.push(eq(warRoomMeetingTable.strategyId, strategyId));
    }
    if (meetingType) {
      conditions.push(eq(warRoomMeetingTable.meetingType, meetingType));
    }
    if (status) {
      conditions.push(eq(warRoomMeetingTable.status, status));
    }
    if (facilitatorUserId) {
      conditions.push(eq(warRoomMeetingTable.facilitatorUserId, facilitatorUserId));
    }
    if (scheduledFrom) {
      conditions.push(gte(warRoomMeetingTable.scheduledAt, scheduledFrom));
    }
    if (scheduledTo) {
      conditions.push(lte(warRoomMeetingTable.scheduledAt, scheduledTo));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(warRoomMeetingTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(warRoomMeetingTable)
      .where(and(...conditions))
      .orderBy(desc(warRoomMeetingTable.scheduledAt));

    const rows = await queryPaginated<typeof warRoomMeetingTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => WarRoomMeetingMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  async findByStrategy(
    strategyId: string,
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]> {
    const rows = await db
      .select()
      .from(warRoomMeetingTable)
      .where(
        and(
          eq(warRoomMeetingTable.strategyId, strategyId),
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId),
          isNull(warRoomMeetingTable.deletedAt)
        )
      )
      .orderBy(desc(warRoomMeetingTable.scheduledAt));

    return rows
      .map(row => WarRoomMeetingMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findUpcoming(
    organizationId: number, 
    branchId: number,
    limit: number = 10
  ): Promise<WarRoomMeeting[]> {
    const now = new Date();
    
    const rows = await db
      .select()
      .from(warRoomMeetingTable)
      .where(
        and(
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId),
          eq(warRoomMeetingTable.status, 'SCHEDULED'),
          gte(warRoomMeetingTable.scheduledAt, now),
          isNull(warRoomMeetingTable.deletedAt)
        )
      )
      .orderBy(asc(warRoomMeetingTable.scheduledAt))
      .offset(0)
      .fetch(limit);

    return rows
      .map(row => WarRoomMeetingMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByFacilitator(
    facilitatorUserId: string,
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]> {
    const rows = await db
      .select()
      .from(warRoomMeetingTable)
      .where(
        and(
          eq(warRoomMeetingTable.facilitatorUserId, facilitatorUserId),
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId),
          isNull(warRoomMeetingTable.deletedAt)
        )
      )
      .orderBy(desc(warRoomMeetingTable.scheduledAt));

    return rows
      .map(row => WarRoomMeetingMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByParticipant(
    participantUserId: string,
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]> {
    // Busca por participante no JSON array
    const rows = await db
      .select()
      .from(warRoomMeetingTable)
      .where(
        and(
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId),
          sql`${warRoomMeetingTable.participants} LIKE ${`%"${participantUserId}"%`}`,
          isNull(warRoomMeetingTable.deletedAt)
        )
      )
      .orderBy(desc(warRoomMeetingTable.scheduledAt));

    return rows
      .map(row => WarRoomMeetingMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findInProgress(
    organizationId: number, 
    branchId: number
  ): Promise<WarRoomMeeting[]> {
    const rows = await db
      .select()
      .from(warRoomMeetingTable)
      .where(
        and(
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId),
          eq(warRoomMeetingTable.status, 'IN_PROGRESS'),
          isNull(warRoomMeetingTable.deletedAt)
        )
      )
      .orderBy(desc(warRoomMeetingTable.startedAt));

    return rows
      .map(row => WarRoomMeetingMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async save(entity: WarRoomMeeting): Promise<void> {
    const persistence = WarRoomMeetingMapper.toPersistence(entity);

    const existing = await this.exists(
      entity.id,
      entity.organizationId,
      entity.branchId
    );

    if (existing) {
      await db
        .update(warRoomMeetingTable)
        .set({
          strategyId: persistence.strategyId,
          meetingType: persistence.meetingType,
          title: persistence.title,
          description: persistence.description,
          scheduledAt: persistence.scheduledAt,
          expectedDuration: persistence.expectedDuration,
          startedAt: persistence.startedAt,
          endedAt: persistence.endedAt,
          participants: persistence.participants,
          agendaItems: persistence.agendaItems,
          decisions: persistence.decisions,
          minutes: persistence.minutes,
          minutesGeneratedAt: persistence.minutesGeneratedAt,
          status: persistence.status,
          facilitatorUserId: persistence.facilitatorUserId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(warRoomMeetingTable.id, persistence.id),
            eq(warRoomMeetingTable.organizationId, persistence.organizationId),
            eq(warRoomMeetingTable.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(warRoomMeetingTable).values(persistence);
    }
  }

  async delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void> {
    await db
      .update(warRoomMeetingTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(warRoomMeetingTable.id, id),
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId)
        )
      );
  }

  private async exists(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<boolean> {
    const rows = await db
      .select({ id: warRoomMeetingTable.id })
      .from(warRoomMeetingTable)
      .where(
        and(
          eq(warRoomMeetingTable.id, id),
          eq(warRoomMeetingTable.organizationId, organizationId),
          eq(warRoomMeetingTable.branchId, branchId),
          isNull(warRoomMeetingTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}
