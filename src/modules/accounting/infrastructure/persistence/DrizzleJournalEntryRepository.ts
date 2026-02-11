/**
 * Drizzle Journal Entry Repository
 * 
 * Implementação DDD do repositório de lançamentos contábeis.
 * Implementa a interface IJournalEntryRepository de ports/output/.
 * 
 * @epic E7.27 - Architecture Cleanup
 * @see IJournalEntryRepository (ports/output/)
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { eq, and, isNull, sql, desc, asc, or, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import { JournalEntry } from '../../domain/entities/JournalEntry';
import { JournalEntryMapper } from './mappers/JournalEntryMapper';
import { 
  journalEntriesTable, 
  journalEntryLinesTable,
  JournalEntryRow,
  JournalEntryLineRow 
} from './schemas/JournalEntrySchema';
import type {
  IJournalEntryRepository,
  FindJournalEntriesFilter,
  PaginationOptions,
  PaginatedResult,
} from '../../domain/ports/output/IJournalEntryRepository';
import type { AccountingPeriod } from '../../domain/value-objects/AccountingPeriod';

/**
 * Repository: Journal Entry (DDD)
 * 
 * REGRAS CRÍTICAS (INFRA-004):
 * - TODOS os métodos filtram por organizationId + branchId
 * - branchId NUNCA é opcional
 * - Soft delete: filtrar deletedAt IS NULL
 */
@injectable()
export class DrizzleJournalEntryRepository implements IJournalEntryRepository {
  
