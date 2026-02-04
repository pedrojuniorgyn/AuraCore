/**
 * Repository: DrizzleOkrRepository
 * Implementação Drizzle do repositório de OKRs
 * 
 * @module strategic/okr/infrastructure/persistence/repositories
 */
import { eq, and, isNull, desc, sql, inArray, or } from 'drizzle-orm';
import { injectable } from 'tsyringe';
import type { IOkrRepository, OkrFilter } from '../../../domain/ports/output/IOkrRepository';
import { OKR, type OKRLevel, type OKRStatus } from '../../../domain/entities/OKR';
import { OkrMapper } from '../mappers/OkrMapper';
import { okrTable, okrKeyResultTable } from '../schemas/okr.schema';
import { db } from '../../../../../../lib/db';
import { queryPaginated } from '../../../../../../lib/db/query-helpers';
import { Result } from '../../../../../../shared/domain/types/Result';

@injectable()
export class DrizzleOkrRepository implements IOkrRepository {
  /**
   * Busca OKR por ID
   */
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR | null> {
    // REPO-005: TODA query filtra organizationId + branchId
    const okrRows = await db
      .select()
      .from(okrTable)
      .where(
        and(
          eq(okrTable.id, id),
          eq(okrTable.organizationId, organizationId),
          eq(okrTable.branchId, branchId),
          isNull(okrTable.deletedAt) // REPO-006: Soft delete
        )
      );

    if (okrRows.length === 0) return null;

    // Buscar Key Results
    const keyResultRows = await db
      .select()
      .from(okrKeyResultTable)
      .where(eq(okrKeyResultTable.okrId, id))
      .orderBy(okrKeyResultTable.orderIndex);

    // REPO-010: Retorna Domain Entity, não row do banco
    const result = OkrMapper.toDomain(okrRows[0], keyResultRows);
    return Result.isOk(result) ? result.value : null;
  }

