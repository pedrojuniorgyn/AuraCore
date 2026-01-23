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
 * Interface para queries com método .limit()
 */
interface QueryWithLimit<T> {
  limit(count: number): Promise<T[]>;
}

/**
 * Interface para queries com método .offset()
 */
interface QueryWithOffset<T> {
  offset(count: number): T;
}

/**
 * Interface para inserts com método .returning()
 */
interface InsertWithReturning<T> {
  returning<TReturn>(fields: TReturn): Promise<unknown[]>;
}

/**
 * @deprecated Use inline type assertion instead (BP-SQL-004, LC-303298)
 * 
 * **MOTIVO:** Helper adiciona camada de indireção que dificulta debug e pode falhar em runtime
 * 
 * **PATTERN CORRETO:**
 * ```typescript
 * type Row = typeof table.$inferSelect;
 * type QueryWithLimit = { limit(n: number): Promise<Row[]> };
 * const results = await (query as unknown as QueryWithLimit).limit(limit);
 * ```
 * 
 * **Referência:** LC-303298, GAP-SQL-005  
 * **Data de deprecação:** 23/01/2026  
 * **Será removido em:** v2.0.0 (após migração de todos arquivos)
 * 
 * @example
 * // ❌ DEPRECATED - NÃO USAR
 * const users = await queryWithLimit(
 *   db.select().from(users).where(eq(users.id, id)),
 *   1
 * );
 * 
 * // ✅ CORRETO - USAR ESTE
 * const baseQuery = db.select().from(users).where(eq(users.id, id));
 * type UserRow = typeof users.$inferSelect;
 * type QueryWithLimit = { limit(n: number): Promise<UserRow[]> };
 * const users = await (baseQuery as unknown as QueryWithLimit).limit(1);
 */
export async function queryWithLimit<T>(
  query: unknown,
  limitCount: number
): Promise<T[]> {
  console.warn(
    'DEPRECATED: queryWithLimit is deprecated. Use inline type assertion instead. See BP-SQL-004 and LC-303298'
  );
  return (query as unknown as QueryWithLimit<T>).limit(limitCount);
}

/**
 * Aplica .limit(1) e retorna o primeiro resultado ou null
 * 
 * @example
 * const user = await queryFirst(
 *   db.select().from(users).where(eq(users.id, id))
 * );
 */
export async function queryFirst<T>(
  query: unknown
): Promise<T | null> {
  const results = await (query as unknown as QueryWithLimit<T>).limit(1);
  return results[0] ?? null;
}

/**
 * Aplica .limit() e .offset() para paginação
 * 
 * @example
 * const users = await queryPaginated(
 *   db.select().from(users),
 *   { page: 1, pageSize: 10 }
 * );
 */
export async function queryPaginated<T>(
  query: unknown,
  pagination: { page: number; pageSize: number }
): Promise<T[]> {
  const offset = (pagination.page - 1) * pagination.pageSize;
  const withOffset = (query as unknown as QueryWithOffset<unknown>).offset(offset);
  return (withOffset as unknown as QueryWithLimit<T>).limit(pagination.pageSize);
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

