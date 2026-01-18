/**
 * Query Logger para desenvolvimento
 * 
 * Logs de queries SQL em ambiente de desenvolvimento.
 * Integra com Drizzle ORM e mede duração de queries.
 * 
 * @module lib/observability/query-logger
 * @see E8.1 - Performance & Observability
 */

import { log } from './logger';

/**
 * Threshold para considerar uma query como "lenta" (ms)
 */
const SLOW_QUERY_THRESHOLD_MS = 500;

/**
 * Interface para métricas de query
 */
export interface QueryMetric {
  query: string;
  params: unknown[];
  duration: number;
  timestamp: Date;
  isSlow: boolean;
}

/**
 * Buffer circular para armazenar últimas queries (apenas em memória)
 */
class QueryMetricsBuffer {
  private buffer: QueryMetric[] = [];
  private readonly maxSize = 100;

  add(metric: QueryMetric): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(metric);
  }

  getSlowQueries(thresholdMs = SLOW_QUERY_THRESHOLD_MS): QueryMetric[] {
    return this.buffer.filter(m => m.duration >= thresholdMs);
  }

  getRecent(count = 10): QueryMetric[] {
    return this.buffer.slice(-count);
  }

  getStats(): { total: number; slow: number; avgDuration: number } {
    const total = this.buffer.length;
    const slow = this.buffer.filter(m => m.isSlow).length;
    const avgDuration = total > 0 
      ? this.buffer.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;

    return { total, slow, avgDuration: Math.round(avgDuration) };
  }

  clear(): void {
    this.buffer = [];
  }
}

/**
 * Singleton do buffer de métricas
 */
export const queryMetricsBuffer = new QueryMetricsBuffer();

/**
 * Logger de queries para Drizzle ORM
 * 
 * @example
 * ```typescript
 * import { queryLogger } from '@/lib/observability/query-logger';
 * 
 * // No drizzle config
 * export const db = drizzle({ client: conn, schema, logger: queryLogger });
 * ```
 */
export const queryLogger = {
  /**
   * Log de query executada (chamado pelo Drizzle)
   */
  logQuery(query: string, params: unknown[]): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Drizzle não fornece timing direto, usamos timestamp para correlação
    const timestamp = new Date();
    
    // Trunca query para log (evita queries enormes no console)
    const truncatedQuery = query.length > 500 
      ? query.substring(0, 500) + '...' 
      : query;

    console.log(`[SQL] ${truncatedQuery}`);
    
    if (params.length > 0) {
      console.log(`[PARAMS] ${JSON.stringify(params).substring(0, 200)}`);
    }
  },
};

/**
 * Wrapper para medir duração de queries manualmente
 * 
 * @example
 * ```typescript
 * const result = await measureQuery('findUserById', async () => {
 *   return db.select().from(users).where(eq(users.id, id));
 * });
 * ```
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await queryFn();
    const duration = Math.round(performance.now() - start);
    const isSlow = duration >= SLOW_QUERY_THRESHOLD_MS;

    const metric: QueryMetric = {
      query: queryName,
      params: [],
      duration,
      timestamp: new Date(),
      isSlow,
    };

    queryMetricsBuffer.add(metric);

    if (isSlow) {
      log('warn', `Slow query detected: ${queryName}`, {
        duration,
        threshold: SLOW_QUERY_THRESHOLD_MS,
      });
    } else if (process.env.NODE_ENV === 'development') {
      log('debug', `Query executed: ${queryName}`, { duration });
    }

    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    
    log('error', `Query failed: ${queryName}`, {
      duration,
      error,
    });

    throw error;
  }
}

/**
 * Decorator para medir queries em métodos de repositório
 * 
 * @example
 * ```typescript
 * class UserRepository {
 *   @MeasureQuery('findById')
 *   async findById(id: string): Promise<User | null> {
 *     // ...
 *   }
 * }
 * ```
 */
export function MeasureQuery(queryName: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const fullName = `${(target as { constructor: { name: string } }).constructor.name}.${propertyKey}`;
      return measureQuery(queryName || fullName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
