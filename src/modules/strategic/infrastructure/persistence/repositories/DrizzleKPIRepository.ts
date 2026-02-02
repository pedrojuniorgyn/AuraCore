/**
 * Repository: DrizzleKPIRepository
 * Implementação Drizzle do repositório de KPIs
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm';
import type { IKPIRepository, KPIFilter } from '../../../domain/ports/output/IKPIRepository';
import { KPI } from '../../../domain/entities/KPI';
import { KPIMapper } from '../mappers/KPIMapper';
import { kpiTable } from '../schemas/kpi.schema';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { Result } from '@/shared/domain';
import { injectable } from 'tsyringe';

@injectable()
export class DrizzleKPIRepository implements IKPIRepository {
  async findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<KPI | null> {
    const rows = await db
      .select()
      .from(kpiTable)
      .where(
        and(
          eq(kpiTable.id, id),
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId),
          isNull(kpiTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = KPIMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByCode(
    code: string, 
    organizationId: number, 
    branchId: number
  ): Promise<KPI | null> {
    const rows = await db
      .select()
      .from(kpiTable)
      .where(
        and(
          eq(kpiTable.code, code.toUpperCase()),
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId),
          isNull(kpiTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = KPIMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findMany(filter: KPIFilter): Promise<{
    items: KPI[];
    total: number;
  }> {
    const { 
      organizationId, branchId, goalId, ownerUserId, 
      status, sourceModule, autoCalculateOnly,
      page = 1, pageSize = 20 
    } = filter;

    // Build conditions (multi-tenancy + soft delete)
    const conditions = [
      eq(kpiTable.organizationId, organizationId),
      eq(kpiTable.branchId, branchId),
      isNull(kpiTable.deletedAt)
    ];

    if (goalId) {
      conditions.push(eq(kpiTable.goalId, goalId));
    }
    if (ownerUserId) {
      conditions.push(eq(kpiTable.ownerUserId, ownerUserId));
    }
    if (status) {
      conditions.push(eq(kpiTable.status, status));
    }
    if (sourceModule) {
      conditions.push(eq(kpiTable.sourceModule, sourceModule));
    }
    if (autoCalculateOnly) {
      conditions.push(sql`${kpiTable.autoCalculate} = 1`);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(kpiTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items
    const query = db
      .select()
      .from(kpiTable)
      .where(and(...conditions))
      .orderBy(desc(kpiTable.createdAt));

    const rows = await queryPaginated<typeof kpiTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    const items = rows
      .map(row => KPIMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);

    return { items, total };
  }

  async findByGoalId(
    goalId: string,
    organizationId: number,
    branchId: number
  ): Promise<KPI[]> {
    const rows = await db
      .select()
      .from(kpiTable)
      .where(
        and(
          eq(kpiTable.goalId, goalId),
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId),
          isNull(kpiTable.deletedAt)
        )
      );

    return rows
      .map(row => KPIMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findByGoalIds(
    goalIds: string[],
    organizationId: number,
    branchId: number
  ): Promise<Map<string, KPI[]>> {
    // Retorna mapa vazio se não há goals
    if (goalIds.length === 0) {
      return new Map();
    }

    // ⚠️ MULTI-TENANCY: Sempre filtrar por org + branch
    // Query única para todos os KPIs dos goals
    const rows = await db
      .select()
      .from(kpiTable)
      .where(
        and(
          inArray(kpiTable.goalId, goalIds),
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId),  // ⚠️ OBRIGATÓRIO
          isNull(kpiTable.deletedAt)
        )
      )
      .orderBy(kpiTable.code);

    // Agrupa KPIs por goalId
    const kpisByGoalId = new Map<string, KPI[]>();

    // Inicializa todas as entradas do mapa (mesmo goals sem KPIs)
    for (const goalId of goalIds) {
      kpisByGoalId.set(goalId, []);
    }

    // Popula o mapa com os KPIs encontrados
    for (const row of rows) {
      if (!row.goalId) continue;

      const result = KPIMapper.toDomain(row);
      if (Result.isOk(result)) {
        const kpis = kpisByGoalId.get(row.goalId) ?? [];
        kpis.push(result.value);
        kpisByGoalId.set(row.goalId, kpis);
      }
    }

    return kpisByGoalId;
  }

  async findForAutoCalculation(
    organizationId: number, 
    branchId: number
  ): Promise<KPI[]> {
    const rows = await db
      .select()
      .from(kpiTable)
      .where(
        and(
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId),
          sql`${kpiTable.autoCalculate} = 1`,
          isNull(kpiTable.deletedAt)
        )
      );

    return rows
      .map(row => KPIMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async findCritical(
    organizationId: number, 
    branchId: number
  ): Promise<KPI[]> {
    const rows = await db
      .select()
      .from(kpiTable)
      .where(
        and(
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId),
          eq(kpiTable.status, 'RED'),
          isNull(kpiTable.deletedAt)
        )
      );

    return rows
      .map(row => KPIMapper.toDomain(row))
      .filter(Result.isOk)
      .map(r => r.value);
  }

  async save(entity: KPI): Promise<void> {
    const persistence = KPIMapper.toPersistence(entity);

    const existing = await this.exists(
      entity.id,
      entity.organizationId,
      entity.branchId
    );

    if (existing) {
      await db
        .update(kpiTable)
        .set({
          goalId: persistence.goalId,
          code: persistence.code,
          name: persistence.name,
          description: persistence.description,
          unit: persistence.unit,
          polarity: persistence.polarity,
          frequency: persistence.frequency,
          targetValue: persistence.targetValue,
          currentValue: persistence.currentValue,
          baselineValue: persistence.baselineValue,
          alertThreshold: persistence.alertThreshold,
          criticalThreshold: persistence.criticalThreshold,
          autoCalculate: persistence.autoCalculate,
          sourceModule: persistence.sourceModule,
          sourceQuery: persistence.sourceQuery,
          status: persistence.status,
          lastCalculatedAt: persistence.lastCalculatedAt,
          ownerUserId: persistence.ownerUserId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(kpiTable.id, persistence.id),
            eq(kpiTable.organizationId, persistence.organizationId),
            eq(kpiTable.branchId, persistence.branchId)
          )
        );
    } else {
      await db.insert(kpiTable).values(persistence);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .update(kpiTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(kpiTable.id, id),
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId)
        )
      );
  }

  async addValueVersion(params: {
    kpiId: string;
    organizationId: number;
    branchId: number;
    valueType: 'ACTUAL' | 'BUDGET' | 'FORECAST';
    periodStart: Date;
    periodEnd: Date;
    value: number;
  }): Promise<void> {
    const { kpiId, organizationId, branchId, valueType, periodStart, value } = params;

    // Extrair year e month do periodStart
    const year = periodStart.getFullYear();
    const month = periodStart.getMonth() + 1;

    // Usar SQL raw pois não há schema Drizzle para value_version
    await db.execute(sql`
      MERGE INTO strategic_kpi_value_version AS target
      USING (
        SELECT
          ${kpiId} as kpi_id,
          ${organizationId} as organization_id,
          ${branchId} as branch_id,
          ${valueType} as version_type,
          ${year} as period_year,
          ${month} as period_month,
          ${value} as value
      ) AS source
      ON (
        target.kpi_id = source.kpi_id
        AND target.version_type = source.version_type
        AND target.period_year = source.period_year
        AND target.period_month = source.period_month
        AND target.organization_id = source.organization_id
        AND target.branch_id = source.branch_id
        AND target.deleted_at IS NULL
      )
      WHEN MATCHED THEN
        UPDATE SET
          value = source.value,
          updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (id, organization_id, branch_id, kpi_id, version_type, period_year, period_month, value, created_by, created_at, updated_at)
        VALUES (NEWID(), source.organization_id, source.branch_id, source.kpi_id, source.version_type, source.period_year, source.period_month, source.value, 'system', GETDATE(), GETDATE());
    `);
  }

  private async exists(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<boolean> {
    const rows = await db
      .select({ id: kpiTable.id })
      .from(kpiTable)
      .where(
        and(
          eq(kpiTable.id, id),
          eq(kpiTable.organizationId, organizationId),
          eq(kpiTable.branchId, branchId),
          isNull(kpiTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}
