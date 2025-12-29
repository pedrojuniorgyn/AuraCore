import { Result, Money } from '@/shared/domain';
import { JournalEntry, JournalEntrySource, JournalEntryStatus } from '../../domain/entities/JournalEntry';
import { JournalEntryLine, EntryType } from '../../domain/entities/JournalEntryLine';
import { AccountingPeriod } from '../../domain/value-objects/AccountingPeriod';
import { 
  JournalEntryRow, 
  JournalEntryInsert,
  JournalEntryLineRow,
  JournalEntryLineInsert 
} from './JournalEntrySchema';

/**
 * Mapper: Converte entre Domain Models e Persistence Models
 */
export class JournalEntryMapper {
  
  /**
   * Domain → Persistence (para INSERT/UPDATE)
   */
  static toPersistence(entry: JournalEntry): JournalEntryInsert {
    return {
      id: entry.id,
      organizationId: entry.organizationId,
      branchId: entry.branchId,
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate,
      periodYear: entry.period.year,
      periodMonth: entry.period.month,
      description: entry.description,
      source: entry.source,
      sourceId: entry.sourceId ?? null,
      status: entry.status,
      reversedById: entry.reversedById ?? null,
      reversesId: entry.reversesId ?? null,
      postedAt: entry.postedAt ?? null,
      postedBy: entry.postedBy ?? null,
      notes: entry.notes ?? null,
      version: entry.version,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: null,
    };
  }

  /**
   * Persistence → Domain (para SELECT)
   */
  static toDomain(
    row: JournalEntryRow, 
    lineRows: JournalEntryLineRow[] = []
  ): Result<JournalEntry, string> {
    // 1. Criar período
    const periodResult = AccountingPeriod.create({
      year: row.periodYear,
      month: row.periodMonth,
      isClosed: false, // TODO: verificar se período está fechado
    });

    if (Result.isFail(periodResult)) {
      return Result.fail(`Invalid period: ${periodResult.error}`);
    }

    // 2. Mapear linhas
    const lines: JournalEntryLine[] = [];
    for (const lineRow of lineRows) {
      const lineResult = JournalEntryMapper.lineToDomain(lineRow);
      if (Result.isOk(lineResult)) {
        lines.push(lineResult.value);
      }
    }

    // 3. Reconstituir JournalEntry
    const entry = JournalEntry.reconstitute(
      row.id,
      {
        organizationId: row.organizationId,
        branchId: row.branchId,
        entryNumber: row.entryNumber,
        entryDate: new Date(row.entryDate),
        period: periodResult.value,
        description: row.description,
        source: row.source as JournalEntrySource,
        sourceId: row.sourceId ?? undefined,
        status: row.status as JournalEntryStatus,
        lines,
        reversedById: row.reversedById ?? undefined,
        reversesId: row.reversesId ?? undefined,
        postedAt: row.postedAt ? new Date(row.postedAt) : undefined,
        postedBy: row.postedBy ?? undefined,
        notes: row.notes ?? undefined,
        version: row.version,
      },
      new Date(row.createdAt)
    );

    return Result.ok(entry);
  }

  /**
   * Line Domain → Persistence
   */
  static lineToPersistence(line: JournalEntryLine): JournalEntryLineInsert {
    return {
      id: line.id,
      journalEntryId: line.journalEntryId,
      accountId: line.accountId,
      accountCode: line.accountCode,
      entryType: line.entryType,
      amount: line.amount.amount.toString(),
      currency: line.amount.currency,
      description: line.description ?? null,
      costCenterId: line.costCenterId ?? null,
      businessPartnerId: line.businessPartnerId ?? null,
      createdAt: line.createdAt,
    };
  }

  /**
   * Line Persistence → Domain
   */
  static lineToDomain(row: JournalEntryLineRow): Result<JournalEntryLine, string> {
    const amountResult = Money.create(
      parseFloat(row.amount as string),
      row.currency
    );
    
    if (Result.isFail(amountResult)) {
      return Result.fail(`Invalid line amount: ${amountResult.error}`);
    }

    const line = JournalEntryLine.reconstitute(
      {
        id: row.id,
        journalEntryId: row.journalEntryId,
        accountId: row.accountId,
        accountCode: row.accountCode,
        entryType: row.entryType as EntryType,
        amount: amountResult.value,
        description: row.description ?? undefined,
        costCenterId: row.costCenterId ?? undefined,
        businessPartnerId: row.businessPartnerId ?? undefined,
      },
      new Date(row.createdAt)
    );

    return Result.ok(line);
  }
}

