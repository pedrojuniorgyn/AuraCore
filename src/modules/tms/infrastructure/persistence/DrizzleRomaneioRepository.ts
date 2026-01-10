import { injectable } from 'tsyringe';
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import {
  IRomaneioRepository,
  FindRomaneiosFilters,
} from '../../domain/ports/IRomaneioRepository';
import { RomaneioDocument } from '../../domain/entities/RomaneioDocument';
import { RomaneioItem } from '../../domain/entities/RomaneioItem';
import {
  RomaneioMapper,
  RomaneioPersistence,
  RomaneioItemPersistence,
} from './RomaneioMapper';
import { romaneios } from './RomaneioSchema';
import { romaneioItems } from './RomaneioItemSchema';

/**
 * Implementation: IRomaneioRepository using Drizzle ORM
 * 
 * REGRAS CRÍTICAS (infrastructure-layer.json):
 * - TODOS os métodos filtram por organizationId + branchId (INFRA-004)
 * - branchId NUNCA é opcional (ENFORCE-004)
 * - Soft delete: deletedAt IS NULL em todos os filtros
 * - UPDATE persiste TODOS os campos mutáveis (INFRA-005)
 */
@injectable()
export class DrizzleRomaneioRepository implements IRomaneioRepository {
  /**
   * Busca romaneio por ID
   * Multi-tenancy: organizationId + branchId (ENFORCE-003)
   */
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument | null, string>> {
    try {
      // Buscar romaneio
      const romaneioRows = await db
        .select()
        .from(romaneios)
        .where(
          and(
            eq(romaneios.id, id),
            eq(romaneios.organizationId, organizationId),
            eq(romaneios.branchId, branchId),
            isNull(romaneios.deletedAt) // Soft delete
          )
        );

      const romaneioRow = romaneioRows[0];
      if (!romaneioRow) {
        return Result.ok(null);
      }

      // Buscar itens
      const itemRows = await db
        .select()
        .from(romaneioItems)
        .where(eq(romaneioItems.romaneioId, id))
        .orderBy(romaneioItems.sequencia);

      // Mapper items
      const items: RomaneioItem[] = [];
      for (const itemRow of itemRows) {
        const itemResult = RomaneioMapper.itemToDomain(itemRow as RomaneioItemPersistence);
        if (Result.isFail(itemResult)) {
          return Result.fail(`Failed to map item: ${itemResult.error}`);
        }
        items.push(itemResult.value);
      }

      // Mapper romaneio
      const romaneioResult = RomaneioMapper.toDomain(
        romaneioRow as RomaneioPersistence,
        items
      );

      if (Result.isFail(romaneioResult)) {
        return Result.fail(romaneioResult.error);
      }

      return Result.ok(romaneioResult.value);
    } catch (error) {
      return Result.fail(`Failed to find romaneio by ID: ${(error as Error).message}`);
    }
  }

