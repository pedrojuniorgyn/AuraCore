/**
 * Cursor Pagination Utilities
 * Implementa cursor-based pagination para melhor performance em grandes datasets
 * 
 * @module lib/db
 */
import { SQL, and, desc, lt } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

export interface CursorPaginationInput {
  cursor?: string; // Última data/valor da página anterior (base64)
  limit?: number; // Número de itens por página
}

export interface CursorPaginationOutput<T> {
  items: T[];
  nextCursor: string | null; // Cursor para próxima página
  hasMore: boolean;
}

/**
 * Codifica cursor (datetime) para base64
 */
export function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64');
}

/**
 * Decodifica cursor de base64 para Date
 */
export function decodeCursor(cursor: string): Date | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const date = new Date(decoded);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Adiciona condições de cursor pagination a uma query Drizzle
 * 
 * @example
 * ```typescript
 * const query = db.select()
 *   .from(strategiesTable)
 *   .where(
 *     and(
 *       eq(strategiesTable.organizationId, orgId),
 *       ...applyCursorCondition(strategiesTable.createdAt, cursor)
 *     )
 *   )
 *   .orderBy(desc(strategiesTable.createdAt))
 *   .limit(limit + 1);
 * ```
 */
export function applyCursorCondition(
  column: PgColumn,
  cursor: string | undefined
): SQL[] {
  if (!cursor) {
    return [];
  }

  const cursorDate = decodeCursor(cursor);
  if (!cursorDate) {
    return [];
  }

  // WHERE createdAt < cursor (para DESC ordering)
  return [lt(column, cursorDate)];
}

/**
 * Processa resultado de query com cursor pagination
 * Retorna items e nextCursor
 */
export function processCursorResult<T extends { createdAt: Date }>(
  items: T[],
  limit: number
): CursorPaginationOutput<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;
  
  const nextCursor = hasMore && resultItems.length > 0
    ? encodeCursor(resultItems[resultItems.length - 1].createdAt)
    : null;

  return {
    items: resultItems,
    nextCursor,
    hasMore,
  };
}

/**
 * Helper completo de cursor pagination
 * Combina applyCursorCondition + processCursorResult
 * 
 * @example
 * ```typescript
 * const { items, nextCursor, hasMore } = await cursorPaginate({
 *   query: db.select().from(table).where(...),
 *   cursorColumn: table.createdAt,
 *   cursor: input.cursor,
 *   limit: input.limit || 50,
 * });
 * ```
 */
export async function cursorPaginate<T extends { createdAt: Date }>(params: {
  query: unknown; // Drizzle query builder
  cursorColumn: PgColumn;
  cursor?: string;
  limit: number;
}): Promise<CursorPaginationOutput<T>> {
  const { query, limit } = params;

  // Buscar limit + 1 para detectar se há mais páginas
  type QueryWithLimit = { limit(n: number): Promise<T[]> };
  const results = await (query as unknown as QueryWithLimit).limit(limit + 1);

  return processCursorResult(results, limit);
}
