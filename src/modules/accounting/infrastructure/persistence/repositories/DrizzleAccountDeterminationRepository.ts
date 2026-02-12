import { injectable } from '@/shared/infrastructure/di/container';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { IAccountDeterminationRepository } from '../../../domain/ports/output/IAccountDeterminationRepository';
import type { AccountDetermination } from '../../../domain/entities/AccountDetermination';
import type { OperationTypeValue } from '../../../domain/value-objects/OperationType';
import { accountDeterminationTable } from '../schemas/AccountDeterminationSchema';
import { AccountDeterminationMapper } from '../mappers/AccountDeterminationMapper';
import { Result } from '@/shared/domain';
import { logger } from '@/shared/infrastructure/logging';

/**
 * DrizzleAccountDeterminationRepository
 * 
 * @see REPO-002: Implementação em infrastructure/persistence/repositories/
 * @see REPO-003: Implementa interface do domain
 * @see REPO-004: Usa Mapper para conversão
 * @see REPO-005: TODA query filtra organizationId + branchId
 * @see REPO-006: Soft delete: filtrar deletedAt IS NULL
 * @see REPO-010: Retorna Domain Entity, não row do banco
 * @see REPO-012: Nome: Drizzle{Entity}Repository
 */
@injectable()
export class DrizzleAccountDeterminationRepository implements IAccountDeterminationRepository {

  async findByOperationType(
    organizationId: number,
    branchId: number,
    operationType: OperationTypeValue
  ): Promise<AccountDetermination | null> {
    const rows = await db
      .select()
      .from(accountDeterminationTable)
      .where(
        and(
          eq(accountDeterminationTable.organizationId, organizationId),
          eq(accountDeterminationTable.branchId, branchId),
          eq(accountDeterminationTable.operationType, operationType),
          isNull(accountDeterminationTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = AccountDeterminationMapper.toDomain(rows[0]);
    if (Result.isFail(result)) {
      logger.error(`[AccountDeterminationRepo] Mapper error: ${result.error}`);
      return null;
    }

    return result.value;
  }

  async findAll(
    organizationId: number,
    branchId: number
  ): Promise<AccountDetermination[]> {
    const rows = await db
      .select()
      .from(accountDeterminationTable)
      .where(
        and(
          eq(accountDeterminationTable.organizationId, organizationId),
          eq(accountDeterminationTable.branchId, branchId),
          isNull(accountDeterminationTable.deletedAt)
        )
      );

    const entities: AccountDetermination[] = [];
    for (const row of rows) {
      const result = AccountDeterminationMapper.toDomain(row);
      if (Result.isOk(result)) {
        entities.push(result.value);
      } else {
        logger.warn(`[AccountDeterminationRepo] Skipping invalid row ${row.id}: ${result.error}`);
      }
    }

    return entities;
  }

  async save(entity: AccountDetermination): Promise<void> {
    const row = AccountDeterminationMapper.toPersistence(entity);

    // Upsert: inserir ou atualizar (REPO-007)
    const existing = await db
      .select({ id: accountDeterminationTable.id })
      .from(accountDeterminationTable)
      .where(eq(accountDeterminationTable.id, entity.id));

    if (existing.length > 0) {
      await db
        .update(accountDeterminationTable)
        .set({
          debitAccountId: row.debitAccountId,
          debitAccountCode: row.debitAccountCode,
          creditAccountId: row.creditAccountId,
          creditAccountCode: row.creditAccountCode,
          description: row.description,
          isActive: row.isActive,
          updatedAt: new Date(),
          deletedAt: null,
        })
        .where(eq(accountDeterminationTable.id, entity.id));
    } else {
      await db.insert(accountDeterminationTable).values(row);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .update(accountDeterminationTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(accountDeterminationTable.id, id),
          eq(accountDeterminationTable.organizationId, organizationId),
          eq(accountDeterminationTable.branchId, branchId),
          isNull(accountDeterminationTable.deletedAt)
        )
      );
  }

  async seedDefaults(
    organizationId: number,
    branchId: number,
    rules: AccountDetermination[]
  ): Promise<number> {
    let inserted = 0;

    for (const rule of rules) {
      // Verificar se já existe regra para este operationType
      const existing = await this.findByOperationType(
        organizationId,
        branchId,
        rule.operationTypeValue
      );

      if (!existing) {
        await this.save(rule);
        inserted++;
      }
    }

    logger.info(`[AccountDeterminationRepo] Seed: ${inserted} regras inseridas de ${rules.length} total (org=${organizationId}, branch=${branchId})`);
    return inserted;
  }
}
