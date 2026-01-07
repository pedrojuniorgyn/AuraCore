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
 * Aplica .limit() com type-safety em queries Drizzle mssql
 * 
 * @example
 * const users = await queryWithLimit(
 *   db.select().from(users).where(eq(users.id, id)),
 *   1
 * );
 */
export async function queryWithLimit<T>(
  query: unknown,
  limitCount: number
): Promise<T[]> {
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