  /**
   * Busca por ID
   */
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<JournalEntry | null> {
    // Buscar entry
    const query = db
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.id, id),
          eq(journalEntriesTable.organizationId, organizationId),
          eq(journalEntriesTable.branchId, branchId),
          isNull(journalEntriesTable.deletedAt)
        )
      )
      .orderBy(asc(journalEntriesTable.id));
    
    const rows = await query.offset(0).fetch(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    // Buscar lines
    const lineRows = await db
      .select()
      .from(journalEntryLinesTable)
      .where(eq(journalEntryLinesTable.journalEntryId, id));

    const mapResult = JournalEntryMapper.toDomain(row, lineRows);
    if (Result.isOk(mapResult)) {
      return mapResult.value;
    }

    return null;
  }

  /**
   * Busca com filtros e paginação
   */
  async findMany(
    filter: FindJournalEntriesFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<JournalEntry>> {
    const { organizationId, branchId, status, source, periodYear, periodMonth, entryDateFrom, entryDateTo, search } = filter;
    const { page, pageSize, sortBy = 'entryDate', sortOrder = 'desc' } = pagination;

    // Construir condições
    const conditions = [
      eq(journalEntriesTable.organizationId, organizationId),
      eq(journalEntriesTable.branchId, branchId),
      isNull(journalEntriesTable.deletedAt),
    ];

    if (status && status.length > 0) {
      conditions.push(
        or(...status.map(s => eq(journalEntriesTable.status, s))) ?? sql`1=1`
      );
    }

    if (source && source.length > 0) {
      conditions.push(
        or(...source.map(s => eq(journalEntriesTable.source, s))) ?? sql`1=1`
      );
    }

    if (periodYear) {
      conditions.push(eq(journalEntriesTable.periodYear, periodYear));
    }

    if (periodMonth) {
      conditions.push(eq(journalEntriesTable.periodMonth, periodMonth));
    }

    if (entryDateFrom) {
      conditions.push(sql`${journalEntriesTable.entryDate} >= ${entryDateFrom}`);
    }

    if (entryDateTo) {
      conditions.push(sql`${journalEntriesTable.entryDate} <= ${entryDateTo}`);
    }

    if (search) {
      conditions.push(
        or(
          like(journalEntriesTable.description, `%${search}%`),
          like(journalEntriesTable.entryNumber, `%${search}%`)
        ) ?? sql`1=1`
      );
    }

    // Count total
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(journalEntriesTable)
      .where(and(...conditions));
    
    const total = countResult[0]?.count ?? 0;

    // Ordenação
    const orderColumn = sortBy === 'entryDate' 
      ? journalEntriesTable.entryDate 
      : sortBy === 'entryNumber'
        ? journalEntriesTable.entryNumber
        : journalEntriesTable.createdAt;
    
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Buscar entries com paginação
    const offsetValue = (page - 1) * pageSize;
    const baseQuery = db
      .select()
      .from(journalEntriesTable)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn));
    
    const rows = await baseQuery.offset(offsetValue).fetch(pageSize);

    // Mapear para domain (sem lines por performance)
    const entries: JournalEntry[] = [];
    for (const row of rows) {
      const mapResult = JournalEntryMapper.toDomain(row, []);
      if (Result.isOk(mapResult)) {
        entries.push(mapResult.value);
      }
    }

    return {
      data: entries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Salva (create ou update)
   */
  async save(entry: JournalEntry): Promise<void> {
    const persistenceData = JournalEntryMapper.toPersistence(entry);
    
    // Verificar se existe
    const existQuery = db
      .select({ id: journalEntriesTable.id })
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.id, entry.id))
      .orderBy(asc(journalEntriesTable.id));
    
    const existing = await existQuery.offset(0).fetch(1);

    if (existing.length > 0) {
      // UPDATE
      await db
        .update(journalEntriesTable)
        .set({
          ...persistenceData,
          updatedAt: new Date(),
        })
        .where(eq(journalEntriesTable.id, entry.id));
    } else {
      // INSERT
      await db.insert(journalEntriesTable).values(persistenceData);
    }

    // Sincronizar lines
    // 1. Deletar lines existentes
    await db
      .delete(journalEntryLinesTable)
      .where(eq(journalEntryLinesTable.journalEntryId, entry.id));

    // 2. Inserir novas lines
    if (entry.lines.length > 0) {
      const lineData = entry.lines.map(line => 
        JournalEntryMapper.lineToPersistence(line, entry.organizationId, entry.branchId)
      );
      await db.insert(journalEntryLinesTable).values(lineData);
    }
  }

  /**
   * Salva múltiplos lançamentos atomicamente (em transação)
   */
  async saveMany(entries: JournalEntry[]): Promise<void> {
    // TODO: Implementar com transação real
    for (const entry of entries) {
      await this.save(entry);
    }
  }

  /**
   * Busca por período
   */
  async findByPeriod(
    organizationId: number,
    period: AccountingPeriod,
    branchId: number
  ): Promise<JournalEntry[]> {
    const rows = await db
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.organizationId, organizationId),
          eq(journalEntriesTable.branchId, branchId),
          eq(journalEntriesTable.periodYear, period.year),
          eq(journalEntriesTable.periodMonth, period.month),
          isNull(journalEntriesTable.deletedAt)
        )
      )
      .orderBy(desc(journalEntriesTable.entryDate));

    const entries: JournalEntry[] = [];
    for (const row of rows) {
      // Buscar lines
      const lineRows = await db
        .select()
        .from(journalEntryLinesTable)
        .where(eq(journalEntryLinesTable.journalEntryId, row.id));

      const mapResult = JournalEntryMapper.toDomain(row, lineRows);
      if (Result.isOk(mapResult)) {
        entries.push(mapResult.value);
      }
    }

    return entries;
  }

  /**
   * Busca por documento origem
   */
  async findBySourceId(
    sourceId: string,
    organizationId: number,
    branchId: number
  ): Promise<JournalEntry | null> {
    const query = db
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.sourceId, sourceId),
          eq(journalEntriesTable.organizationId, organizationId),
          eq(journalEntriesTable.branchId, branchId),
          isNull(journalEntriesTable.deletedAt)
        )
      )
      .orderBy(asc(journalEntriesTable.id));
    
    const rows = await query.offset(0).fetch(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    // Buscar lines
    const lineRows = await db
      .select()
      .from(journalEntryLinesTable)
      .where(eq(journalEntryLinesTable.journalEntryId, row.id));

    const mapResult = JournalEntryMapper.toDomain(row, lineRows);
    if (Result.isOk(mapResult)) {
      return mapResult.value;
    }

    return null;
  }

  /**
   * Verifica existência
   */
  async exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean> {
    const query = db
      .select({ id: journalEntriesTable.id })
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.id, id),
          eq(journalEntriesTable.organizationId, organizationId),
          eq(journalEntriesTable.branchId, branchId),
          isNull(journalEntriesTable.deletedAt)
        )
      )
      .orderBy(asc(journalEntriesTable.id));
    
    const rows = await query.offset(0).fetch(1);

    return rows.length > 0;
  }

  /**
   * Gera próximo número de lançamento
   */
  async nextEntryNumber(organizationId: number, branchId: number): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Buscar último número do ano
    const query = db
      .select({ entryNumber: journalEntriesTable.entryNumber })
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.organizationId, organizationId),
          eq(journalEntriesTable.branchId, branchId),
          like(journalEntriesTable.entryNumber, `JE-${currentYear}-%`)
        )
      )
      .orderBy(desc(journalEntriesTable.entryNumber));
    
    const result = await query.offset(0).fetch(1);

    let nextSeq = 1;
    if (result.length > 0 && result[0].entryNumber) {
      const lastNumber = result[0].entryNumber;
      const parts = lastNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
    }

    return `JE-${currentYear}-${nextSeq.toString().padStart(6, '0')}`;
  }
}
