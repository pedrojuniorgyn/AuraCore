import { Result } from '@/shared/domain';
import { AccountDetermination } from '../../../domain/entities/AccountDetermination';
import { OperationType } from '../../../domain/value-objects/OperationType';
import type { AccountDeterminationRow, AccountDeterminationInsert } from '../schemas/AccountDeterminationSchema';

/**
 * AccountDeterminationMapper
 * 
 * @see MAPPER-001 a MAPPER-008
 * @see MAPPER-004: toDomain usa reconstitute(), NUNCA create()
 */
export class AccountDeterminationMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: AccountDeterminationRow): Result<AccountDetermination, string> {
    const operationTypeResult = OperationType.create(row.operationType);
    if (Result.isFail(operationTypeResult)) {
      return Result.fail(`Mapper: OperationType inválido no banco: ${row.operationType}`);
    }

    return AccountDetermination.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      operationType: operationTypeResult.value,
      debitAccountId: row.debitAccountId,
      debitAccountCode: row.debitAccountCode,
      creditAccountId: row.creditAccountId,
      creditAccountCode: row.creditAccountCode,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: AccountDetermination): AccountDeterminationInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      operationType: entity.operationTypeValue,
      debitAccountId: entity.debitAccountId,
      debitAccountCode: entity.debitAccountCode,
      creditAccountId: entity.creditAccountId,
      creditAccountCode: entity.creditAccountCode,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: null,
    };
  }
}
