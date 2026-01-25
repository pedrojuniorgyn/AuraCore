/**
 * API: POST /api/financial/payables/ssrm
 * Server-Side Row Model para AG Grid - Contas a Pagar
 * 
 * @module app/api/financial/payables/ssrm
 * @see ADR-0006 - Paginação no SQL Server
 * @see E8.4 - SSRM Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accountsPayable, businessPartners, financialCategories } from '@/lib/db/schema';
import { 
  eq, and, like, gte, lte, desc, asc, isNull, isNotNull, count, inArray,
  type SQL 
} from 'drizzle-orm';
import { getTenantContext } from '@/lib/auth/context';
import type { 
  IServerSideGetRowsRequest, 
  IServerSideGetRowsResponse,
  FilterModel,
} from '@/types/ag-grid-ssrm';

// Campos permitidos para filtro (whitelist de segurança)
const ALLOWED_FILTER_FIELDS = [
  'documentNumber',
  'partnerName',
  'status',
  'origin',
  'categoryName',
  'description',
  'amount',
  'dueDate',
  'issueDate',
];

// Campos permitidos para ordenação
const ALLOWED_SORT_FIELDS = [
  'documentNumber',
  'partnerName',
  'status',
  'origin',
  'amount',
  'amountPaid',
  'dueDate',
  'issueDate',
  'createdAt',
];

// Limite máximo de registros por página
const MAX_PAGE_SIZE = 500;

interface PayableSSRMRow {
  id: number;
  documentNumber: string | null;
  partnerName: string | null;
  partnerId: number | null;
  categoryName: string | null;
  categoryId: number | null;
  description: string;
  issueDate: Date;
  dueDate: Date;
  amount: string;
  amountPaid: string;
  status: string;
  origin: string | null;
  createdAt: Date | null;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const body: IServerSideGetRowsRequest = await request.json();
    
    const { startRow, endRow, sortModel, filterModel } = body;
    
    // Calcular pageSize com proteção contra abuso
    const requestedPageSize = endRow - startRow;
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

    // Base conditions (multi-tenancy + soft delete - SCHEMA-003, SCHEMA-006)
    const conditions: SQL[] = [
      eq(accountsPayable.organizationId, ctx.organizationId),
      eq(accountsPayable.branchId, ctx.branchId),
      isNull(accountsPayable.deletedAt),
    ];

    // Aplicar filtros do AG Grid
    for (const [field, filter] of Object.entries(filterModel)) {
      if (!ALLOWED_FILTER_FIELDS.includes(field)) {
        console.warn(`[SSRM] Campo não permitido para filtro: ${field}`);
        continue;
      }

      const condition = buildFilterCondition(field, filter as FilterModel);
      if (condition) {
        conditions.push(condition);
      }
    }

    // Construir ORDER BY
    const orderByClause = buildOrderBy(sortModel);

    // Query com JOIN para buscar nomes de parceiros e categorias
    // MSSQL: usar offset(n).fetch(m) ao invés de limit(m).offset(n)
    const baseQuery = db
      .select({
        id: accountsPayable.id,
        documentNumber: accountsPayable.documentNumber,
        partnerName: businessPartners.name,
        partnerId: accountsPayable.partnerId,
        categoryName: financialCategories.name,
        categoryId: accountsPayable.categoryId,
        description: accountsPayable.description,
        issueDate: accountsPayable.issueDate,
        dueDate: accountsPayable.dueDate,
        amount: accountsPayable.amount,
        amountPaid: accountsPayable.amountPaid,
        status: accountsPayable.status,
        origin: accountsPayable.origin,
        createdAt: accountsPayable.createdAt,
      })
      .from(accountsPayable)
      .leftJoin(businessPartners, eq(accountsPayable.partnerId, businessPartners.id))
      .leftJoin(financialCategories, eq(accountsPayable.categoryId, financialCategories.id))
      .where(and(...conditions))
      .orderBy(...orderByClause);

    const rows = await baseQuery.offset(startRow).fetch(pageSize);

    // Count total (sem JOINs para performance)
    const [countResult] = await db
      .select({ total: count() })
      .from(accountsPayable)
      .where(and(...conditions));

    const total = countResult?.total ?? 0;

    // Formatar resposta
    const response: IServerSideGetRowsResponse<PayableSSRMRow> = {
      rowData: rows as PayableSSRMRow[],
      rowCount: total,
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[SSRM] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch data', details: message },
      { status: 500 }
    );
  }
}

/**
 * Constrói condição de filtro para um campo específico
 */
