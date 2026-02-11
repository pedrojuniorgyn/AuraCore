import { injectable } from 'tsyringe';
import { eq, and, gte, lte, like, inArray, isNull, sql, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { queryPaginated } from '@/lib/db/query-helpers';
import { AccountPayable } from '../../domain/entities/AccountPayable';
import { 
  IPayableRepository, 
  FindPayablesFilter, 
  PaginationOptions,
  PaginatedResult 
} from '../../domain/ports/output/IPayableRepository';
import { PayableMapper } from './mappers/PayableMapper';
import { accountsPayableTable, paymentsTable, type AccountPayableRow } from './schemas/PayableSchema';
import { Result } from '@/shared/domain';

/**
 * Implementação Drizzle do IPayableRepository
 * 
 * Este é um ADAPTER que implementa o PORT (interface) do domínio.
 * O domínio não sabe nada sobre Drizzle, SQL Server, etc.
 */
@injectable()
export class DrizzlePayableRepository implements IPayableRepository {

  /**
   * Busca por ID com payments
   * 
   * @param id ID da conta a pagar
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO - ENFORCE-004)
   */
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<AccountPayable | null> {
    // 1. Buscar payable com filtro multi-tenancy completo
    const rows = await db
      .select()
      .from(accountsPayableTable)
      .where(
        and(
          eq(accountsPayableTable.id, id),
          eq(accountsPayableTable.organizationId, organizationId),
          eq(accountsPayableTable.branchId, branchId),
          isNull(accountsPayableTable.deletedAt)
        )
      );

    const payableRow = rows[0];
    if (!payableRow) {
      return null;
    }

    // 2. Buscar payments relacionados
    const paymentRows = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.payableId, id));

    // 3. Mapear para domain
    const result = PayableMapper.toDomain(payableRow, paymentRows);
    
    return Result.isOk(result) ? result.value : null;
  }

  /**
   * Busca com filtros e paginação
   * 
   * @param filter Filtros de busca (branchId OBRIGATÓRIO - ENFORCE-004)
   * @param pagination Opções de paginação
   */
  async findMany(
    filter: FindPayablesFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<AccountPayable>> {
    // 1. Construir condições - branchId SEMPRE aplicado (ENFORCE-004)
    const conditions = [
      eq(accountsPayableTable.organizationId, filter.organizationId),
      eq(accountsPayableTable.branchId, filter.branchId), // OBRIGATÓRIO
      isNull(accountsPayableTable.deletedAt),
    ];

    if (filter.supplierId) {
      conditions.push(eq(accountsPayableTable.supplierId, filter.supplierId));
    }

    if (filter.status && filter.status.length > 0) {
      conditions.push(inArray(accountsPayableTable.status, filter.status));
    }

    if (filter.dueDateFrom) {
      conditions.push(gte(accountsPayableTable.dueDate, filter.dueDateFrom));
    }

    if (filter.dueDateTo) {
      conditions.push(lte(accountsPayableTable.dueDate, filter.dueDateTo));
    }

    if (filter.search) {
      conditions.push(
        like(accountsPayableTable.documentNumber, `%${filter.search}%`)
      );
    }

    const whereClause = and(...conditions);

    // 2. Contar total
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(accountsPayableTable)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // 3. Buscar com paginação
    const orderColumn = pagination.sortBy === 'dueDate' 
      ? accountsPayableTable.dueDate 
      : accountsPayableTable.createdAt;
    
    const orderFn = pagination.sortOrder === 'asc' ? asc : desc;

    const rows = await queryPaginated<AccountPayableRow>(
      db
        .select()
        .from(accountsPayableTable)
        .where(whereClause)
        .orderBy(orderFn(orderColumn)),
      pagination
    );

    // 4. Buscar payments para cada payable
    const payableIds = rows.map((r: AccountPayableRow) => r.id);
    
    const paymentsByPayable: Map<string, typeof paymentsTable.$inferSelect[]> = new Map();
    
    if (payableIds.length > 0) {
      const allPayments = await db
        .select()
        .from(paymentsTable)
        .where(inArray(paymentsTable.payableId, payableIds));

      // Agrupar por payableId
      for (const payment of allPayments) {
        const existing = paymentsByPayable.get(payment.payableId) || [];
        existing.push(payment);
        paymentsByPayable.set(payment.payableId, existing);
      }
    }

    // 5. Mapear para domain
    const payables: AccountPayable[] = [];
    for (const row of rows) {
      const payments = paymentsByPayable.get(row.id) || [];
      const result = PayableMapper.toDomain(row, payments);
      if (Result.isOk(result)) {
        payables.push(result.value);
      }
    }

    return {
      data: payables,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  /**
   * Salva (create ou update)
   */
  async save(payable: AccountPayable): Promise<void> {
    const row = PayableMapper.toPersistence(payable);

    // Check if exists
    const existing = await db
      .select({ id: accountsPayableTable.id })
      .from(accountsPayableTable)
      .where(eq(accountsPayableTable.id, payable.id));

    if (existing.length > 0) {
      // Update
      await db
        .update(accountsPayableTable)
        .set({
          status: row.status,
          version: row.version,
          updatedAt: new Date(),
          notes: row.notes,
        })
        .where(eq(accountsPayableTable.id, payable.id));
    } else {
      // Insert
      await db.insert(accountsPayableTable).values(row);
    }

    // Salvar payments
    for (const payment of payable.payments) {
      const paymentRow = PayableMapper.paymentToPersistence(payment, payable.id);
      
      const existingPayment = await db
        .select({ id: paymentsTable.id })
        .from(paymentsTable)
        .where(eq(paymentsTable.id, payment.id));

      if (existingPayment.length > 0) {
        // Update payment
        await db
          .update(paymentsTable)
          .set({
            status: paymentRow.status,
            transactionId: paymentRow.transactionId,
            updatedAt: new Date(),
          })
          .where(eq(paymentsTable.id, payment.id));
      } else {
        // Insert payment
        await db.insert(paymentsTable).values(paymentRow);
      }
    }
  }

  /**
   * Busca vencidos
   * 
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO - ENFORCE-004)
   * @param referenceDate Data de referência (default: hoje)
   */
  async findOverdue(
    organizationId: number,
    branchId: number,
    referenceDate: Date = new Date()
  ): Promise<AccountPayable[]> {
    // branchId SEMPRE aplicado (ENFORCE-004)
    const conditions = [
      eq(accountsPayableTable.organizationId, organizationId),
      eq(accountsPayableTable.branchId, branchId), // OBRIGATÓRIO
      isNull(accountsPayableTable.deletedAt),
      inArray(accountsPayableTable.status, ['OPEN', 'PARTIAL']),
      lte(accountsPayableTable.dueDate, referenceDate),
    ];

    const rows = await db
      .select()
      .from(accountsPayableTable)
      .where(and(...conditions))
      .orderBy(asc(accountsPayableTable.dueDate));

    // Mapear (sem payments para performance)
    const payables: AccountPayable[] = [];
    for (const row of rows) {
      const result = PayableMapper.toDomain(row, []);
      if (Result.isOk(result)) {
        payables.push(result.value);
      }
    }

    return payables;
  }

  /**
   * Busca por fornecedor
   * 
   * @param supplierId ID do fornecedor
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO - ENFORCE-004)
   */
  async findBySupplier(
    supplierId: number,
    organizationId: number,
    branchId: number
  ): Promise<AccountPayable[]> {
    // branchId SEMPRE aplicado (ENFORCE-004)
    const rows = await db
      .select()
      .from(accountsPayableTable)
      .where(
        and(
          eq(accountsPayableTable.supplierId, supplierId),
          eq(accountsPayableTable.organizationId, organizationId),
          eq(accountsPayableTable.branchId, branchId), // OBRIGATÓRIO
          isNull(accountsPayableTable.deletedAt)
        )
      )
      .orderBy(desc(accountsPayableTable.createdAt));

    const payables: AccountPayable[] = [];
    for (const row of rows) {
      const result = PayableMapper.toDomain(row, []);
      if (Result.isOk(result)) {
        payables.push(result.value);
      }
    }

    return payables;
  }

  /**
   * Verifica existência
   * 
   * @param id ID da conta a pagar
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO - ENFORCE-004)
   */
  async exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean> {
    // branchId SEMPRE aplicado (ENFORCE-004)
    const result = await db
      .select({ id: accountsPayableTable.id })
      .from(accountsPayableTable)
      .where(
        and(
          eq(accountsPayableTable.id, id),
          eq(accountsPayableTable.organizationId, organizationId),
          eq(accountsPayableTable.branchId, branchId), // OBRIGATÓRIO
          isNull(accountsPayableTable.deletedAt)
        )
      );

    return result.length > 0;
  }

  /**
   * Gera próximo número de documento
   */
  async nextDocumentNumber(organizationId: number, branchId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CP-${branchId}-${year}-`;

    const result = await db
      .select({ 
        maxNum: sql<string>`MAX(CAST(SUBSTRING(document_number, LEN(${prefix}) + 1, 10) AS INT))` 
      })
      .from(accountsPayableTable)
      .where(
        and(
          eq(accountsPayableTable.organizationId, organizationId),
          like(accountsPayableTable.documentNumber, `${prefix}%`)
        )
      );

    const maxNum = result[0]?.maxNum ? parseInt(result[0].maxNum) : 0;
    const nextNum = (maxNum + 1).toString().padStart(6, '0');

    return `${prefix}${nextNum}`;
  }
}

