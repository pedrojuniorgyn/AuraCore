/**
 * Helper reutilizável para AG Grid Server-Side Row Model (SSRM)
 * 
 * @module lib/ag-grid/ssrm-helper
 * @see ADR-0006 - Paginação no SQL Server
 */

import { db } from '@/lib/db';
import { 
  eq, and, like, gte, lte, desc, asc, isNull, count, inArray, 
  type SQL 
} from 'drizzle-orm';
import type { AnyMsSqlTable } from 'drizzle-orm/mssql-core';
import type { 
  IServerSideGetRowsRequest, 
  IServerSideGetRowsResponse,
  SSRMHelperOptions,
  SSRMContext,
  FilterModel,
} from '@/types/ag-grid-ssrm';

/**
 * Tipo genérico para tabela Drizzle com campos acessíveis
 * Permite acesso dinâmico aos campos enquanto mantém type-safety
 */
type DrizzleTableWithColumns = AnyMsSqlTable & Record<string, unknown>;

/**
 * Interface para queries com métodos de paginação
 * @see LC-001 (Type Safety Contract) - usar unknown ao invés de any
 */
interface PaginatedQuery<T> {
  limit(count: number): { offset(count: number): Promise<T[]> };
  offset(count: number): { limit(count: number): Promise<T[]> };
}

/**
 * Executa query SSRM genérica para qualquer tabela Drizzle
 * 
 * @param table - Tabela Drizzle
 * @param request - Request do AG Grid
 * @param context - Contexto de tenant
 * @param options - Opções de configuração
 * @returns Response formatado para AG Grid
 * 
 * @example
 * ```typescript
 * const result = await executeSSRMQuery(
 *   accountsPayable,
 *   request,
 *   { organizationId: 1, branchId: 1 },
 *   {
 *     allowedFilterFields: ['status', 'dueDate', 'partnerName'],
 *     allowedSortFields: ['createdAt', 'dueDate', 'amount'],
 *     defaultSort: { field: 'createdAt', direction: 'desc' },
 *   }
 * );
 * ```
 */
export async function executeSSRMQuery(
  table: DrizzleTableWithColumns,
  request: IServerSideGetRowsRequest,
  context: SSRMContext,
  options: SSRMHelperOptions
): Promise<IServerSideGetRowsResponse<Record<string, unknown>>> {
  const {
    allowedFilterFields,
    allowedSortFields,
    defaultSort = { field: 'createdAt', direction: 'desc' },
    maxPageSize = 500,
  } = options;

  const { startRow, endRow, sortModel, filterModel } = request;
  
  // Calcular pageSize com proteção contra abuso
  const requestedPageSize = endRow - startRow;
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  // Construir condições base (multi-tenancy + soft delete)
  const conditions = buildBaseConditions(table, context);

  // Aplicar filtros do AG Grid (apenas campos permitidos)
  const filterConditions = buildFilterConditions(
    table, 
    filterModel, 
    allowedFilterFields
  );
  conditions.push(...filterConditions);

  // Construir ORDER BY (apenas campos permitidos)
  const orderByClause = buildOrderBy(
    table, 
    sortModel, 
    allowedSortFields, 
    defaultSort
  );

  // Construir query base
  const whereClause = and(...conditions) as SQL;
  
  // Query de dados - usar cast explícito para AnyMsSqlTable que é aceito pelo Drizzle
  const drizzleTable = table as AnyMsSqlTable;
  
  // Construir query base
  const baseQuery = db
    .select()
    .from(drizzleTable)
    .where(whereClause)
    .orderBy(...orderByClause);
  
  // Aplicar paginação com type-safety (usando unknown ao invés de any)
  // @see LC-001 (Type Safety Contract) - usar interface específica
  const paginatedQuery = baseQuery as unknown as PaginatedQuery<Record<string, unknown>>;
  const rows = await paginatedQuery.limit(pageSize).offset(startRow);

  // Query de count
  const countResult = await db
    .select({ total: count() })
    .from(drizzleTable)
    .where(whereClause);

  const total = countResult[0]?.total ?? 0;

  return {
    rowData: rows,
    rowCount: total,
  };
}

/**
 * Constrói condições base de multi-tenancy e soft delete
 */
