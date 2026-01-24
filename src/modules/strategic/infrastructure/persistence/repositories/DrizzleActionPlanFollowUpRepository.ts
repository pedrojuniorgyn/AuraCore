/**
 * Repository: DrizzleActionPlanFollowUpRepository
 * Implementação Drizzle do repositório de follow-ups 3G
 * 
 * @module strategic/infrastructure/persistence/repositories
 * 
 * MULTI-TENANCY: Follow-ups herdam tenancy do ActionPlan pai.
 * Todas as queries fazem JOIN com action_plan para validar organizationId + branchId.
 * 
 * @see INFRA-006: TODA query DEVE filtrar por organizationId + branchId
 */
import { eq, and, desc, sql, between, isNull } from 'drizzle-orm';
import type { IActionPlanFollowUpRepository, FollowUpFilter } from '../../../domain/ports/output/IActionPlanFollowUpRepository';
import { ActionPlanFollowUp } from '../../../domain/entities/ActionPlanFollowUp';
import { ActionPlanFollowUpMapper } from '../mappers/ActionPlanFollowUpMapper';
import { actionPlanFollowUpTable } from '../schemas/action-plan-follow-up.schema';
import { actionPlanTable } from '../schemas/action-plan.schema';
import { db } from '@/lib/db';
import { queryPaginated, queryFirst } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';
import { injectable } from 'tsyringe';

@injectable()
export class DrizzleActionPlanFollowUpRepository implements IActionPlanFollowUpRepository {
  /**
   * Gera próximo número de follow-up para um plano
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  async getNextFollowUpNumber(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<number> {
    // MULTI-TENANCY: Validar que o action_plan pertence ao tenant
    const result = await db
      .select({ maxNumber: sql<number>`MAX(${actionPlanFollowUpTable.followUpNumber})` })
      .from(actionPlanFollowUpTable)
      .innerJoin(
        actionPlanTable,
        eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
      )
      .where(
        and(
          eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      );

    const maxNumber = result[0]?.maxNumber ?? 0;
    return maxNumber + 1;
  }

  /**
   * Busca follow-up por ID com validação multi-tenant
   * @param id ID do follow-up
   * @param organizationId Organization ID para validação
   * @param branchId Branch ID para validação
   */
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp | null> {
    // MULTI-TENANCY: JOIN com action_plan para validar tenant
    const rows = await db
      .select({
        followUp: actionPlanFollowUpTable,
      })
      .from(actionPlanFollowUpTable)
      .innerJoin(
        actionPlanTable,
        eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
      )
      .where(
        and(
          eq(actionPlanFollowUpTable.id, id),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = ActionPlanFollowUpMapper.toDomain(rows[0].followUp);
    return Result.isOk(result) ? result.value : null;
  }

  /**
   * Lista follow-ups de um plano de ação
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  async findByActionPlanId(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp[]> {
    // MULTI-TENANCY: JOIN com action_plan para validar tenant
    const rows = await db
      .select({
        followUp: actionPlanFollowUpTable,
      })
      .from(actionPlanFollowUpTable)
      .innerJoin(
        actionPlanTable,
        eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
      )
      .where(
        and(
          eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      )
      .orderBy(desc(actionPlanFollowUpTable.followUpNumber));

    return rows
      .map(row => ActionPlanFollowUpMapper.toDomain(row.followUp))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  /**
   * Lista follow-ups com paginação (filter inclui multi-tenancy)
   */
  async findMany(filter: FollowUpFilter): Promise<{
    items: ActionPlanFollowUp[];
    total: number;
  }> {
    const { 
      organizationId,
      branchId,
      actionPlanId, 
      executionStatus, 
      verifiedBy, 
      fromDate, 
      toDate, 
      page = 1, 
      pageSize = 20 
    } = filter;

    // MULTI-TENANCY: Validar organizationId e branchId obrigatórios
    if (!organizationId || !branchId) {
      throw new Error('organizationId e branchId são obrigatórios para multi-tenancy');
    }

    // Build conditions com JOIN para multi-tenancy
    const conditions = [
      eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
      eq(actionPlanTable.organizationId, organizationId),
      eq(actionPlanTable.branchId, branchId),
      isNull(actionPlanTable.deletedAt)
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
      .innerJoin(
        actionPlanTable,
        eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
      )
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select({
        followUp: actionPlanFollowUpTable,
      })
      .from(actionPlanFollowUpTable)
      .innerJoin(
        actionPlanTable,
        eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
      )
      .where(and(...conditions))
      .orderBy(desc(actionPlanFollowUpTable.followUpNumber));

    const rows = await queryPaginated<{ followUp: typeof actionPlanFollowUpTable.$inferSelect }>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => ActionPlanFollowUpMapper.toDomain(row.followUp))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  /**
   * Busca o último follow-up de um plano
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  async findLastByActionPlanId(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp | null> {
    // MULTI-TENANCY: JOIN com action_plan para validar tenant
    const row = await queryFirst<{ followUp: typeof actionPlanFollowUpTable.$inferSelect }>(
      db
        .select({
          followUp: actionPlanFollowUpTable,
        })
        .from(actionPlanFollowUpTable)
        .innerJoin(
          actionPlanTable,
          eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
        )
        .where(
          and(
            eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
            eq(actionPlanTable.organizationId, organizationId),
            eq(actionPlanTable.branchId, branchId),
            isNull(actionPlanTable.deletedAt)
          )
        )
        .orderBy(desc(actionPlanFollowUpTable.followUpNumber))
    );

    if (!row) return null;

    const result = ActionPlanFollowUpMapper.toDomain(row.followUp);
    return Result.isOk(result) ? result.value : null;
  }

  /**
   * Conta o número de reproposições para um plano
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  async countRepropositionsByActionPlanId(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<number> {
    // MULTI-TENANCY: JOIN com action_plan para validar tenant
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(actionPlanFollowUpTable)
      .innerJoin(
        actionPlanTable,
        eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
      )
      .where(
        and(
          eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
          eq(actionPlanFollowUpTable.requiresNewPlan, true),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Busca follow-ups que geraram reproposição
   * @param actionPlanId ID do plano de ação
   * @param organizationId Organization ID para validação multi-tenant
   * @param branchId Branch ID para validação multi-tenant
   */
  async findWithRepropositions(
    actionPlanId: string,
    organizationId: number,
    branchId: number
  ): Promise<ActionPlanFollowUp[]> {
    // MULTI-TENANCY: JOIN com action_plan para validar tenant
    const rows = await db
      .select({
        followUp: actionPlanFollowUpTable,
      })
      .from(actionPlanFollowUpTable)
      .innerJoin(
        actionPlanTable,
        eq(actionPlanFollowUpTable.actionPlanId, actionPlanTable.id)
      )
      .where(
        and(
          eq(actionPlanFollowUpTable.actionPlanId, actionPlanId),
          eq(actionPlanFollowUpTable.requiresNewPlan, true),
          eq(actionPlanTable.organizationId, organizationId),
          eq(actionPlanTable.branchId, branchId),
          isNull(actionPlanTable.deletedAt)
        )
      )
      .orderBy(desc(actionPlanFollowUpTable.followUpNumber));

    return rows
      .map(row => ActionPlanFollowUpMapper.toDomain(row.followUp))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  /**
   * Salva (insert apenas - follow-ups são imutáveis após criação)
   */
  async save(entity: ActionPlanFollowUp): Promise<void> {
    // Follow-ups são imutáveis após criação - apenas INSERT
    const persistence = ActionPlanFollowUpMapper.toPersistence(entity);
    await db.insert(actionPlanFollowUpTable).values(persistence);
  }
}
