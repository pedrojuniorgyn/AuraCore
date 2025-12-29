import { injectable } from 'tsyringe';
import { eq, and, gte, lte, like, inArray, notInArray, isNull, sql, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { JournalEntry } from '../../domain/entities/JournalEntry';
import { AccountingPeriod } from '../../domain/value-objects/AccountingPeriod';
import { 
  IJournalEntryRepository, 
  FindJournalEntriesFilter, 
  PaginationOptions,
  PaginatedResult 
} from '../../domain/ports/output/IJournalEntryRepository';
import { JournalEntryMapper } from './JournalEntryMapper';
import { journalEntriesTable, journalEntryLinesTable, type JournalEntryRow } from './JournalEntrySchema';
import { Result } from '@/shared/domain';

/**
 * Implementação Drizzle do IJournalEntryRepository
 */
@injectable()
export class DrizzleJournalEntryRepository implements IJournalEntryRepository {

  /**
   * Busca por ID com linhas
   */
  async findById(id: string, organizationId: number): Promise<JournalEntry | null> {
    const rows = await db
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.id, id),
          eq(journalEntriesTable.organizationId, organizationId),
          isNull(journalEntriesTable.deletedAt)
        )
      );

    const entryRow = rows[0];
    if (!entryRow) {
      return null;
    }

    // Buscar linhas
    const lineRows = await db
      .select()
      .from(journalEntryLinesTable)
      .where(eq(journalEntryLinesTable.journalEntryId, id));

    const result = JournalEntryMapper.toDomain(entryRow, lineRows);
    
    return Result.isOk(result) ? result.value : null;
  }

  /**
   * Busca com filtros e paginação
   */
  async findMany(
    filter: FindJournalEntriesFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<JournalEntry>> {
    // Construir condições
    const conditions = [
      eq(journalEntriesTable.organizationId, filter.organizationId),
      isNull(journalEntriesTable.deletedAt),
    ];

    if (filter.branchId) {
      conditions.push(eq(journalEntriesTable.branchId, filter.branchId));
    }

    if (filter.status && filter.status.length > 0) {
      conditions.push(inArray(journalEntriesTable.status, filter.status));
    }

    if (filter.source && filter.source.length > 0) {
      conditions.push(inArray(journalEntriesTable.source, filter.source));
    }

    if (filter.periodYear) {
      conditions.push(eq(journalEntriesTable.periodYear, filter.periodYear));
    }

    if (filter.periodMonth) {
      conditions.push(eq(journalEntriesTable.periodMonth, filter.periodMonth));
    }

    if (filter.entryDateFrom) {
      conditions.push(gte(journalEntriesTable.entryDate, filter.entryDateFrom));
    }

    if (filter.entryDateTo) {
      conditions.push(lte(journalEntriesTable.entryDate, filter.entryDateTo));
    }

    if (filter.search) {
      conditions.push(
        like(journalEntriesTable.entryNumber, `%${filter.search}%`)
      );
    }

    const whereClause = and(...conditions);

    // Contar total
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(journalEntriesTable)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Buscar com paginação
    const offset = (pagination.page - 1) * pagination.pageSize;
    
    const orderColumn = pagination.sortBy === 'entryDate' 
      ? journalEntriesTable.entryDate 
      : journalEntriesTable.createdAt;
    
    const orderFn = pagination.sortOrder === 'asc' ? asc : desc;

    const rows = await queryPaginated<JournalEntryRow>(
      db
        .select()
        .from(journalEntriesTable)
        .where(whereClause)
        .orderBy(orderFn(orderColumn)),
      pagination
    );

    // Buscar linhas para cada entry
    const entryIds = rows.map((r: JournalEntryRow) => r.id);
    
    const linesByEntry: Map<string, typeof journalEntryLinesTable.$inferSelect[]> = new Map();
    
    if (entryIds.length > 0) {
      const allLines = await db
        .select()
        .from(journalEntryLinesTable)
        .where(inArray(journalEntryLinesTable.journalEntryId, entryIds));

      for (const line of allLines) {
        const existing = linesByEntry.get(line.journalEntryId) || [];
        existing.push(line);
        linesByEntry.set(line.journalEntryId, existing);
      }
    }

    // Mapear para domain
    const entries: JournalEntry[] = [];
    for (const row of rows) {
      const lines = linesByEntry.get(row.id) || [];
      const result = JournalEntryMapper.toDomain(row, lines);
      if (Result.isOk(result)) {
        entries.push(result.value);
      }
    }

    return {
      data: entries,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  /**
   * Salva (create ou update) - único lançamento
   */
  async save(entry: JournalEntry): Promise<void> {
    await this.saveMany([entry]);
  }

  /**
   * Salva múltiplos lançamentos em transação
   * IMPORTANTE: Garante atomicidade para operações como estorno
   */
  async saveMany(entries: JournalEntry[]): Promise<void> {
    if (entries.length === 0) return;

    await db.transaction(async (tx) => {
      for (const entry of entries) {
        const row = JournalEntryMapper.toPersistence(entry);

        // Verificar se existe
        const existing = await tx
          .select({ id: journalEntriesTable.id })
          .from(journalEntriesTable)
          .where(eq(journalEntriesTable.id, entry.id));

        if (existing.length > 0) {
          // Update entry
          await tx
            .update(journalEntriesTable)
            .set({
              status: row.status,
              reversedById: row.reversedById,
              postedAt: row.postedAt,
              postedBy: row.postedBy,
              notes: row.notes,
              version: row.version,
              updatedAt: new Date(),
            })
            .where(eq(journalEntriesTable.id, entry.id));

          // Sincronizar linhas: deletar linhas órfãs
          const currentLineIds = entry.lines.map(l => l.id);
          if (currentLineIds.length > 0) {
            // Deletar linhas que não estão mais no aggregate
            await tx
              .delete(journalEntryLinesTable)
              .where(
                and(
                  eq(journalEntryLinesTable.journalEntryId, entry.id),
                  notInArray(journalEntryLinesTable.id, currentLineIds)
                )
              );
          } else {
            // Se não há linhas no aggregate, deletar todas do DB
            await tx
              .delete(journalEntryLinesTable)
              .where(eq(journalEntryLinesTable.journalEntryId, entry.id));
          }
        } else {
          // Insert new entry
          await tx
            .insert(journalEntriesTable)
            .values(row);
        }

        // Inserir linhas novas (upsert)
        for (const line of entry.lines) {
          const lineRow = JournalEntryMapper.lineToPersistence(line);

          const existingLine = await tx
            .select({ id: journalEntryLinesTable.id })
            .from(journalEntryLinesTable)
            .where(eq(journalEntryLinesTable.id, line.id));

          if (existingLine.length === 0) {
            await tx
              .insert(journalEntryLinesTable)
              .values(lineRow);
          }
          // Linhas existentes não são atualizadas (imutáveis após criação)
        }
      }
    });
  }

  /**
   * Busca por período
   */
  async findByPeriod(
    organizationId: number,
    period: AccountingPeriod,
    branchId?: number
  ): Promise<JournalEntry[]> {
    const conditions = [
      eq(journalEntriesTable.organizationId, organizationId),
      eq(journalEntriesTable.periodYear, period.year),
      eq(journalEntriesTable.periodMonth, period.month),
      isNull(journalEntriesTable.deletedAt),
    ];

    if (branchId) {
      conditions.push(eq(journalEntriesTable.branchId, branchId));
    }

    const rows = await db
      .select()
      .from(journalEntriesTable)
      .where(and(...conditions))
      .orderBy(asc(journalEntriesTable.entryDate));

    if (rows.length === 0) {
      return [];
    }

    // Buscar linhas para todos os entries de uma vez (batch)
    const entryIds = rows.map(r => r.id);
    
    const allLines = await db
      .select()
      .from(journalEntryLinesTable)
      .where(inArray(journalEntryLinesTable.journalEntryId, entryIds));

    // Agrupar linhas por entry
    const linesByEntry = new Map<string, typeof journalEntryLinesTable.$inferSelect[]>();
    for (const line of allLines) {
      const existing = linesByEntry.get(line.journalEntryId) || [];
      existing.push(line);
      linesByEntry.set(line.journalEntryId, existing);
    }

    // Mapear para domain com linhas
    const entries: JournalEntry[] = [];
    for (const row of rows) {
      const lines = linesByEntry.get(row.id) || [];
      const result = JournalEntryMapper.toDomain(row, lines);
      if (Result.isOk(result)) {
        entries.push(result.value);
      }
    }

    return entries;
  }

  /**
   * Busca por documento origem
   */
  async findBySourceId(
    sourceId: string,
    organizationId: number
  ): Promise<JournalEntry | null> {
    const rows = await db
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.sourceId, sourceId),
          eq(journalEntriesTable.organizationId, organizationId),
          isNull(journalEntriesTable.deletedAt)
        )
      );

    const entryRow = rows[0];
    if (!entryRow) {
      return null;
    }

    const lineRows = await db
      .select()
      .from(journalEntryLinesTable)
      .where(eq(journalEntryLinesTable.journalEntryId, entryRow.id));

    const result = JournalEntryMapper.toDomain(entryRow, lineRows);
    
    return Result.isOk(result) ? result.value : null;
  }

  /**
   * Verifica existência
   */
  async exists(id: string, organizationId: number): Promise<boolean> {
    const result = await db
      .select({ id: journalEntriesTable.id })
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.id, id),
          eq(journalEntriesTable.organizationId, organizationId),
          isNull(journalEntriesTable.deletedAt)
        )
      );

    return result.length > 0;
  }

  /**
   * Gera próximo número de lançamento
   */
  async nextEntryNumber(organizationId: number, branchId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LC-${branchId}-${year}-`;

    const result = await db
      .select({ 
        maxNum: sql<string>`MAX(CAST(SUBSTRING(entry_number, LEN(${prefix}) + 1, 10) AS INT))` 
      })
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.organizationId, organizationId),
          like(journalEntriesTable.entryNumber, `${prefix}%`)
        )
      );

    const maxNum = result[0]?.maxNum ? parseInt(result[0].maxNum) : 0;
    const nextNum = (maxNum + 1).toString().padStart(6, '0');

    return `${prefix}${nextNum}`;
  }
}

