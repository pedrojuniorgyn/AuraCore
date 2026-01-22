/**
 * Repository: DrizzleActionPlanRepository
 * Implementação Drizzle do repositório de planos de ação
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, sql, lt } from 'drizzle-orm';
import type { IActionPlanRepository, ActionPlanFilter } from '../../../domain/ports/output/IActionPlanRepository';
import { ActionPlan } from '../../../domain/entities/ActionPlan';
import { ActionPlanMapper } from '../mappers/ActionPlanMapper';
import { actionPlanTable } from '../schemas/action-plan.schema';
import { db } from '@/lib/db';
import { queryPaginated, queryFirst } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';

export class DrizzleActionPlanRepository implements IActionPlanRepository {
  async getNextCode(organizationId: number, branchId: number): Promise<string> {
    // Buscar último código do ano atual para gerar sequencial
    const year = new Date().getFullYear();
    const prefix = `PA-${year}-`;
    
    const result = await queryFirst<{ code: string }>(
      db
        .select({ code: actionPlanTable.code })
        .from(actionPlanTable)
        .where(
          and(
            eq(actionPlanTable.organizationId, organizationId),
            eq(actionPlanTable.branchId, branchId),
            sql`${actionPlanTable.code} LIKE ${prefix + '%'}`
          )
        )
        .orderBy(desc(actionPlanTable.code))
    );
    
    if (!result) {
      return `${prefix}0001`;
    }
    
    const lastCode = result.code;
    const lastNumber = parseInt(lastCode.replace(prefix, ''), 10) || 0;
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
    
    return `${prefix}${nextNumber}`;
  }

  async findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<ActionPlan | null> {
    const rows = await db
      .select()
      .from(actionPlanTable)
      .where(
        and(
          eq(actionPlanTable.id, id),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = ActionPlanMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: ActionPlanFilter): Promise<{
    items: ActionPlan[];
    total: number;
  }> {
    const { 
      organizationId, branchId, goalId, whoUserId, pdcaCycle, 
      status, priority, parentActionPlanId, overdueOnly,
      followUpDueBefore, page = 1, pageSize = 20 
    } = filter;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(actionPlanTable.organizationId, organizationId),
      eq(actionPlanTable.branchId, branchId),
      isNull(actionPlanTable.deletedAt)
    ];

    if (goalId) {
      conditions.push(eq(actionPlanTable.goalId, goalId));
    }
    if (whoUserId) {
      conditions.push(eq(actionPlanTable.whoUserId, whoUserId));
    }
    if (pdcaCycle) {
      conditions.push(eq(actionPlanTable.pdcaCycle, pdcaCycle));
    }
    if (status) {
      conditions.push(eq(actionPlanTable.status, status));
    }
    if (priority) {
      conditions.push(eq(actionPlanTable.priority, priority));
    }
    if (parentActionPlanId) {
      conditions.push(eq(actionPlanTable.parentActionPlanId, parentActionPlanId));
    }
    if (overdueOnly) {
      conditions.push(lt(actionPlanTable.whenEnd, new Date()));
    }
    if (followUpDueBefore) {
      conditions.push(lt(actionPlanTable.nextFollowUpDate, followUpDueBefore));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(actionPlanTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(actionPlanTable)
      .where(and(...conditions))
      .orderBy(desc(actionPlanTable.createdAt));

    const rows = await queryPaginated<typeof actionPlanTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => ActionPlanMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  async findRepropositions(
    originalPlanId: string,
    organizationId: number, 
    branchId: number
  ): Promise<ActionPlan[]> {
    const rows = await db
      .select()
      .from(actionPlanTable)
      .where(
        and(
          eq(actionPlanTable.parentActionPlanId, originalPlanId),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      )
      .orderBy(desc(actionPlanTable.repropositionNumber));

    return rows
      .map(row => ActionPlanMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findPendingFollowUps(
    organizationId: number, 
    branchId: number,
    beforeDate: Date
  ): Promise<ActionPlan[]> {
    const rows = await db
      .select()
      .from(actionPlanTable)
      .where(
        and(
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          lt(actionPlanTable.nextFollowUpDate, beforeDate),
          isNull(actionPlanTable.deletedAt)
        )
      )
      .orderBy(actionPlanTable.nextFollowUpDate);

    return rows
      .map(row => ActionPlanMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async save(entity: ActionPlan): Promise<void> {
    const persistence = ActionPlanMapper.toPersistence(entity);

    const existing = await this.exists(
      entity.id,
      entity.organizationId,
      entity.branchId
    );

    if (existing) {
      await db
        .update(actionPlanTable)
        .set({
          goalId: persistence.goalId,
          code: persistence.code,
          what: persistence.what,
          why: persistence.why,
          whereLocation: persistence.whereLocation,
          whenStart: persistence.whenStart,
          whenEnd: persistence.whenEnd,
          who: persistence.who,
          whoUserId: persistence.whoUserId,
          how: persistence.how,
          howMuchAmount: persistence.howMuchAmount,
          howMuchCurrency: persistence.howMuchCurrency,
          pdcaCycle: persistence.pdcaCycle,
          completionPercent: persistence.completionPercent,
          priority: persistence.priority,
          status: persistence.status,
          evidenceUrls: persistence.evidenceUrls,
          nextFollowUpDate: persistence.nextFollowUpDate,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(actionPlanTable.id, persistence.id),
            eq(actionPlanTable.organizationId, persistence.organizationId),
            eq(actionPlanTable.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(actionPlanTable).values(persistence);
    }
  }

  async delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void> {
    await db
      .update(actionPlanTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(actionPlanTable.id, id),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId)
        )
      );
  }

  private async exists(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<boolean> {
    const rows = await db
      .select({ id: actionPlanTable.id })
      .from(actionPlanTable)
      .where(
        and(
          eq(actionPlanTable.id, id),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}
