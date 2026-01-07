/**
 * Helper functions para lidar com resultados de db.execute()
 * 
 * db.execute() pode retornar:
 * - { recordset: T[] } - Formato Drizzle/mssql padrão
 * - T[] - Array direto em alguns casos
 * 
 * Estas funções normalizam o acesso aos dados.
 * 
 * @see PC-002 em .cursor/rules/regrasmcp.mdc
 */

/**
 * Tipo que representa os dois formatos possíveis de retorno de db.execute()
 */
export type DbExecuteResult<T> = { recordset?: T[] } | T[];

/**
 * Extrai array de rows do resultado de db.execute()
 * Funciona tanto para { recordset: T[] } quanto para T[]
 * 
 * @example
 * ```typescript
 * const result = await db.execute(sql`SELECT * FROM users`);
 * const users = getDbRows<User>(result);
 * ```
 */
export function getDbRows<T>(result: DbExecuteResult<T>): T[] {
  if (Array.isArray(result)) {
    return result;
  }
  return result.recordset || [];
}

/**
 * Extrai primeira row do resultado de db.execute()
 * Retorna undefined se não houver dados
 * 
 * @example
 * ```typescript
 * const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
 * const user = getFirstRow<User>(result);
 * if (!user) {
 *   return notFound();
 * }
 * ```
 */
export function getFirstRow<T>(result: DbExecuteResult<T>): T | undefined {
  return getDbRows(result)[0];
}

/**
 * Extrai primeira row ou lança erro se não existir
 * Útil quando o registro DEVE existir
 * 
 * @example
 * ```typescript
 * const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
 * const user = getFirstRowOrThrow<User>(result, 'User not found');
 * // Garantido que user não é undefined
 * ```
 */
export function getFirstRowOrThrow<T>(
  result: DbExecuteResult<T>, 
  errorMessage: string = 'Record not found'
): T {
  const row = getFirstRow(result);
  if (!row) {
    throw new Error(errorMessage);
  }
  return row;
}

