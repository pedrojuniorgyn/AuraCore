/**
 * Helpers tipados para queries Drizzle ORM com dialect mssql
 *
 * Problema: Drizzle ORM com SQL Server não exporta tipagem completa
 * para métodos como .limit(), .offset(), etc.
 *
 * Solução: Funções helper que aplicam type-safety sem usar 'any'
 *
 * DIAGNÓSTICO RUNTIME (25/01/2026):
 * - .limit() = undefined (NÃO EXISTE)
 * - .top() = undefined (NÃO EXISTE - contradiz documentação!)
 * - .offset() = function (EXISTE)
 * - .fetch() = function (EXISTE)
 * - .orderBy() = function (EXISTE)
 *
 * API CORRETA MSSQL: .orderBy().offset(n).fetch(m)
 *
 * @see LC-001 (Type Safety Contract v1.0.12)
 * @see https://orm.drizzle.team/docs/select#fetch--offset
 * @see HOTFIX Sprint S3 v5 - 25/01/2026
 */

import { sql } from 'drizzle-orm';

/**
 * Interface para queries MSSQL com métodos .offset() e .fetch()
 *
 * IMPORTANTE: No MSSQL:
 * - .limit() NÃO EXISTE em runtime
 * - .top() NÃO EXISTE em runtime (apesar de existir na tipagem!)
 * - A paginação usa OFFSET...FETCH NEXT, não LIMIT/OFFSET
 * - A ordem DEVE ser: .orderBy().offset(n).fetch(m)
 *
 * @see https://orm.drizzle.team/docs/select#fetch--offset
 */
interface QueryWithOffsetFetch<T> {
  offset(count: number): { fetch(count: number): Promise<T[]> };
}

/**
 * Interface para queries com método .orderBy()
 */
interface QueryWithOrderBy<T> {
  orderBy(...columns: unknown[]): QueryWithOffsetFetch<T>;
}

/**
 * Interface para inserts com método .returning()
 */
interface InsertWithReturning<T> {
  returning<TReturn>(fields: TReturn): Promise<unknown[]>;
}

/**
 * Interface para inserts MSSQL com método .$returningId()
 * Específico do SQL Server, retorna o ID inserido
 */
