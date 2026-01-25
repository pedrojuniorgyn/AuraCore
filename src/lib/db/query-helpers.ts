/**
 * Helpers tipados para queries Drizzle ORM com dialect mssql
 * 
 * Problema: Drizzle ORM com SQL Server não exporta tipagem completa
 * para métodos como .limit(), .offset(), etc.
 * 
 * Solução: Funções helper que aplicam type-safety sem usar 'any'
 * 
 * @see LC-001 (Type Safety Contract v1.0.12)
 * @see https://orm.drizzle.team/docs/get-started-mssql
 */

/**
 * Interface para queries com método .limit() (PostgreSQL/MySQL)
 * @deprecated MSSQL usa .offset().fetch() ao invés de .limit().offset()
 */
interface QueryWithLimit<T> {
  limit(count: number): Promise<T[]>;
}

/**
 * Interface para queries com método .offset() (PostgreSQL/MySQL)
 * @deprecated MSSQL usa .offset().fetch() ao invés de .limit().offset()
 */
interface QueryWithOffset<T> {
  offset(count: number): T;
}

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
 * @see Diagnóstico empírico: scripts/debug-drizzle-pagination.ts
 */
interface QueryWithOffsetFetch<T> {
  offset(count: number): { fetch(count: number): Promise<T[]> };
}

/**
 * Interface para inserts com método .returning()
 */
interface InsertWithReturning<T> {
  returning<TReturn>(fields: TReturn): Promise<unknown[]>;
}

/**
 * @deprecated Use queryPaginated ou inline type assertion (BP-SQL-004, LC-303298)
 * 
 * **MOTIVO:** 
 * 1. Helper adiciona camada de indireção que dificulta debug
 * 2. MSSQL não tem .limit() nem .top() em runtime - apenas .offset().fetch()
 * 
 * **PATTERN CORRETO para MSSQL:**
 * ```typescript
 * // A query DEVE ter .orderBy() para usar paginação!
 * const results = await queryPaginated(
 *   db.select().from(table).orderBy(asc(table.id)),
 *   { page: 1, pageSize: limit }
 * );
 * ```
 * 
 * **Referência:** LC-303298, LC-884701, GAP-SQL-005, HOTFIX Sprint S3 v4  
 * **Data de deprecação:** 23/01/2026  
 * **Será removido em:** v2.0.0 (após migração de todos arquivos)
 * 
 * **ATENÇÃO:** Esta função requer que a query já tenha .orderBy() aplicado!
 * 
 * @example
 * // ❌ DEPRECATED - NÃO USAR
 * const users = await queryWithLimit(query, 1);
 * 
 * // ✅ CORRETO - usar queryFirst ou queryPaginated
 * const user = await queryFirst(db.select().from(users).orderBy(asc(users.id)));
 */
export async function queryWithLimit<T>(
  query: unknown,
  limitCount: number
): Promise<T[]> {
  // Validação: verificar se .offset() existe (indica que tem .orderBy())
  if (typeof (query as Record<string, unknown>)?.offset !== 'function') {
    // FALLBACK: Se não tem offset, executar query diretamente e fazer slice
    console.warn(
      '[queryWithLimit] AVISO: Query não tem .orderBy(). ' +
      'MSSQL requer ORDER BY para OFFSET/FETCH. ' +
      'Executando query completa e aplicando slice (menos eficiente).'
    );
    const results = await (query as Promise<T[]>);
    return (results as T[]).slice(0, limitCount);
  }
  
  // MSSQL usa .offset(0).fetch(n) ao invés de .limit(n)
  return (query as unknown as QueryWithOffsetFetch<T>).offset(0).fetch(limitCount);
}

/**
 * Aplica .offset(0).fetch(1) e retorna o primeiro resultado ou null
 * 
 * IMPORTANTE: No MSSQL:
 * - .limit() NÃO EXISTE em runtime
 * - .top() NÃO EXISTE em runtime (apesar de existir na tipagem!)
 * - A query DEVE ter .orderBy() antes de chamar queryFirst!
 * 
 * @see HOTFIX Sprint S3 v4 - 25/01/2026
 * @see https://orm.drizzle.team/docs/select#fetch--offset
 * @see Diagnóstico empírico: scripts/debug-drizzle-pagination.ts
 * 
 * @example
 * // ✅ CORRETO - query com orderBy
 * const user = await queryFirst(
 *   db.select().from(users).where(eq(users.id, id)).orderBy(asc(users.id))
 * );
 * 
 * // ❌ INCORRETO - query sem orderBy (MSSQL requer ORDER BY para OFFSET/FETCH)
 * const user = await queryFirst(
 *   db.select().from(users).where(eq(users.id, id))
 * );
 */
