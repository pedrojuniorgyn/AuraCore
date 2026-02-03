/**
 * Repository: DrizzleApprovalPermissionRepository
 * Implementação Drizzle para permissões de aprovação
 * 
 * @module strategic/infrastructure/persistence/repositories
 * @see REPO-001 a REPO-012
 */
import { injectable } from 'tsyringe';
import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import type { IApprovalPermissionRepository } from '../../../domain/ports/output/IApprovalPermissionRepository';
import { ApprovalDelegate } from '../../../domain/entities/ApprovalDelegate';
import { ApprovalDelegateMapper } from '../mappers/ApprovalDelegateMapper';
import {
  approvalDelegateTable,
  approvalApproverTable,
} from '../schemas';

@injectable()
export class DrizzleApprovalPermissionRepository
  implements IApprovalPermissionRepository
{
  /**
   * Busca IDs de usuários aprovadores configurados
   * REPO-005: Filtra organizationId + branchId
   * REPO-006: Filtra isActive = true
   */
  async findApproversByOrg(
    organizationId: number,
    branchId: number
  ): Promise<number[]> {
    const rows = await db
      .select({ userId: approvalApproverTable.userId })
      .from(approvalApproverTable)
      .where(
        and(
          eq(approvalApproverTable.organizationId, organizationId),
          eq(approvalApproverTable.branchId, branchId),
          eq(approvalApproverTable.isActive, true)
        )
      );

    return rows.map((r) => r.userId);
  }

  /**
   * Busca delegações ativas onde usuário é o delegado
   * (recebeu permissão de outro)
   * 
   * REPO-005: Filtra organizationId + branchId
   * REPO-006: Filtra isActive = true
   */
  async findActiveDelegatesFor(
    delegateUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate[]> {
    const now = new Date();

    const rows = await db
      .select()
      .from(approvalDelegateTable)
      .where(
        and(
          eq(approvalDelegateTable.organizationId, organizationId),
          eq(approvalDelegateTable.branchId, branchId),
          eq(approvalDelegateTable.delegateUserId, delegateUserId),
          eq(approvalDelegateTable.isActive, true),
          lte(approvalDelegateTable.startDate, now),
          or(
            isNull(approvalDelegateTable.endDate),
            gte(approvalDelegateTable.endDate, now)
          )
        )
      );

    const delegates: ApprovalDelegate[] = [];

    for (const row of rows) {
      const delegateResult = ApprovalDelegateMapper.toDomain(row);
      if (Result.isOk(delegateResult)) {
        delegates.push(delegateResult.value);
      }
    }

    return delegates;
  }

  /**
   * Busca delegações criadas por um usuário
   * 
   * REPO-005: Filtra organizationId + branchId
   */
  async findDelegationsBy(
    delegatorUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate[]> {
    const rows = await db
      .select()
      .from(approvalDelegateTable)
      .where(
        and(
          eq(approvalDelegateTable.organizationId, organizationId),
          eq(approvalDelegateTable.branchId, branchId),
          eq(approvalDelegateTable.delegatorUserId, delegatorUserId)
        )
      )
      .orderBy(approvalDelegateTable.createdAt);

    const delegates: ApprovalDelegate[] = [];

    for (const row of rows) {
      const delegateResult = ApprovalDelegateMapper.toDomain(row);
      if (Result.isOk(delegateResult)) {
        delegates.push(delegateResult.value);
      }
    }

    return delegates;
  }

  /**
   * Salva delegação (insert ou update)
   * REPO-007: Verifica existência e faz update ou insert
   */
  async saveDelegate(
    delegate: ApprovalDelegate
  ): Promise<Result<void, string>> {
    try {
      const data = ApprovalDelegateMapper.toPersistence(delegate);

      // Verificar se já existe
      // Type assertion para .limit() conforme BP-SQL-004
      // REPO-005: SEMPRE filtrar por organizationId + branchId
      type QueryWithLimit = { limit(n: number): Promise<typeof approvalDelegateTable.$inferSelect[]> };

      const existing = await (db
        .select()
        .from(approvalDelegateTable)
        .where(
          and(
            eq(approvalDelegateTable.id, delegate.id),
            eq(approvalDelegateTable.organizationId, delegate.organizationId),
            eq(approvalDelegateTable.branchId, delegate.branchId)
          )
        ) as unknown as QueryWithLimit).limit(1);

      if (existing.length > 0) {
        // Update
        // REPO-005: SEMPRE filtrar por organizationId + branchId no UPDATE
        await db
          .update(approvalDelegateTable)
          .set({
            isActive: data.isActive,
            endDate: data.endDate,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(approvalDelegateTable.id, delegate.id),
              eq(approvalDelegateTable.organizationId, delegate.organizationId),
              eq(approvalDelegateTable.branchId, delegate.branchId)
            )
          );
      } else {
        // Insert
        await db.insert(approvalDelegateTable).values(data);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to save delegate: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Revoga delegação (soft delete via isActive)
   * REPO-005: Filtra organizationId + branchId
   */
  async revokeDelegate(
    delegateId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(approvalDelegateTable)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(approvalDelegateTable.id, delegateId),
            eq(approvalDelegateTable.organizationId, organizationId),
            eq(approvalDelegateTable.branchId, branchId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to revoke delegate: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Busca delegação por ID
   * REPO-005: Filtra organizationId + branchId
   */
  async findDelegateById(
    delegateId: string,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate | null> {
    // Type assertion para .limit() conforme BP-SQL-004
    type QueryWithLimit = { limit(n: number): Promise<typeof approvalDelegateTable.$inferSelect[]> };

    const rows = await (db
      .select()
      .from(approvalDelegateTable)
      .where(
        and(
          eq(approvalDelegateTable.id, delegateId),
          eq(approvalDelegateTable.organizationId, organizationId),
          eq(approvalDelegateTable.branchId, branchId)
        )
      ) as unknown as QueryWithLimit).limit(1);

    if (rows.length === 0) {
      return null;
    }

    const delegateResult = ApprovalDelegateMapper.toDomain(rows[0]);

    return Result.isOk(delegateResult) ? delegateResult.value : null;
  }
}