interface InsertWithReturningId {
  $returningId(): Promise<{ id: number | string }[]>;
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Aplica .offset(0).fetch(n) para limitar resultados
 *
 * IMPORTANTE: No MSSQL, não existe .limit() nem .top() em runtime.
 * Se a query não tiver .orderBy(), aplica ORDER BY (SELECT NULL) como fallback.
 *
 * @deprecated Prefira usar queryFirst para buscar 1 registro ou queryPaginated para listas
 *
 * @see HOTFIX Sprint S3 v5 - 25/01/2026
 * @see https://orm.drizzle.team/docs/select#fetch--offset
 */
export async function queryWithLimit<T>(
  query: unknown,
  limitCount: number,
): Promise<T[]> {
  const q = query as Record<string, unknown>;

  // Se .offset() já existe, a query tem orderBy
  if (typeof q?.offset === 'function') {
    return (query as unknown as QueryWithOffsetFetch<T>)
      .offset(0)
      .fetch(limitCount);
  }

  // Se .orderBy() existe, aplicar fallback ORDER BY (SELECT NULL)
  if (typeof q?.orderBy === 'function') {
    console.warn(
      '[queryWithLimit] Query sem ORDER BY explícito. ' +
        'Aplicando ORDER BY (SELECT NULL) para habilitar OFFSET/FETCH. ' +
        'Resultado pode ser não-determinístico. ' +
        `Limit: ${limitCount}`,
    );
    const ordered = (query as unknown as QueryWithOrderBy<T>).orderBy(
      sql`(SELECT NULL)`,
    );
    return ordered.offset(0).fetch(limitCount);
  }

  // Fallback final: query não tem nem offset nem orderBy (improvável)
  throw new Error(
    '[queryWithLimit] Query inválida: não possui .orderBy() nem .offset(). ' +
      'MSSQL requer ORDER BY para usar OFFSET/FETCH.',
  );
}

/**
 * Aplica .offset(0).fetch(1) e retorna o primeiro resultado ou null
 *
 * IMPORTANTE: No MSSQL:
 * - .limit() NÃO EXISTE em runtime
 * - .top() NÃO EXISTE em runtime (apesar de existir na tipagem!)
 * - Se a query não tiver .orderBy(), aplica ORDER BY (SELECT NULL) como fallback
 *
 * @see HOTFIX Sprint S3 v5 - 25/01/2026
 * @see https://orm.drizzle.team/docs/select#fetch--offset
 *
 * @example
 * // ✅ CORRETO - query com orderBy (determinístico)
 * const user = await queryFirst(
 *   db.select().from(users).where(eq(users.id, id)).orderBy(asc(users.id))
 * );
 *
 * // ⚠️ FUNCIONA mas não-determinístico (warning no console)
 * const user = await queryFirst(
 *   db.select().from(users).where(eq(users.id, id))
 * );
 */
export async function queryFirst<T>(query: unknown): Promise<T | null> {
  const q = query as Record<string, unknown>;

  // Se .offset() já existe, a query tem orderBy
  if (typeof q?.offset === 'function') {
    const results = await (query as unknown as QueryWithOffsetFetch<T>)
      .offset(0)
      .fetch(1);
    return results[0] ?? null;
  }

  // Se .orderBy() existe, aplicar fallback ORDER BY (SELECT NULL)
  if (typeof q?.orderBy === 'function') {
    console.warn(
      '[queryFirst] Query sem ORDER BY explícito. ' +
        'Aplicando ORDER BY (SELECT NULL) para habilitar OFFSET/FETCH. ' +
        'Resultado pode ser não-determinístico.',
    );
    const ordered = (query as unknown as QueryWithOrderBy<T>).orderBy(
      sql`(SELECT NULL)`,
    );
    const results = await ordered.offset(0).fetch(1);
    return results[0] ?? null;
  }

  // Fallback final: query não tem nem offset nem orderBy (improvável)
  throw new Error(
    '[queryFirst] Query inválida: não possui .orderBy() nem .offset(). ' +
      'MSSQL requer ORDER BY para usar OFFSET/FETCH.',
  );
}

/**
 * Aplica paginação para MSSQL usando .offset().fetch()
 *
 * IMPORTANTE: No Drizzle ORM com SQL Server (MSSQL), a paginação usa
 * OFFSET...FETCH NEXT, NÃO LIMIT/OFFSET como PostgreSQL/MySQL.
 *
 * Se a query não tiver .orderBy(), aplica ORDER BY (SELECT NULL) como fallback.
 * NOTA: Paginação sem ORDER BY explícito é não-determinística!
 *
 * @see HOTFIX Sprint S3 v5 - 25/01/2026
 * @see https://orm.drizzle.team/docs/select#fetch--offset
 *
 * @example
 * // ✅ CORRETO - query com orderBy (determinístico)
 * const users = await queryPaginated(
 *   db.select().from(users).orderBy(users.id),
 *   { page: 1, pageSize: 10 }
 * );
 *
 * // ⚠️ FUNCIONA mas não-determinístico (warning no console)
 * const users = await queryPaginated(
 *   db.select().from(users),
 *   { page: 1, pageSize: 10 }
 * );
 */
export async function queryPaginated<T>(
  query: unknown,
  pagination: { page: number; pageSize: number },
): Promise<T[]> {
  const offsetValue = (pagination.page - 1) * pagination.pageSize;
  const q = query as Record<string, unknown>;

  // Se .offset() já existe, a query tem orderBy
  if (typeof q?.offset === 'function') {
    return (query as unknown as QueryWithOffsetFetch<T>)
      .offset(offsetValue)
      .fetch(pagination.pageSize);
  }

  // Se .orderBy() existe, aplicar fallback ORDER BY (SELECT NULL)
  if (typeof q?.orderBy === 'function') {
    console.warn(
      '[queryPaginated] Query sem ORDER BY explícito. ' +
        'Aplicando ORDER BY (SELECT NULL) para habilitar OFFSET/FETCH. ' +
        'Resultado pode ser não-determinístico. ' +
        `Page: ${pagination.page}, PageSize: ${pagination.pageSize}`,
    );
    const ordered = (query as unknown as QueryWithOrderBy<T>).orderBy(
      sql`(SELECT NULL)`,
    );
    return ordered.offset(offsetValue).fetch(pagination.pageSize);
  }

  // Fallback final: query não tem nem offset nem orderBy (improvável)
  throw new Error(
    '[queryPaginated] Query inválida: não possui .orderBy() nem .offset(). ' +
      'MSSQL requer ORDER BY para usar OFFSET/FETCH. ' +
      `Page: ${pagination.page}, PageSize: ${pagination.pageSize}`,
  );
}

// =============================================================================
// INSERT HELPERS
// =============================================================================

/**
 * Aplica .returning() com type-safety em inserts Drizzle mssql
 *
 * @example
 * const [inserted] = await insertReturning(
 *   db.insert(users).values(data),
 *   { id: users.id }
 * );
 * const newId = inserted.id;
 */
export async function insertReturning<TReturn>(
  insertQuery: unknown,
  fields: TReturn,
): Promise<unknown[]> {
  return (insertQuery as unknown as InsertWithReturning<TReturn>).returning(
    fields,
  );
}

/**
 * Aplica .$returningId() com type-safety em inserts Drizzle MSSQL
 *
 * Específico para SQL Server - retorna o identity/id da linha inserida
 *
 * @example
 * const result = await insertWithReturningId(
 *   db.insert(users).values(userData)
 * );
 * const newId = result[0]?.id;
 */
export async function insertWithReturningId(
  insertQuery: unknown,
): Promise<{ id: number | string }[]> {
  return (insertQuery as InsertWithReturningId).$returningId();
}