function buildBaseConditions(
  table: DrizzleTableWithColumns,
  context: SSRMContext
): SQL[] {
  const conditions: SQL[] = [];

  // Multi-tenancy obrigatório (SCHEMA-003)
  if ('organizationId' in table) {
    conditions.push(eq(table.organizationId as SQL, context.organizationId));
  }
  if ('branchId' in table) {
    conditions.push(eq(table.branchId as SQL, context.branchId));
  }

  // Soft delete (SCHEMA-006)
  if ('deletedAt' in table) {
    conditions.push(isNull(table.deletedAt as SQL));
  }

  return conditions;
}

/**
 * Constrói condições de filtro do AG Grid
 */
function buildFilterConditions(
  table: DrizzleTableWithColumns,
  filterModel: Record<string, FilterModel>,
  allowedFields: string[]
): SQL[] {
  const conditions: SQL[] = [];

  for (const [field, filter] of Object.entries(filterModel)) {
    // Segurança: só permitir campos da whitelist
    if (!allowedFields.includes(field)) {
      console.warn(`[SSRM] Campo não permitido para filtro: ${field}`);
      continue;
    }

    const column = table[field];
    if (!column) continue;

    const condition = buildFilterCondition(column as SQL, filter);
    if (condition) {
      conditions.push(condition);
    }
  }

  return conditions;
}

/**
 * Constrói uma condição de filtro individual
 */
function buildFilterCondition(column: SQL, filter: FilterModel): SQL | null {
  switch (filter.filterType) {
    case 'text':
      return buildTextFilter(column, filter);
    case 'number':
      return buildNumberFilter(column, filter);
    case 'date':
      return buildDateFilter(column, filter);
    case 'set':
      return buildSetFilter(column, filter);
    default:
      return null;
  }
}

function buildTextFilter(column: SQL, filter: FilterModel & { filterType: 'text' }): SQL | null {
  if (!filter.filter && filter.type !== 'blank' && filter.type !== 'notBlank') {
    return null;
  }

  switch (filter.type) {
    case 'equals':
      return eq(column, filter.filter!);
    case 'contains':
      return like(column, `%${filter.filter}%`);
    case 'startsWith':
      return like(column, `${filter.filter}%`);
    case 'endsWith':
      return like(column, `%${filter.filter}`);
    case 'blank':
      return isNull(column);
    default:
      return null;
  }
}

function buildNumberFilter(column: SQL, filter: FilterModel & { filterType: 'number' }): SQL | null {
  if (filter.filter === undefined && filter.type !== 'blank' && filter.type !== 'notBlank') {
    return null;
  }

  switch (filter.type) {
    case 'equals':
      return eq(column, filter.filter!);
    case 'greaterThan':
    case 'greaterThanOrEqual':
      return gte(column, filter.filter!);
    case 'lessThan':
    case 'lessThanOrEqual':
      return lte(column, filter.filter!);
    case 'inRange':
      if (filter.filter !== undefined && filter.filterTo !== undefined) {
        return and(gte(column, filter.filter), lte(column, filter.filterTo)) as SQL;
      }
      return null;
    case 'blank':
      return isNull(column);
    default:
      return null;
  }
}

function buildDateFilter(column: SQL, filter: FilterModel & { filterType: 'date' }): SQL | null {
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
    case 'blank':
      return isNull(column);
    default:
      return null;
  }
}

function buildSetFilter(column: SQL, filter: FilterModel & { filterType: 'set' }): SQL | null {
  if (filter.values && filter.values.length > 0) {
    return inArray(column, filter.values);
  }
  return null;
}

/**
 * Constrói cláusula ORDER BY
 */
function buildOrderBy(
  table: DrizzleTableWithColumns,
  sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>,
  allowedFields: string[],
  defaultSort: { field: string; direction: 'asc' | 'desc' }
): SQL[] {
  const orderByClause: SQL[] = [];

  for (const { colId, sort } of sortModel) {
    // Segurança: só permitir campos da whitelist
    if (!allowedFields.includes(colId)) {
      console.warn(`[SSRM] Campo não permitido para ordenação: ${colId}`);
      continue;
    }

    const column = table[colId];
    if (column) {
      orderByClause.push(sort === 'asc' ? asc(column as SQL) : desc(column as SQL));
    }
  }

  // Aplicar ordenação padrão se nenhuma foi especificada
  if (orderByClause.length === 0) {
    const defaultColumn = table[defaultSort.field];
    if (defaultColumn) {
      orderByClause.push(
        defaultSort.direction === 'asc' 
          ? asc(defaultColumn as SQL) 
          : desc(defaultColumn as SQL)
      );
    }
  }

  return orderByClause;
}