export async function queryFirst<T>(
  query: unknown
): Promise<T | null> {
  // Validação: verificar se .offset() existe (indica que tem .orderBy())
  if (typeof (query as Record<string, unknown>)?.offset !== 'function') {
    // FALLBACK: Se não tem offset, executar query diretamente e pegar primeiro
    // Isso é menos eficiente mas funciona para queries sem orderBy
    console.warn(
      '[queryFirst] AVISO: Query não tem .orderBy(). ' +
      'MSSQL requer ORDER BY para OFFSET/FETCH. ' +
      'Executando query completa e retornando primeiro resultado (menos eficiente).'
    );
    const results = await (query as Promise<T[]>);
    return (results as T[])[0] ?? null;
  }
  
  // MSSQL: .offset(0).fetch(1) é o equivalente a .limit(1)
  const results = await (query as unknown as QueryWithOffsetFetch<T>).offset(0).fetch(1);
  return results[0] ?? null;
}

/**
 * Interface para queries com método .limit() que retorna objeto com .offset() (PostgreSQL/MySQL)
 * @deprecated MSSQL usa .offset().fetch() ao invés de .limit().offset()
 */
interface QueryWithLimitOffset<T> {
  limit(count: number): { offset(count: number): Promise<T[]> };
}

/**
 * Aplica paginação para MSSQL usando .offset().fetch()
 * 
 * IMPORTANTE: No Drizzle ORM com SQL Server (MSSQL), a paginação usa
 * OFFSET...FETCH NEXT, NÃO LIMIT/OFFSET como PostgreSQL/MySQL.
 * 
 * A query DEVE ter .orderBy() ANTES de chamar queryPaginated!
 * A ordem é: db.select().from(table).where(...).orderBy(...) → queryPaginated
 * 
 * @see HOTFIX Sprint S3 v3 - 25/01/2026
 * @see https://orm.drizzle.team/docs/select#fetch--offset (documentação MSSQL)
 * 
 * @example
 * // ✅ CORRETO - query com orderBy
 * const users = await queryPaginated(
 *   db.select().from(users).orderBy(users.id),
 *   { page: 1, pageSize: 10 }
 * );
 * 
 * // ❌ INCORRETO - query sem orderBy (vai falhar!)
 * const users = await queryPaginated(
 *   db.select().from(users),
 *   { page: 1, pageSize: 10 }
 * );
 */
export async function queryPaginated<T>(
  query: unknown,
  pagination: { page: number; pageSize: number }
): Promise<T[]> {
  const offsetValue = (pagination.page - 1) * pagination.pageSize;
  
  // Validação: verificar se .offset() existe (indica que tem .orderBy())
  if (typeof (query as Record<string, unknown>)?.offset !== 'function') {
    // FALLBACK: Se não tem offset, executar query diretamente e fazer slice
    console.warn(
      '[queryPaginated] AVISO: Query não tem .orderBy(). ' +
      'MSSQL requer ORDER BY para OFFSET/FETCH. ' +
      'Executando query completa e aplicando slice (menos eficiente). ' +
      `Page: ${pagination.page}, PageSize: ${pagination.pageSize}`
    );
    const results = await (query as Promise<T[]>);
    return (results as T[]).slice(offsetValue, offsetValue + pagination.pageSize);
  }
  
  // MSSQL usa .offset().fetch() ao invés de .limit().offset()
  // @see https://orm.drizzle.team/docs/select#fetch--offset
  return (query as unknown as QueryWithOffsetFetch<T>).offset(offsetValue).fetch(pagination.pageSize);
}

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
  fields: TReturn
): Promise<unknown[]> {
  return (insertQuery as unknown as InsertWithReturning<TReturn>).returning(fields);
}

/**
 * Interface para inserts MSSQL com método .$returningId()
 * Específico do SQL Server, retorna o ID inserido
 */
interface InsertWithReturningId {
  $returningId(): Promise<{ id: number | string }[]>;
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
  insertQuery: unknown
): Promise<{ id: number | string }[]> {
  return (insertQuery as InsertWithReturningId).$returningId();
}