  /**
   * Busca romaneio por número
   * Multi-tenancy: organizationId + branchId (ENFORCE-003)
   */
  async findByNumero(
    numero: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument | null, string>> {
    try {
      // Buscar romaneio
      const romaneioRows = await db
        .select()
        .from(romaneios)
        .where(
          and(
            eq(romaneios.numero, numero),
            eq(romaneios.organizationId, organizationId),
            eq(romaneios.branchId, branchId),
            isNull(romaneios.deletedAt)
          )
        );

      const romaneioRow = romaneioRows[0];
      if (!romaneioRow) {
        return Result.ok(null);
      }

      // Buscar itens
      const itemRows = await db
        .select()
        .from(romaneioItems)
        .where(eq(romaneioItems.romaneioId, romaneioRow.id))
        .orderBy(romaneioItems.sequencia);

      // Mapper items
      const items: RomaneioItem[] = [];
      for (const itemRow of itemRows) {
        const itemResult = RomaneioMapper.itemToDomain(itemRow as RomaneioItemPersistence);
        if (Result.isFail(itemResult)) {
          return Result.fail(`Failed to map item: ${itemResult.error}`);
        }
        items.push(itemResult.value);
      }

      // Mapper romaneio
      const romaneioResult = RomaneioMapper.toDomain(
        romaneioRow as RomaneioPersistence,
        items
      );

      if (Result.isFail(romaneioResult)) {
        return Result.fail(romaneioResult.error);
      }

      return Result.ok(romaneioResult.value);
    } catch (error) {
      return Result.fail(`Failed to find romaneio by numero: ${(error as Error).message}`);
    }
  }

  /**
   * Busca romaneios com filtros
   * Multi-tenancy: branchId obrigatório (ENFORCE-004)
   */
  async findMany(filters: FindRomaneiosFilters): Promise<Result<RomaneioDocument[], string>> {
    try {
      // Construir query
      const conditions = [
        eq(romaneios.organizationId, filters.organizationId),
        eq(romaneios.branchId, filters.branchId), // OBRIGATÓRIO
        isNull(romaneios.deletedAt),
      ];

      if (filters.status) {
        conditions.push(eq(romaneios.status, filters.status));
      }

      if (filters.remetenteId) {
        conditions.push(eq(romaneios.remetenteId, filters.remetenteId));
      }

      if (filters.destinatarioId) {
        conditions.push(eq(romaneios.destinatarioId, filters.destinatarioId));
      }

      if (filters.transportadorId) {
        conditions.push(eq(romaneios.transportadorId, filters.transportadorId));
      }

      if (filters.tripId) {
        conditions.push(eq(romaneios.tripId, filters.tripId));
      }

      if (filters.deliveryId) {
        conditions.push(eq(romaneios.deliveryId, filters.deliveryId));
      }

      if (filters.dataEmissaoInicio) {
        conditions.push(gte(romaneios.dataEmissao, filters.dataEmissaoInicio));
      }

      if (filters.dataEmissaoFim) {
        conditions.push(lte(romaneios.dataEmissao, filters.dataEmissaoFim));
      }

      // Query base
      const baseQuery = db
        .select()
        .from(romaneios)
        .where(and(...conditions))
        .orderBy(romaneios.dataEmissao);

      // Aplicar offset se fornecido
      const queryWithOffset = filters.offset !== undefined
        ? baseQuery.offset(filters.offset)
        : baseQuery;

      // Aplicar limit se fornecido (SQL nativo para compatibilidade)
      let romaneioRows: unknown[];
      if (filters.limit !== undefined) {
        // Usar TOP no SQL Server via query nativa limitada
        const limitedQuery = queryWithOffset as unknown as { limit: (n: number) => Promise<unknown[]> };
        romaneioRows = await limitedQuery.limit(filters.limit);
      } else {
        romaneioRows = await queryWithOffset as unknown[];
      }

      // Carregar itens para cada romaneio
      const romaneiosResult: RomaneioDocument[] = [];

      for (const romaneioRow of romaneioRows) {
        const row = romaneioRow as { id: number };
        const itemRows = await db
          .select()
          .from(romaneioItems)
          .where(eq(romaneioItems.romaneioId, row.id))
          .orderBy(romaneioItems.sequencia);

        // Mapper items
        const items: RomaneioItem[] = [];
        for (const itemRow of itemRows) {
          const itemResult = RomaneioMapper.itemToDomain(itemRow as RomaneioItemPersistence);
          if (Result.isFail(itemResult)) {
            return Result.fail(`Failed to map item: ${itemResult.error}`);
          }
          items.push(itemResult.value);
        }

        // Mapper romaneio
        const romaneioResult = RomaneioMapper.toDomain(
          romaneioRow as RomaneioPersistence,
          items
        );

        if (Result.isFail(romaneioResult)) {
          return Result.fail(romaneioResult.error);
        }

        romaneiosResult.push(romaneioResult.value);
      }

      return Result.ok(romaneiosResult);
    } catch (error) {
      return Result.fail(`Failed to find romaneios: ${(error as Error).message}`);
    }
  }

  /**
   * Busca romaneios de uma viagem
   * Multi-tenancy: organizationId + branchId (ENFORCE-003)
   */
  async findByTrip(
    tripId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument[], string>> {
    return this.findMany({
      organizationId,
      branchId,
      tripId,
    });
  }

  /**
   * Busca romaneios de uma entrega
   * Multi-tenancy: organizationId + branchId (ENFORCE-003)
   */
  async findByDelivery(
    deliveryId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument[], string>> {
    return this.findMany({
      organizationId,
      branchId,
      deliveryId,
    });
  }

  /**
   * Verifica se número de romaneio já existe
   * Multi-tenancy: organizationId + branchId (ENFORCE-003)
   */
  async exists(
    numero: string,
    organizationId: number,
    branchId: number,
    excludeId?: string
  ): Promise<Result<boolean, string>> {
    try {
      const conditions = [
        eq(romaneios.numero, numero),
        eq(romaneios.organizationId, organizationId),
        eq(romaneios.branchId, branchId),
        isNull(romaneios.deletedAt),
      ];

      if (excludeId) {
        conditions.push(sql`${romaneios.id} != ${excludeId}`);
      }

      const rows = await db
        .select({ id: romaneios.id })
        .from(romaneios)
        .where(and(...conditions));

      return Result.ok(rows.length > 0);
    } catch (error) {
      return Result.fail(`Failed to check romaneio existence: ${(error as Error).message}`);
    }
  }

  /**
   * Salva romaneio (INSERT ou UPDATE)
   * 
   * INSERT: Persiste TODOS os campos
   * UPDATE: Atualiza TODOS os campos mutáveis (INFRA-005)
   */
  async save(romaneio: RomaneioDocument): Promise<Result<RomaneioDocument, string>> {
    try {
      // Verificar se já existe
      const existingResult = await this.findById(
        romaneio.id,
        romaneio.organizationId,
        romaneio.branchId
      );

      if (Result.isFail(existingResult)) {
        return Result.fail(existingResult.error);
      }

      const persistence = RomaneioMapper.toPersistence(romaneio);
      const itemsPersistence = romaneio.items.map((item) => RomaneioMapper.itemToPersistence(item));

      if (existingResult.value === null) {
        // INSERT - Persiste TODOS os campos
        await db.insert(romaneios).values(persistence);

        // Inserir itens
        if (itemsPersistence.length > 0) {
          await db.insert(romaneioItems).values(itemsPersistence);
        }
      } else {
        // UPDATE - Atualiza TODOS os campos mutáveis (INFRA-005)
        await db
          .update(romaneios)
          .set({
            numero: persistence.numero,
            dataEmissao: persistence.dataEmissao,
            remetenteId: persistence.remetenteId,
            destinatarioId: persistence.destinatarioId,
            transportadorId: persistence.transportadorId,
            tripId: persistence.tripId,
            deliveryId: persistence.deliveryId,
            cteNumbers: persistence.cteNumbers,
            nfeNumbers: persistence.nfeNumbers,
            totalVolumes: persistence.totalVolumes,
            pesoLiquidoTotal: persistence.pesoLiquidoTotal,
            pesoBrutoTotal: persistence.pesoBrutoTotal,
            cubagemTotal: persistence.cubagemTotal,
            status: persistence.status,
            conferidoPor: persistence.conferidoPor,
            dataConferencia: persistence.dataConferencia,
            observacoesConferencia: persistence.observacoesConferencia,
            updatedAt: persistence.updatedAt,
            updatedBy: persistence.updatedBy,
          })
          .where(
            and(
              eq(romaneios.id, romaneio.id),
              eq(romaneios.organizationId, romaneio.organizationId),
              eq(romaneios.branchId, romaneio.branchId)
            )
          );

        // Deletar itens existentes
        await db.delete(romaneioItems).where(eq(romaneioItems.romaneioId, romaneio.id));

        // Inserir novos itens
        if (itemsPersistence.length > 0) {
          await db.insert(romaneioItems).values(itemsPersistence);
        }
      }

      // Retornar romaneio salvo
      const savedResult = await this.findById(romaneio.id, romaneio.organizationId, romaneio.branchId);
      if (Result.isFail(savedResult)) {
        return savedResult;
      }
      if (savedResult.value === null) {
        return Result.fail('Failed to retrieve saved romaneio');
      }
      return Result.ok(savedResult.value);
    } catch (error) {
      return Result.fail(`Failed to save romaneio: ${(error as Error).message}`);
    }
  }

  /**
   * Deleta romaneio (soft delete)
   * Multi-tenancy: organizationId + branchId (ENFORCE-003)
   */
  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(romaneios)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(romaneios.id, id),
            eq(romaneios.organizationId, organizationId),
            eq(romaneios.branchId, branchId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete romaneio: ${(error as Error).message}`);
    }
  }

  /**
   * Conta romaneios com filtros
   * Multi-tenancy: branchId obrigatório (ENFORCE-004)
   */
  async count(filters: FindRomaneiosFilters): Promise<Result<number, string>> {
    try {
      // Construir query
      const conditions = [
        eq(romaneios.organizationId, filters.organizationId),
        eq(romaneios.branchId, filters.branchId), // OBRIGATÓRIO
        isNull(romaneios.deletedAt),
      ];

      if (filters.status) {
        conditions.push(eq(romaneios.status, filters.status));
      }

      if (filters.remetenteId) {
        conditions.push(eq(romaneios.remetenteId, filters.remetenteId));
      }

      if (filters.destinatarioId) {
        conditions.push(eq(romaneios.destinatarioId, filters.destinatarioId));
      }

      if (filters.transportadorId) {
        conditions.push(eq(romaneios.transportadorId, filters.transportadorId));
      }

      if (filters.tripId) {
        conditions.push(eq(romaneios.tripId, filters.tripId));
      }

      if (filters.deliveryId) {
        conditions.push(eq(romaneios.deliveryId, filters.deliveryId));
      }

      if (filters.dataEmissaoInicio) {
        conditions.push(gte(romaneios.dataEmissao, filters.dataEmissaoInicio));
      }

      if (filters.dataEmissaoFim) {
        conditions.push(lte(romaneios.dataEmissao, filters.dataEmissaoFim));
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(romaneios)
        .where(and(...conditions));

      return Result.ok(result[0]?.count || 0);
    } catch (error) {
      return Result.fail(`Failed to count romaneios: ${(error as Error).message}`);
    }
  }
}