function buildFilterCondition(field: string, filter: FilterModel): SQL | null {
  switch (filter.filterType) {
    case 'text':
      return buildTextFilter(field, filter);
    case 'number':
      return buildNumberFilter(field, filter);
    case 'date':
      return buildDateFilter(field, filter);
    case 'set':
      return buildSetFilter(field, filter);
    default:
      return null;
  }
}

function buildTextFilter(field: string, filter: FilterModel & { filterType: 'text' }): SQL | null {
  const column = getColumn(field);
  if (!column) return null;

  // FIX: Tratar blank/notBlank ANTES de verificar filter.filter
  if (filter.type === 'blank') {
    return isNull(column);
  }
  if (filter.type === 'notBlank') {
    return isNotNull(column);
  }

  // Agora sim verificar se tem valor
  if (!filter.filter) return null;

  switch (filter.type) {
    case 'equals':
      return eq(column, filter.filter);
    case 'contains':
      return like(column, `%${filter.filter}%`);
    case 'startsWith':
      return like(column, `${filter.filter}%`);
    case 'endsWith':
      return like(column, `%${filter.filter}`);
    default:
      return null;
  }
}

function buildNumberFilter(field: string, filter: FilterModel & { filterType: 'number' }): SQL | null {
  const column = getColumn(field);
  if (!column) return null;

  // FIX: Tratar blank/notBlank ANTES de verificar filter.filter
  if (filter.type === 'blank') {
    return isNull(column);
  }
  if (filter.type === 'notBlank') {
    return isNotNull(column);
  }

  // Agora sim verificar se tem valor
  if (filter.filter === undefined) return null;

  switch (filter.type) {
    case 'equals':
      return eq(column, filter.filter);
    case 'greaterThan':
    case 'greaterThanOrEqual':
      return gte(column, filter.filter);
    case 'lessThan':
    case 'lessThanOrEqual':
      return lte(column, filter.filter);
    case 'inRange':
      if (filter.filterTo !== undefined) {
        return and(gte(column, filter.filter), lte(column, filter.filterTo)) as SQL;
      }
      return null;
    default:
      return null;
  }
}

function buildDateFilter(field: string, filter: FilterModel & { filterType: 'date' }): SQL | null {
  const column = getColumn(field);
  if (!column) return null;

  switch (filter.type) {
    case 'equals':
      if (filter.dateFrom) {
        return eq(column, new Date(filter.dateFrom));
      }
      return null;
    case 'greaterThan':
      if (filter.dateFrom) {
        return gte(column, new Date(filter.dateFrom));
      }
      return null;
    case 'lessThan':
      if (filter.dateFrom) {
        return lte(column, new Date(filter.dateFrom));
      }
      return null;
    case 'inRange':
      if (filter.dateFrom && filter.dateTo) {
        return and(
          gte(column, new Date(filter.dateFrom)),
          lte(column, new Date(filter.dateTo))
        ) as SQL;
      }
      return null;
    default:
      return null;
  }
}

function buildSetFilter(field: string, filter: FilterModel & { filterType: 'set' }): SQL | null {
  const column = getColumn(field);
  if (!column || !filter.values || filter.values.length === 0) return null;

  return inArray(column, filter.values);
}

/**
 * Mapeia nome do campo para coluna Drizzle
 */
function getColumn(field: string): SQL | null {
  const columnMap: Record<string, SQL> = {
    documentNumber: accountsPayable.documentNumber as unknown as SQL,
    partnerName: businessPartners.name as unknown as SQL,
    status: accountsPayable.status as unknown as SQL,
    origin: accountsPayable.origin as unknown as SQL,
    categoryName: financialCategories.name as unknown as SQL,
    description: accountsPayable.description as unknown as SQL,
    amount: accountsPayable.amount as unknown as SQL,
    amountPaid: accountsPayable.amountPaid as unknown as SQL,
    dueDate: accountsPayable.dueDate as unknown as SQL,
    issueDate: accountsPayable.issueDate as unknown as SQL,
    createdAt: accountsPayable.createdAt as unknown as SQL,
  };

  return columnMap[field] ?? null;
}

/**
 * Constrói cláusula ORDER BY
 */
function buildOrderBy(sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>): SQL[] {
  const orderByClause: SQL[] = [];

  for (const { colId, sort } of sortModel) {
    if (!ALLOWED_SORT_FIELDS.includes(colId)) {
      console.warn(`[SSRM] Campo não permitido para ordenação: ${colId}`);
      continue;
    }

    const column = getColumn(colId);
    if (column) {
      orderByClause.push(sort === 'asc' ? asc(column) : desc(column));
    }
  }

  // Ordenação padrão: createdAt DESC
  if (orderByClause.length === 0) {
    orderByClause.push(desc(accountsPayable.createdAt as unknown as SQL));
  }

  return orderByClause;
}