  /**
   * Lista OKRs com filtros e paginação
   */
  async findMany(filter: OkrFilter): Promise<{
    items: OKR[];
    total: number;
  }> {
    const {
      organizationId,
      branchId,
      level,
      status,
      ownerId,
      parentId,
      periodType,
      search,
      page = 1,
      pageSize = 20,
    } = filter;

    // Build conditions (REPO-005: multi-tenancy)
    const conditions = [
      eq(okrTable.organizationId, organizationId),
      eq(okrTable.branchId, branchId),
      isNull(okrTable.deletedAt), // REPO-006: Soft delete
    ];

    // Level filter (pode ser array)
    if (level) {
      if (Array.isArray(level)) {
        conditions.push(inArray(okrTable.level, level));
      } else {
        conditions.push(eq(okrTable.level, level));
      }
    }

    // Status filter (pode ser array)
    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(okrTable.status, status));
      } else {
        conditions.push(eq(okrTable.status, status));
      }
    }

    if (ownerId) {
      conditions.push(eq(okrTable.ownerId, ownerId));
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        // Buscar raízes (sem parent)
        conditions.push(isNull(okrTable.parentId));
      } else {
        conditions.push(eq(okrTable.parentId, parentId));
      }
    }

    if (periodType) {
      conditions.push(eq(okrTable.periodType, periodType));
    }

    if (search) {
      conditions.push(
        or(
          sql`${okrTable.title} LIKE ${`%${search}%`}`,
          sql`${okrTable.description} LIKE ${`%${search}%`}`
        )!
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(okrTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated items (REPO-009: Paginação obrigatória)
    const query = db
      .select()
      .from(okrTable)
      .where(and(...conditions))
      .orderBy(desc(okrTable.createdAt));

    const okrRows = await queryPaginated<typeof okrTable.$inferSelect>(
      query,
      { page, pageSize }
    );

    // Buscar Key Results para todos OKRs (batch)
    const okrIds = okrRows.map((o) => o.id);
    let keyResultRows: typeof okrKeyResultTable.$inferSelect[] = [];

    if (okrIds.length > 0) {
      keyResultRows = await db
        .select()
        .from(okrKeyResultTable)
        .where(inArray(okrKeyResultTable.okrId, okrIds))
        .orderBy(okrKeyResultTable.orderIndex);
    }

    // Map para Domain Entities - Bug Fix: Não ignorar erros de mapeamento
    const items: OKR[] = [];
    const mappingErrors: string[] = [];
    
    for (const okrRow of okrRows) {
      const krs = keyResultRows.filter((kr) => kr.okrId === okrRow.id);
      const result = OkrMapper.toDomain(okrRow, krs);
      
      if (Result.isOk(result)) {
        items.push(result.value);
      } else {
        // Bug Fix: Coletar erros ao invés de ignorar silenciosamente
        mappingErrors.push(`OKR ${okrRow.id}: ${result.error}`);
      }
    }

    // Se houve erros de mapeamento, logar para observabilidade
    if (mappingErrors.length > 0) {
      console.error(
        `[DrizzleOkrRepository.findMany] Failed to map ${mappingErrors.length}/${okrRows.length} OKRs:`,
        mappingErrors
      );
    }

    return { items, total };
  }

  /**
   * Busca OKRs filhos de um parent
   */
  async findByParentId(
    parentId: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]> {
    const okrRows = await db
      .select()
      .from(okrTable)
      .where(
        and(
          eq(okrTable.parentId, parentId),
          eq(okrTable.organizationId, organizationId),
          eq(okrTable.branchId, branchId),
          isNull(okrTable.deletedAt)
        )
      )
      .orderBy(okrTable.level, desc(okrTable.createdAt));

    // Buscar Key Results (batch)
    const okrIds = okrRows.map((o) => o.id);
    let keyResultRows: typeof okrKeyResultTable.$inferSelect[] = [];

    if (okrIds.length > 0) {
      keyResultRows = await db
        .select()
        .from(okrKeyResultTable)
        .where(inArray(okrKeyResultTable.okrId, okrIds))
        .orderBy(okrKeyResultTable.orderIndex);
    }

    const items: OKR[] = [];
    const mappingErrors: string[] = [];
    
    for (const okrRow of okrRows) {
      const krs = keyResultRows.filter((kr) => kr.okrId === okrRow.id);
      const result = OkrMapper.toDomain(okrRow, krs);
      
      if (Result.isOk(result)) {
        items.push(result.value);
      } else {
        // Bug Fix: Coletar erros ao invés de ignorar silenciosamente
        mappingErrors.push(`OKR ${okrRow.id}: ${result.error}`);
      }
    }

    // Se houve erros de mapeamento, logar para observabilidade
    if (mappingErrors.length > 0) {
      console.error(
        `[DrizzleOkrRepository.findByParentId] Failed to map ${mappingErrors.length}/${okrRows.length} OKRs:`,
        mappingErrors
      );
    }

    return items;
  }

  /**
   * Busca OKRs raízes (sem parent) por nível
   */
  async findRootsByLevel(
    level: OKRLevel,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]> {
    const okrRows = await db
      .select()
      .from(okrTable)
      .where(
        and(
          eq(okrTable.level, level),
          isNull(okrTable.parentId),
          eq(okrTable.organizationId, organizationId),
          eq(okrTable.branchId, branchId),
          isNull(okrTable.deletedAt)
        )
      )
      .orderBy(desc(okrTable.createdAt));

    // Buscar Key Results (batch)
    const okrIds = okrRows.map((o) => o.id);
    let keyResultRows: typeof okrKeyResultTable.$inferSelect[] = [];

    if (okrIds.length > 0) {
      keyResultRows = await db
        .select()
        .from(okrKeyResultTable)
        .where(inArray(okrKeyResultTable.okrId, okrIds))
        .orderBy(okrKeyResultTable.orderIndex);
    }

    const items: OKR[] = [];
    const mappingErrors: string[] = [];
    
    for (const okrRow of okrRows) {
      const krs = keyResultRows.filter((kr) => kr.okrId === okrRow.id);
      const result = OkrMapper.toDomain(okrRow, krs);
      
      if (Result.isOk(result)) {
        items.push(result.value);
      } else {
        // Bug Fix: Coletar erros ao invés de ignorar silenciosamente
        mappingErrors.push(`OKR ${okrRow.id}: ${result.error}`);
      }
    }

    // Se houve erros de mapeamento, logar para observabilidade
    if (mappingErrors.length > 0) {
      console.error(
        `[DrizzleOkrRepository.findRootsByLevel] Failed to map ${mappingErrors.length}/${okrRows.length} OKRs:`,
        mappingErrors
      );
    }

    return items;
  }

  /**
   * Busca OKRs de um owner específico
   */
  async findByOwnerId(
    ownerId: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]> {
    const okrRows = await db
      .select()
      .from(okrTable)
      .where(
        and(
          eq(okrTable.ownerId, ownerId),
          eq(okrTable.organizationId, organizationId),
          eq(okrTable.branchId, branchId),
          isNull(okrTable.deletedAt)
        )
      )
      .orderBy(desc(okrTable.createdAt));

    // Buscar Key Results (batch)
    const okrIds = okrRows.map((o) => o.id);
    let keyResultRows: typeof okrKeyResultTable.$inferSelect[] = [];

    if (okrIds.length > 0) {
      keyResultRows = await db
        .select()
        .from(okrKeyResultTable)
        .where(inArray(okrKeyResultTable.okrId, okrIds))
        .orderBy(okrKeyResultTable.orderIndex);
    }

    const items: OKR[] = [];
    const mappingErrors: string[] = [];
    
    for (const okrRow of okrRows) {
      const krs = keyResultRows.filter((kr) => kr.okrId === okrRow.id);
      const result = OkrMapper.toDomain(okrRow, krs);
      
      if (Result.isOk(result)) {
        items.push(result.value);
      } else {
        // Bug Fix: Coletar erros ao invés de ignorar silenciosamente
        mappingErrors.push(`OKR ${okrRow.id}: ${result.error}`);
      }
    }

    // Se houve erros de mapeamento, logar para observabilidade
    if (mappingErrors.length > 0) {
      console.error(
        `[DrizzleOkrRepository.findByOwnerId] Failed to map ${mappingErrors.length}/${okrRows.length} OKRs:`,
        mappingErrors
      );
    }

    return items;
  }

  /**
   * Busca OKRs ativos no período atual
   */
  async findActiveInPeriod(
    periodType: string,
    organizationId: number,
    branchId: number
  ): Promise<OKR[]> {
    const now = new Date();

    const okrRows = await db
      .select()
      .from(okrTable)
      .where(
        and(
          eq(okrTable.periodType, periodType),
          eq(okrTable.status, 'active'),
          eq(okrTable.organizationId, organizationId),
          eq(okrTable.branchId, branchId),
          sql`${okrTable.startDate} <= ${now}`,
          sql`${okrTable.endDate} >= ${now}`,
          isNull(okrTable.deletedAt)
        )
      )
      .orderBy(desc(okrTable.createdAt));

    // Buscar Key Results (batch)
    const okrIds = okrRows.map((o) => o.id);
    let keyResultRows: typeof okrKeyResultTable.$inferSelect[] = [];

    if (okrIds.length > 0) {
      keyResultRows = await db
        .select()
        .from(okrKeyResultTable)
        .where(inArray(okrKeyResultTable.okrId, okrIds))
        .orderBy(okrKeyResultTable.orderIndex);
    }

    const items: OKR[] = [];
    const mappingErrors: string[] = [];
    
    for (const okrRow of okrRows) {
      const krs = keyResultRows.filter((kr) => kr.okrId === okrRow.id);
      const result = OkrMapper.toDomain(okrRow, krs);
      
      if (Result.isOk(result)) {
        items.push(result.value);
      } else {
        // Bug Fix: Coletar erros ao invés de ignorar silenciosamente
        mappingErrors.push(`OKR ${okrRow.id}: ${result.error}`);
      }
    }

    // Se houve erros de mapeamento, logar para observabilidade
    if (mappingErrors.length > 0) {
      console.error(
        `[DrizzleOkrRepository.findActiveInPeriod] Failed to map ${mappingErrors.length}/${okrRows.length} OKRs:`,
        mappingErrors
      );
    }

    return items;
  }

  /**
   * Salva (insert ou update) um OKR (REPO-007: UPSERT)
   */
  async save(okr: OKR): Promise<Result<void, string>> {
    try {
      const { okr: okrData, keyResults: keyResultsData } = OkrMapper.toPersistence(okr);

      // Verificar se existe
      const exists = await this.exists(okr.id, okr.organizationId, okr.branchId);

      // REPO-008: Transações para operações múltiplas
      await db.transaction(async (tx) => {
        if (exists) {
          // UPDATE - Bug Fix: Adicionar multi-tenancy (REPO-005)
          await tx
            .update(okrTable)
            .set({
              ...okrData,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(okrTable.id, okr.id),
                eq(okrTable.organizationId, okr.organizationId),
                eq(okrTable.branchId, okr.branchId)
              )
            );

          // Bug Fix: Atualizar Key Results ao invés de deletar/recriar
          // Buscar IDs existentes com timestamps (para preservar createdAt)
          const existingKRs = await tx
            .select({ 
              id: okrKeyResultTable.id,
              createdAt: okrKeyResultTable.createdAt,
              createdBy: okrKeyResultTable.createdBy,
            })
            .from(okrKeyResultTable)
            .where(eq(okrKeyResultTable.okrId, okr.id));
          
          const existingIds = new Set(existingKRs.map(kr => kr.id));
          const timestampMap = new Map(
            existingKRs.map(kr => [kr.id, { createdAt: kr.createdAt, createdBy: kr.createdBy }])
          );

          // Deletar Key Results que não existem mais na entidade
          const currentIds = new Set(
            keyResultsData.map(kr => kr.id).filter(Boolean) as string[]
          );
          const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));
          
          if (idsToDelete.length > 0) {
            await tx
              .delete(okrKeyResultTable)
              .where(inArray(okrKeyResultTable.id, idsToDelete));
          }
        } else {
          // INSERT
          await tx.insert(okrTable).values(okrData);
        }

        // Inserir ou Atualizar Key Results
        if (keyResultsData.length > 0) {
          for (const kr of keyResultsData) {
            const krId = kr.id || globalThis.crypto.randomUUID();
            const krData = { ...kr, id: krId, okrId: okr.id };

            if (kr.id && exists) {
              // UPDATE Key Result existente
              // Bug Fix: Preservar createdAt e createdBy originais
              const original = timestampMap.get(kr.id);
              await tx
                .update(okrKeyResultTable)
                .set({
                  ...krData,
                  createdAt: original?.createdAt || krData.createdAt,
                  createdBy: original?.createdBy || krData.createdBy,
                  updatedAt: new Date(), // Sempre atualizar updatedAt
                })
                .where(eq(okrKeyResultTable.id, krId));
            } else {
              // INSERT novo Key Result
              await tx.insert(okrKeyResultTable).values(krData);
            }
          }
        }
      });

      return Result.ok(undefined);
    } catch (error) {
      console.error('[DrizzleOkrRepository] save error:', error);
      return Result.fail('Failed to save OKR');
    }
  }

  /**
   * Soft delete de um OKR (REPO-006)
   */
  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .update(okrTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(okrTable.id, id),
          eq(okrTable.organizationId, organizationId),
          eq(okrTable.branchId, branchId)
        )
      );
  }

  /**
   * Verifica se OKR existe
   */
  async exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean> {
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(okrTable)
      .where(
        and(
          eq(okrTable.id, id),
          eq(okrTable.organizationId, organizationId),
          eq(okrTable.branchId, branchId),
          isNull(okrTable.deletedAt)
        )
      );

    return Number(countResult[0]?.count ?? 0) > 0;
  }

  /**
   * Conta total de OKRs por filtro
   */
  async count(filter: Omit<OkrFilter, 'page' | 'pageSize'>): Promise<number> {
    const {
      organizationId,
      branchId,
      level,
      status,
      ownerId,
      parentId,
      periodType,
      search,
    } = filter;

    const conditions = [
      eq(okrTable.organizationId, organizationId),
      eq(okrTable.branchId, branchId),
      isNull(okrTable.deletedAt),
    ];

    if (level) {
      if (Array.isArray(level)) {
        conditions.push(inArray(okrTable.level, level));
      } else {
        conditions.push(eq(okrTable.level, level));
      }
    }

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(okrTable.status, status));
      } else {
        conditions.push(eq(okrTable.status, status));
      }
    }

    if (ownerId) {
      conditions.push(eq(okrTable.ownerId, ownerId));
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        conditions.push(isNull(okrTable.parentId));
      } else {
        conditions.push(eq(okrTable.parentId, parentId));
      }
    }

    if (periodType) {
      conditions.push(eq(okrTable.periodType, periodType));
    }

    if (search) {
      conditions.push(
        or(
          sql`${okrTable.title} LIKE ${`%${search}%`}`,
          sql`${okrTable.description} LIKE ${`%${search}%`}`
        )!
      );
    }

    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(okrTable)
      .where(and(...conditions));

    return Number(countResult[0]?.count ?? 0);
  }
}
