/**
 * Repository: DrizzleApprovalHistoryRepository
 * Implementação Drizzle do repositório de histórico de aprovação
 *
 * @module strategic/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, gte, lte } from 'drizzle-orm';
import type { IApprovalHistoryRepository } from '../../../domain/ports/output/IApprovalHistoryRepository';
import { ApprovalHistory } from '../../../domain/entities/ApprovalHistory';
import { ApprovalHistoryMapper } from '../mappers/ApprovalHistoryMapper';
import { approvalHistoryTable } from '../schemas/approval-history.schema';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import { injectable } from 'tsyringe';

@injectable()
export class DrizzleApprovalHistoryRepository implements IApprovalHistoryRepository {
  async findByStrategyId(
    strategyId: string,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalHistory[]> {
    const rows = await db
      .select()
      .from(approvalHistoryTable)
      .where(
        and(
          eq(approvalHistoryTable.strategyId, strategyId),
          eq(approvalHistoryTable.organizationId, organizationId),
          eq(approvalHistoryTable.branchId, branchId),
          isNull(approvalHistoryTable.deletedAt)
        )
      )
      .orderBy(desc(approvalHistoryTable.createdAt));

    return rows
      .map((row) => ApprovalHistoryMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }

  async findByActorUserId(
    actorUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalHistory[]> {
    const rows = await db
      .select()
      .from(approvalHistoryTable)
      .where(
        and(
          eq(approvalHistoryTable.actorUserId, actorUserId),
          eq(approvalHistoryTable.organizationId, organizationId),
          eq(approvalHistoryTable.branchId, branchId),
          isNull(approvalHistoryTable.deletedAt)
        )
      )
      .orderBy(desc(approvalHistoryTable.createdAt));

    return rows
      .map((row) => ApprovalHistoryMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }

  async save(entity: ApprovalHistory): Promise<void> {
    const persistence = ApprovalHistoryMapper.toPersistence(entity);
    await db.insert(approvalHistoryTable).values(persistence);
  }

  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalHistory | null> {
    const rows = await db
      .select()
      .from(approvalHistoryTable)
      .where(
        and(
          eq(approvalHistoryTable.id, id),
          eq(approvalHistoryTable.organizationId, organizationId),
          eq(approvalHistoryTable.branchId, branchId),
          isNull(approvalHistoryTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = ApprovalHistoryMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByPeriod(
    from: Date,
    to: Date,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalHistory[]> {
    const rows = await db
      .select()
      .from(approvalHistoryTable)
      .where(
        and(
          eq(approvalHistoryTable.organizationId, organizationId),
          eq(approvalHistoryTable.branchId, branchId),
          gte(approvalHistoryTable.createdAt, from),
          lte(approvalHistoryTable.createdAt, to),
          isNull(approvalHistoryTable.deletedAt)
        )
      )
      .orderBy(desc(approvalHistoryTable.createdAt));

    return rows
      .map((row) => ApprovalHistoryMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }
}
