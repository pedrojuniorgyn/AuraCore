/**
 * ReceivableMapper - Mapper entre AccountReceivable entity e row do banco
 */
import { Result, Money } from '@/shared/domain';
import { AccountReceivable, type ReceivableOrigin } from '../../domain/entities/AccountReceivable';
import { ReceivableStatus } from '../../domain/value-objects/ReceivableStatus';
import type { AccountReceivableRow, AccountReceivableInsert } from './ReceivableSchema';

export class ReceivableMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: AccountReceivableRow): Result<AccountReceivable, string> {
    // Parse Status
    const statusResult = ReceivableStatus.create(row.status || 'OPEN');
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    // Parse Money values
    const currency = row.currency || 'BRL';
    const amountResult = Money.create(Number(row.amount), currency);
    if (Result.isFail(amountResult)) {
      return Result.fail(`Erro ao converter amount: ${amountResult.error}`);
    }

    const amountReceivedResult = Money.create(Number(row.amountReceived || 0), currency);
    if (Result.isFail(amountReceivedResult)) {
      return Result.fail(`Erro ao converter amountReceived: ${amountReceivedResult.error}`);
    }

    let discountAmount: Money | null = null;
    if (row.discountAmount && Number(row.discountAmount) > 0) {
      const discountResult = Money.create(Number(row.discountAmount), currency);
      if (Result.isOk(discountResult)) {
        discountAmount = discountResult.value;
      }
    }

    const createdAt = row.createdAt ?? new Date();
    const updatedAt = row.updatedAt ?? new Date();

    try {
      const receivable = AccountReceivable.reconstitute({
        id: row.id,
        organizationId: row.organizationId,
        branchId: row.branchId,
        customerId: row.customerId,
        documentNumber: row.documentNumber,
        description: row.description,
        amount: amountResult.value,
        amountReceived: amountReceivedResult.value,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        receiveDate: row.receiveDate,
        discountUntil: row.discountUntil,
        discountAmount,
        fineRate: Number(row.fineRate) || 2,
        interestRate: Number(row.interestRate) || 1,
        status: statusResult.value,
        origin: (row.origin || 'MANUAL') as ReceivableOrigin,
        categoryId: row.categoryId,
        costCenterId: row.costCenterId,
        chartAccountId: row.chartAccountId,
        bankAccountId: row.bankAccountId,
        fiscalDocumentId: row.fiscalDocumentId,
        notes: row.notes,
        version: row.version ?? 1,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        deletedAt: row.deletedAt,
      }, createdAt, updatedAt);

      return Result.ok(receivable);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao reconstituir AccountReceivable: ${message}`);
    }
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: AccountReceivable): AccountReceivableInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      customerId: entity.customerId,
      documentNumber: entity.documentNumber,
      description: entity.description,
      amount: entity.amount.amount.toString(),
      currency: entity.amount.currency,
      amountReceived: entity.amountReceived.amount.toString(),
      issueDate: entity.issueDate,
      dueDate: entity.dueDate,
      receiveDate: entity.receiveDate,
      discountUntil: entity.discountUntil,
      discountAmount: entity.discountAmount?.amount.toString(),
      fineRate: entity.fineRate.toString(),
      interestRate: entity.interestRate.toString(),
      status: entity.status.value,
      origin: entity.origin,
      categoryId: entity.categoryId,
      costCenterId: entity.costCenterId,
      chartAccountId: entity.chartAccountId,
      bankAccountId: entity.bankAccountId,
      fiscalDocumentId: entity.fiscalDocumentId,
      notes: entity.notes,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      deletedAt: entity.deletedAt,
    };
  }
}
