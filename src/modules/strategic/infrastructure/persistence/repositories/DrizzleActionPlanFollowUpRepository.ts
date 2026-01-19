/**
 * Repository: DrizzleActionPlanFollowUpRepository
 * Implementação Drizzle do repositório de follow-ups 3G
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, desc, sql, between } from 'drizzle-orm';
import type { IActionPlanFollowUpRepository, FollowUpFilter } from '../../../domain/ports/output/IActionPlanFollowUpRepository';
import { ActionPlanFollowUp } from '../../../domain/entities/ActionPlanFollowUp';
import { ActionPlanFollowUpMapper } from '../mappers/ActionPlanFollowUpMapper';
import { actionPlanFollowUpTable } from '../schemas/action-plan-follow-up.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';

export class DrizzleActionPlanFollowUpRepository implements IActionPlanFollowUpRepository {
  async getNextFollowUpNumber(actionPlanId: string): Promise<number> {
    const result = await db
      .select({ maxNumber: sql<number>`MAX(${actionPlanFollowUpTable.followUpNumber})` })
      .from(actionPlanFollowUpTable)
      .where(eq(actionPlanFollowUpTable.actionPlanId, actionPlanId));

    const maxNumber = result[0]?.maxNumber ?? 0;
    return maxNumber + 1;
  }

  async findById(id: string): Promise<ActionPlanFollowUp | null> {
    const rows = await db
      .select()
      .from(actionPlanFollowUpTable)
      .where(eq(actionPlanFollowUpTable.id, id));

    if (rows.length === 0) return null;

    const result = ActionPlanFollowUpMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByActionPlanId(actionPlanId: string): Promise<ActionPlanFollowUp[]> {
    const rows = await db
      .select()
      .from(actionPlanFollowUpTable)
      .where(eq(actionPlanFollowUpTable.actionPlanId, actionPlanId))
      .orderBy(desc(actionPlanFollowUpTable.followUpNumber));

    return rows
      .map(row => ActionPlanFollowUpMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findMany(filter: FollowUpFilter): Promise<{
    items: ActionPlanFollowUp[];
    total: number;
  }> {
    const { 
      actionPlanId, executionStatus, verifiedBy, 
      fromDate, toDate, page = 1, pageSize = 20 
    } = filter;

    // Build conditions
    const conditions = [
      eq(actionPlanFollowUpTable.actionPlanId, actionPlanId)
    ];

    if (executionStatus) {
      conditions.push(eq(actionPlanFollowUpTable.executionStatus, executionStatus));
    }
    if (verifiedBy) {
      conditions.push(eq(actionPlanFollowUpTable.verifiedBy, verifiedBy));
    }
    if (fromDate && toDate) {
      conditions.push(between(actionPlanFollowUpTable.followUpDate, fromDate, toDate));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(actionPlanFollowUpTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(actionPlanFollowUpTable)
      .where(and(...conditions))
      .orderBy(desc(actionPlanFollowUpTable.followUpNumber));

    const rows = await queryPaginated<typeof actionPlanFollowUpTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => ActionPlanFollowUpMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  async findLastByActionPlanId(actionPlanId: string): Promise<ActionPlanFollowUp | null> {
    const rows = await db
      .select()
      .from(actionPlanFollowUpTable)
      .where(eq(actionPlanFollowUpTable.actionPlanId, actionPlanId))
      .orderBy(desc(actionPlanFollowUpTable.followUpNumber))
      .offset(0)
      .fetch(1);

    if (rows.length === 0) return null;

    const result = ActionPlanFollowUpMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async countRepropositionsByActionPlanId(actionPlanId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(actionPlanFollowUpTable)
      .where(
        and(
          eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
          eq(actionPlanFollowUpTable.requiresNewPlan, true)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  async findWithRepropositions(actionPlanId: string): Promise<ActionPlanFollowUp[]> {
    const rows = await db
      .select()
      .from(actionPlanFollowUpTable)
      .where(
        and(
          eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
          eq(actionPlanFollowUpTable.requiresNewPlan, true)
        )
      )
      .orderBy(desc(actionPlanFollowUpTable.followUpNumber));

    return rows
      .map(row => ActionPlanFollowUpMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async save(entity: ActionPlanFollowUp): Promise<void> {
    // Follow-ups são imutáveis após criação - apenas INSERT
    const persistence = ActionPlanFollowUpMapper.toPersistence(entity);
    await db.insert(actionPlanFollowUpTable).values(persistence);
  }
}
