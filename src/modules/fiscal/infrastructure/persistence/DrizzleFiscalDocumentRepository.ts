import { injectable } from '@/shared/infrastructure/di/container';
import { eq, and, inArray, gte, lte, or, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import {
  IFiscalDocumentRepository,
  FindFiscalDocumentsFilter,
  PaginationOptions,
  PaginatedResult,
} from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocument } from '../../domain/entities/FiscalDocument';
import { DocumentType } from '../../domain/value-objects/DocumentType';
import { FiscalDocumentMapper, FiscalDocumentPersistence } from './FiscalDocumentMapper';
import { fiscalDocuments, fiscalDocumentItems } from './FiscalDocumentSchema';

/**
 * Implementation: IFiscalDocumentRepository using Drizzle ORM
 */
@injectable()
export class DrizzleFiscalDocumentRepository implements IFiscalDocumentRepository {
  /**
   * Buscar documento por ID
   * BUG 2 FIX: Adicionar branchId para multi-tenancy completo
   */
  async findById(id: string, organizationId: number, branchId: number): Promise<FiscalDocument | null> {
    // Buscar documento
    const documentRows = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, id),
          eq(fiscalDocuments.organizationId, organizationId),
          eq(fiscalDocuments.branchId, branchId)
        )
      );

    const documentRow = documentRows[0];
    if (!documentRow) {
      return null;
    }

    // Buscar items
    const itemRows = await db
      .select()
      .from(fiscalDocumentItems)
      .where(eq(fiscalDocumentItems.documentId, id))
      .orderBy(fiscalDocumentItems.itemNumber);

    // Mapper
    const documentResult = FiscalDocumentMapper.toDomain(documentRow, itemRows);
    if (Result.isFail(documentResult)) {
      throw new Error(`Failed to map fiscal document: ${documentResult.error}`);
    }

    return documentResult.value;
  }

  /**
   * Buscar documento por chave fiscal
   * BUG 2 FIX: Adicionar branchId para multi-tenancy completo
   */
  async findByFiscalKey(fiscalKey: string, organizationId: number, branchId: number): Promise<FiscalDocument | null> {
    // Buscar documento
    const documentRows = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.fiscalKey, fiscalKey),
          eq(fiscalDocuments.organizationId, organizationId),
          eq(fiscalDocuments.branchId, branchId)
        )
      );

    const documentRow = documentRows[0];
    if (!documentRow) {
      return null;
    }

    // Buscar items
    const itemRows = await db
      .select()
      .from(fiscalDocumentItems)
      .where(eq(fiscalDocumentItems.documentId, documentRow.id))
      .orderBy(fiscalDocumentItems.itemNumber);

    // Mapper
    const documentResult = FiscalDocumentMapper.toDomain(documentRow, itemRows);
    if (Result.isFail(documentResult)) {
      throw new Error(`Failed to map fiscal document: ${documentResult.error}`);
    }

    return documentResult.value;
  }

  /**
   * Buscar documentos com filtros e paginação
   * BUG 1 FIX: branchId agora é obrigatório para multi-tenancy (.cursorrules)
   */
  async findMany(
    filter: FindFiscalDocumentsFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<FiscalDocument>> {
    // Build WHERE clause - branchId sempre obrigatório
    const conditions = [
      eq(fiscalDocuments.organizationId, filter.organizationId),
      eq(fiscalDocuments.branchId, filter.branchId), // BUG 1 FIX: Sempre filtrar por branch
    ];

    if (filter.documentType && filter.documentType.length > 0) {
      conditions.push(inArray(fiscalDocuments.documentType, filter.documentType));
    }

    if (filter.status && filter.status.length > 0) {
      conditions.push(inArray(fiscalDocuments.status, filter.status));
    }

    if (filter.issueDateFrom) {
      conditions.push(gte(fiscalDocuments.issueDate, filter.issueDateFrom));
    }

    if (filter.issueDateTo) {
      conditions.push(lte(fiscalDocuments.issueDate, filter.issueDateTo));
    }

    if (filter.recipientCnpjCpf) {
      conditions.push(eq(fiscalDocuments.recipientCnpjCpf, filter.recipientCnpjCpf));
    }

    if (filter.search) {
      conditions.push(
        or(
          like(fiscalDocuments.number, `%${filter.search}%`),
          like(fiscalDocuments.recipientName, `%${filter.search}%`),
          like(fiscalDocuments.fiscalKey, `%${filter.search}%`)
        ) as ReturnType<typeof eq>
      );
    }

    // Query documents with combined WHERE
    const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;
    
    // Count total
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(fiscalDocuments)
      .where(whereClause);
    
    const total = countResult[0]?.count ?? 0;

    // Query paginated data
    const offset = (pagination.page - 1) * pagination.pageSize;
    const baseQuery = db
      .select()
      .from(fiscalDocuments)
      .where(whereClause)
      .orderBy(fiscalDocuments.createdAt);
    
    const rows = await baseQuery.offset(offset).fetch(pagination.pageSize);

    // Buscar items de todos os documentos em batch
    const documentIds = rows.map((row) => row.id);
    const allItems = documentIds.length > 0
      ? await db
          .select()
          .from(fiscalDocumentItems)
          .where(inArray(fiscalDocumentItems.documentId, documentIds))
          .orderBy(fiscalDocumentItems.itemNumber)
      : [];

    // Group items by documentId
    const itemsByDocumentId = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const items = itemsByDocumentId.get(item.documentId) ?? [];
      items.push(item);
      itemsByDocumentId.set(item.documentId, items);
    }

    // Map to domain
    const documents: FiscalDocument[] = [];
    for (const row of rows) {
      const items = itemsByDocumentId.get(row.id) ?? [];
      const documentResult = FiscalDocumentMapper.toDomain(row, items);
      if (Result.isOk(documentResult)) {
        documents.push(documentResult.value);
      }
    }

    return {
      data: documents,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  /**
   * Salvar documento (create ou update)
   */
  async save(document: FiscalDocument): Promise<void> {
    const documentPersistence = FiscalDocumentMapper.toPersistence(document);

    // Verificar se documento já existe
    const existing = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.id, document.id));

    if (existing.length > 0) {
      // UPDATE - BUG 4 FIX: Atualizar TODOS os campos mutáveis
      await db
        .update(fiscalDocuments)
        .set({
          // Status e metadados de processamento
          status: documentPersistence.status,
          fiscalKey: documentPersistence.fiscalKey,
          protocolNumber: documentPersistence.protocolNumber,
          rejectionCode: documentPersistence.rejectionCode,
          rejectionReason: documentPersistence.rejectionReason,
          // Campos editáveis do documento
          issueDate: documentPersistence.issueDate,
          issuerId: documentPersistence.issuerId,
          issuerCnpj: documentPersistence.issuerCnpj,
          issuerName: documentPersistence.issuerName,
          recipientId: documentPersistence.recipientId, // BUG 2 FIX: LC-403588
          recipientCnpjCpf: documentPersistence.recipientCnpjCpf,
          recipientName: documentPersistence.recipientName,
          totalValue: documentPersistence.totalValue,
          currency: documentPersistence.currency, // BUG 2 FIX: LC-393053
          notes: documentPersistence.notes,
          // Reforma Tributária (Week 3)
          taxRegime: documentPersistence.taxRegime,
          totalIbs: documentPersistence.totalIbs,
          totalIbsCurrency: documentPersistence.totalIbsCurrency,
          totalCbs: documentPersistence.totalCbs,
          totalCbsCurrency: documentPersistence.totalCbsCurrency,
          totalIs: documentPersistence.totalIs,
          totalIsCurrency: documentPersistence.totalIsCurrency,
          totalDFeValue: documentPersistence.totalDFeValue,
          totalDFeValueCurrency: documentPersistence.totalDFeValueCurrency,
          ibsCbsMunicipalityCode: documentPersistence.ibsCbsMunicipalityCode,
          governmentPurchaseEntityType: documentPersistence.governmentPurchaseEntityType,
          governmentPurchaseRateReduction: documentPersistence.governmentPurchaseRateReduction,
          // Audit
          updatedAt: new Date(),
        })
        .where(eq(fiscalDocuments.id, document.id));

      // Deletar items antigos e inserir novos (simplificado)
      await db.delete(fiscalDocumentItems).where(eq(fiscalDocumentItems.documentId, document.id));
    }

    // INSERT documento (se não existia)
    if (existing.length === 0) {
      await db.insert(fiscalDocuments).values(documentPersistence as typeof fiscalDocuments.$inferInsert);
    }

    // INSERT items
    if (document.items.length > 0) {
      const itemsPersistence = document.items.map((item) =>
        FiscalDocumentMapper.itemToPersistence(item, document.id)
      );

      for (const item of itemsPersistence) {
        await db.insert(fiscalDocumentItems).values(item);
      }
    }
  }

  /**
   * Salvar múltiplos documentos (usar transação)
   * TODO: Implementar com db.transaction() em produção
   */
  async saveMany(documents: FiscalDocument[]): Promise<void> {
    for (const document of documents) {
      await this.save(document);
    }
  }

  /**
   * Verificar se documento existe
   * BUG 2 FIX: Adicionar branchId para multi-tenancy completo
   */
  async exists(id: string, organizationId: number, branchId: number): Promise<boolean> {
    const result = await db
      .select({ id: fiscalDocuments.id })
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, id),
          eq(fiscalDocuments.organizationId, organizationId),
          eq(fiscalDocuments.branchId, branchId)
        )
      );

    return result.length > 0;
  }

  /**
   * Gerar próximo número do documento
   */
  async nextDocumentNumber(
    organizationId: number,
    branchId: number,
    documentType: DocumentType,
    series: string
  ): Promise<string> {
    // Buscar último número da série
    const result = await db
      .select({ number: fiscalDocuments.number })
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.organizationId, organizationId),
          eq(fiscalDocuments.branchId, branchId),
          eq(fiscalDocuments.documentType, documentType),
          eq(fiscalDocuments.series, series)
        )
      )
      .orderBy(sql`CAST(${fiscalDocuments.number} AS INT) DESC`);

    const lastNumber = result[0]?.number ?? '0';
    const nextNumber = parseInt(lastNumber, 10) + 1;

    return String(nextNumber).padStart(9, '0'); // Formato: 000000001
  }
}

