/**
 * Repository: DrizzleStrategicGoalRepository
 * Implementação Drizzle do repositório de metas estratégicas
 *
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import type { IStrategicGoalRepository, GoalFilter } from '../../../domain/ports/output/IStrategicGoalRepository';
import { StrategicGoal } from '../../../domain/entities/StrategicGoal';
import { StrategicGoalMapper } from '../mappers/StrategicGoalMapper';
import { strategicGoalTable } from '../schemas/strategic-goal.schema';
import { bscPerspectiveTable } from '../schemas/bsc-perspective.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';
import { injectable } from 'tsyringe';

@injectable()
export class DrizzleStrategicGoalRepository implements IStrategicGoalRepository {
  async findById(id: string, organizationId: number, branchId: number): Promise<StrategicGoal | null> {
    const rows = await db
      .select()
      .from(strategicGoalTable)
      .where(
        and(
          eq(strategicGoalTable.id, id),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId),
          isNull(strategicGoalTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StrategicGoalMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: GoalFilter): Promise<{ items: StrategicGoal[]; total: number }> {
    const {
      organizationId,
      branchId,
      strategyId, // ✅ suportado via perspectiva (não via coluna na meta)
      perspectiveId,
      parentGoalId,
      cascadeLevel,
      status,
      ownerUserId,
      page = 1,
      pageSize = 20,
    } = filter;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(strategicGoalTable.organizationId, organizationId),
      eq(strategicGoalTable.branchId, branchId),
      isNull(strategicGoalTable.deletedAt),
    ];

    /**
     * ✅ CORREÇÃO BUG 2: Usar SUBQUERY em vez de query separada (evita N+1 em paginação)
     * strategicGoalTable NÃO possui strategyId (coluna), então filtramos por strategyId
     * através de subquery nas perspectivas da estratégia:
     * - perspectiveId IN (SELECT id FROM bsc_perspective WHERE strategy_id = ?)
     * - 100% SQL, sem materializar array em memória
     */
    if (strategyId) {
      const perspectiveIdsSubquery = db
        .select({ id: bscPerspectiveTable.id })
        .from(bscPerspectiveTable)
        .where(eq(bscPerspectiveTable.strategyId, strategyId));

      conditions.push(inArray(strategicGoalTable.perspectiveId, perspectiveIdsSubquery));
    }

    if (perspectiveId) {
      conditions.push(eq(strategicGoalTable.perspectiveId, perspectiveId));
    }
    if (parentGoalId) {
      conditions.push(eq(strategicGoalTable.parentGoalId, parentGoalId));
    }
    if (cascadeLevel) {
      conditions.push(eq(strategicGoalTable.cascadeLevel, cascadeLevel));
    }
    if (status) {
      conditions.push(eq(strategicGoalTable.status, status));
    }
    if (ownerUserId) {
      conditions.push(eq(strategicGoalTable.ownerUserId, ownerUserId));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(strategicGoalTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(strategicGoalTable)
      .where(and(...conditions))
      .orderBy(strategicGoalTable.code);

    const rows = await queryPaginated<typeof strategicGoalTable.$inferSelect>(query, { page, pageSize });

    const items = rows
      .map((row) => StrategicGoalMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);

    return { items, total };
  }

  async findByParentId(parentGoalId: string, organizationId: number, branchId: number): Promise<StrategicGoal[]> {
    const rows = await db
      .select()
      .from(strategicGoalTable)
      .where(
        and(
          eq(strategicGoalTable.parentGoalId, parentGoalId),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId),
          isNull(strategicGoalTable.deletedAt)
        )
      )
      .orderBy(strategicGoalTable.code);

    return rows
      .map((row) => StrategicGoalMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }

  async findByPerspective(perspectiveId: string, organizationId: number, branchId: number): Promise<StrategicGoal[]> {
    const rows = await db
      .select()
      .from(strategicGoalTable)
      .where(
        and(
          eq(strategicGoalTable.perspectiveId, perspectiveId),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId),
          isNull(strategicGoalTable.deletedAt)
        )
      )
      .orderBy(strategicGoalTable.code);

    return rows
      .map((row) => StrategicGoalMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }

  async findByCascadeLevel(cascadeLevel: string, organizationId: number, branchId: number): Promise<StrategicGoal[]> {
    const rows = await db
      .select()
      .from(strategicGoalTable)
      .where(
        and(
          eq(strategicGoalTable.cascadeLevel, cascadeLevel),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId),
          isNull(strategicGoalTable.deletedAt)
        )
      )
      .orderBy(strategicGoalTable.code);

    return rows
      .map((row) => StrategicGoalMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }

  async findRootGoals(organizationId: number, branchId: number): Promise<StrategicGoal[]> {
    const rows = await db
      .select()
      .from(strategicGoalTable)
      .where(
        and(
          isNull(strategicGoalTable.parentGoalId),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId),
          isNull(strategicGoalTable.deletedAt)
        )
      )
      .orderBy(strategicGoalTable.code);

    return rows
      .map((row) => StrategicGoalMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }

  async save(entity: StrategicGoal): Promise<void> {
    const persistence = StrategicGoalMapper.toPersistence(entity);

    const existing = await this.exists(entity.id, entity.organizationId, entity.branchId);

    if (existing) {
      await db
        .update(strategicGoalTable)
        .set({
          perspectiveId: persistence.perspectiveId,
          parentGoalId: persistence.parentGoalId,
          code: persistence.code,
          description: persistence.description,
          cascadeLevel: persistence.cascadeLevel,
          targetValue: persistence.targetValue,
          currentValue: persistence.currentValue,
          baselineValue: persistence.baselineValue,
          unit: persistence.unit,
          polarity: persistence.polarity,
          weight: persistence.weight,
          ownerUserId: persistence.ownerUserId,
          ownerBranchId: persistence.ownerBranchId,
          startDate: persistence.startDate,
          dueDate: persistence.dueDate,
          status: persistence.status,
          mapPositionX: persistence.mapPositionX,
          mapPositionY: persistence.mapPositionY,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(strategicGoalTable.id, persistence.id),
            eq(strategicGoalTable.organizationId, persistence.organizationId),
            eq(strategicGoalTable.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(strategicGoalTable).values(persistence);
    }
  }

  async delete(id: string, organizationId: number, branchId: number): Promise<void> {
    await db
      .update(strategicGoalTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(strategicGoalTable.id, id),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId)
        )
      );
  }

  async findByCode(code: string, organizationId: number, branchId: number): Promise<StrategicGoal | null> {
    const rows = await db
      .select()
      .from(strategicGoalTable)
      .where(
        and(
          eq(strategicGoalTable.code, code.toUpperCase()),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId),
          isNull(strategicGoalTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = StrategicGoalMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async addValueVersion(params: {
    goalId: string;
    organizationId: number;
    branchId: number;
    valueType: 'ACTUAL' | 'BUDGET' | 'FORECAST';
    periodStart: Date;
    periodEnd: Date;
    targetValue: number;
  }): Promise<void> {
    const { goalId, organizationId, branchId, valueType, periodStart, targetValue } = params;

    // Extrair year do periodStart (Goals usam period_year sem month)
    const year = periodStart.getFullYear();

    // Usar SQL raw pois não há schema Drizzle para goal_value_version
    await db.execute(sql`
      MERGE INTO strategic_goal_value_version AS target
      USING (
        SELECT
          ${goalId} as goal_id,
          ${organizationId} as organization_id,
          ${branchId} as branch_id,
          ${valueType} as version_type,
          ${year} as period_year,
          ${targetValue} as target_value
      ) AS source
      ON (
        target.goal_id = source.goal_id
        AND target.version_type = source.version_type
        AND target.period_year = source.period_year
        AND target.organization_id = source.organization_id
        AND target.branch_id = source.branch_id
        AND target.deleted_at IS NULL
      )
      WHEN MATCHED THEN
        UPDATE SET
          target_value = source.target_value,
          updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (id, organization_id, branch_id, goal_id, version_type, period_year, period_quarter, target_value, created_by, created_at, updated_at)
        VALUES (NEWID(), source.organization_id, source.branch_id, source.goal_id, source.version_type, source.period_year, NULL, source.target_value, 'system', GETDATE(), GETDATE());
    `);
  }

  private async exists(id: string, organizationId: number, branchId: number): Promise<boolean> {
    const rows = await db
      .select({ id: strategicGoalTable.id })
      .from(strategicGoalTable)
      .where(
        and(
          eq(strategicGoalTable.id, id),
          eq(strategicGoalTable.organizationId, organizationId),
          eq(strategicGoalTable.branchId, branchId),
          isNull(strategicGoalTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}