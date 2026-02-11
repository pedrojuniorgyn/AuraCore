/**
 * API: POST /api/fiscal/cte/ssrm
 * Server-Side Row Model para AG Grid - CTe (Conhecimento de Transporte Eletrônico)
 * 
 * @module app/api/fiscal/cte/ssrm
 * @see ADR-0006 - Paginação no SQL Server
 * @see E8.4 - SSRM Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { db } from '@/lib/db';
import { cteHeader, businessPartners } from '@/lib/db/schema';
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
import { logger } from '@/shared/infrastructure/logging';

// Campos permitidos para filtro (whitelist de segurança)
const ALLOWED_FILTER_FIELDS = [
  'cteNumber',
  'cteKey',
  'serie',
  'status',
  'takerName',
  'serviceValue',
  'totalValue',
  'issueDate',
  'originUf',
  'destinationUf',
];

// Campos permitidos para ordenação
const ALLOWED_SORT_FIELDS = [
  'cteNumber',
  'cteKey',
  'status',
  'takerName',
  'serviceValue',
  'totalValue',
  'issueDate',
  'createdAt',
];

// Limite máximo de registros por página
const MAX_PAGE_SIZE = 500;

interface CTeSSRMRow {
  id: number;
  cteNumber: number;
  serie: string | null;
  model: string | null;
  cteKey: string | null;
  status: string | null;
  takerName: string | null;
  takerId: number;
  senderId: number | null;
  recipientId: number | null;
  issueDate: Date;
  originUf: string;
  destinationUf: string;
  serviceValue: string;
  totalValue: string;
  createdAt: Date | null;
}

export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();
    const body: IServerSideGetRowsRequest = await request.json();
    
    const { startRow, endRow, sortModel, filterModel } = body;
    
    // Calcular pageSize com proteção contra abuso
    const requestedPageSize = endRow - startRow;
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

    // Base conditions (multi-tenancy + soft delete - SCHEMA-003, SCHEMA-006)
    const conditions: SQL[] = [
      eq(cteHeader.organizationId, ctx.organizationId),
      eq(cteHeader.branchId, ctx.branchId),
      isNull(cteHeader.deletedAt),
    ];

    // Aplicar filtros do AG Grid
    for (const [field, filter] of Object.entries(filterModel)) {
      if (!ALLOWED_FILTER_FIELDS.includes(field)) {
        logger.warn(`[SSRM] Campo não permitido para filtro: ${field}`);
        continue;
      }

      const condition = buildFilterCondition(field, filter as FilterModel);
      if (condition) {
        conditions.push(condition);
      }
    }

    // Construir ORDER BY
    const orderByClause = buildOrderBy(sortModel);

    // Alias para JOINs múltiplos na mesma tabela
    const takerPartner = businessPartners;

    // Query com JOIN para buscar nome do tomador
    // MSSQL: usar offset(n).fetch(m) ao invés de limit(m).offset(n)
    const baseQuery = db
      .select({
        id: cteHeader.id,
        cteNumber: cteHeader.cteNumber,
        serie: cteHeader.serie,
        model: cteHeader.model,
        cteKey: cteHeader.cteKey,
        status: cteHeader.status,
        takerName: takerPartner.name,
        takerId: cteHeader.takerId,
        senderId: cteHeader.senderId,
        recipientId: cteHeader.recipientId,
        issueDate: cteHeader.issueDate,
        originUf: cteHeader.originUf,
        destinationUf: cteHeader.destinationUf,
        serviceValue: cteHeader.serviceValue,
        totalValue: cteHeader.totalValue,
        createdAt: cteHeader.createdAt,
      })
      .from(cteHeader)
      .leftJoin(takerPartner, eq(cteHeader.takerId, takerPartner.id))
      .where(and(...conditions))
      .orderBy(...orderByClause);

    const rows = await baseQuery.offset(startRow).fetch(pageSize);

    // Count total (sem JOINs para performance)
    const [countResult] = await db
      .select({ total: count() })
      .from(cteHeader)
      .where(and(...conditions));

    const total = countResult?.total ?? 0;

    // Formatar resposta
    const response: IServerSideGetRowsResponse<CTeSSRMRow> = {
      rowData: rows as CTeSSRMRow[],
      rowCount: total,
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('[SSRM] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch data', details: message },
      { status: 500 }
    );
  }
});

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

  if (filter.type === 'blank') {
    return isNull(column);
  }
  if (filter.type === 'notBlank') {
    return isNotNull(column);
  }

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

  if (filter.type === 'blank') {
    return isNull(column);
  }
  if (filter.type === 'notBlank') {
    return isNotNull(column);
  }

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
    cteNumber: cteHeader.cteNumber as unknown as SQL,
    cteKey: cteHeader.cteKey as unknown as SQL,
    serie: cteHeader.serie as unknown as SQL,
    status: cteHeader.status as unknown as SQL,
    takerName: businessPartners.name as unknown as SQL,
    serviceValue: cteHeader.serviceValue as unknown as SQL,
    totalValue: cteHeader.totalValue as unknown as SQL,
    issueDate: cteHeader.issueDate as unknown as SQL,
    originUf: cteHeader.originUf as unknown as SQL,
    destinationUf: cteHeader.destinationUf as unknown as SQL,
    createdAt: cteHeader.createdAt as unknown as SQL,
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
      logger.warn(`[SSRM] Campo não permitido para ordenação: ${colId}`);
      continue;
    }

    const column = getColumn(colId);
    if (column) {
      orderByClause.push(sort === 'asc' ? asc(column) : desc(column));
    }
  }

  // Ordenação padrão: cteNumber DESC
  if (orderByClause.length === 0) {
    orderByClause.push(desc(cteHeader.cteNumber as unknown as SQL));
  }

  return orderByClause;
}
