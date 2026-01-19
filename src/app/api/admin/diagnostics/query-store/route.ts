/**
 * API: GET /api/admin/diagnostics/query-store
 * Query Store Baseline - Análise de performance de queries SQL Server
 * 
 * @module app/api/admin/diagnostics/query-store
 * @see E8.1 - Query Store Baseline
 * @see https://learn.microsoft.com/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { withPermission } from '@/lib/auth/api-guard';

export const runtime = 'nodejs';

// Interfaces para tipagem dos resultados
interface QueryStoreStatus {
  databaseName: string;
  isQueryStoreOn: boolean;
  currentStateDesc: string;
  actualStateDesc: string;
  desiredStateDesc: string;
  currentStorageSizeMb: number;
  maxStorageSizeMb: number;
  flushIntervalSeconds: number;
  staleQueryThresholdDays: number;
}

interface TopQuery {
  queryId: number;
  queryTextPreview: string;
  avgDurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
  stdDevDurationMs: number;
  countExecutions: number;
  avgCpuMs: number;
  avgLogicalIoReads: number;
  avgPhysicalIoReads: number;
  lastExecutionTime: Date;
  planCount: number;
}

interface PlanRegression {
  queryId: number;
  queryTextPreview: string;
  planCount: number;
  avgDurationRange: string;
  lastExecutionTime: Date;
}

interface MissingIndex {
  tableName: string;
  improvementMeasure: number;
  equalityColumns: string | null;
  inequalityColumns: string | null;
  includedColumns: string | null;
  userSeeks: number;
  userScans: number;
}

function isInternalTokenOk(req: NextRequest): boolean {
  const diagToken = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerDiagToken =
    req.headers.get('x-internal-token') ||
    req.headers.get('x-diagnostics-token');
  if (diagToken && headerDiagToken && headerDiagToken === diagToken) return true;
  return false;
}

/**
 * GET /api/admin/diagnostics/query-store
 * 
 * Retorna análise de performance baseada no Query Store do SQL Server:
 * - Status do Query Store
 * - Top queries por duração (p95/p99)
 * - Queries com regressão de plano
 * - Índices ausentes (missing indexes)
 *
 * Query params:
 * - limit (default 20) - Limite de queries retornadas
 * - orderBy (default 'avg_duration') - Campo para ordenação
 * - includeStatus (default true) - Incluir status do Query Store
 * - includeMissingIndexes (default true) - Incluir missing indexes
 * 
 * @example Response
 * {
 *   "success": true,
 *   "timestamp": "2026-01-19T10:30:00.000Z",
 *   "queryStoreStatus": { ... },
 *   "topQueries": [...],
 *   "planRegressions": [...],
 *   "missingIndexes": [...]
 * }
 */
export async function GET(req: NextRequest) {
  const handler = async () => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit') ?? '20')), 100);
    const orderBy = searchParams.get('orderBy') ?? 'avg_duration';
    const includeStatus = searchParams.get('includeStatus') !== 'false';
    const includeMissingIndexes = searchParams.get('includeMissingIndexes') !== 'false';

    // Validar orderBy (whitelist de segurança)
    const validOrderByFields = ['avg_duration', 'max_duration', 'count_executions', 'avg_cpu_time', 'avg_logical_io_reads'];
    const safeOrderBy = validOrderByFields.includes(orderBy) ? orderBy : 'avg_duration';

    try {
      const result: {
        success: boolean;
        timestamp: string;
        queryStoreStatus: QueryStoreStatus | null;
        topQueries: TopQuery[];
        planRegressions: PlanRegression[];
        missingIndexes: MissingIndex[];
        errors: string[];
      } = {
        success: true,
        timestamp: new Date().toISOString(),
        queryStoreStatus: null,
        topQueries: [],
        planRegressions: [],
        missingIndexes: [],
        errors: [],
      };

      // 1. Query Store Status
      if (includeStatus) {
        try {
          const statusResult = await db.execute(sql`
            SELECT 
              DB_NAME() AS database_name,
              CASE WHEN is_query_store_on = 1 THEN 1 ELSE 0 END AS is_query_store_on,
              ISNULL(actual_state_desc, 'UNKNOWN') AS current_state_desc,
              ISNULL(actual_state_desc, 'UNKNOWN') AS actual_state_desc,
              ISNULL(desired_state_desc, 'UNKNOWN') AS desired_state_desc,
              ISNULL(current_storage_size_mb, 0) AS current_storage_size_mb,
              ISNULL(max_storage_size_mb, 0) AS max_storage_size_mb,
              ISNULL(flush_interval_seconds, 0) AS flush_interval_seconds,
              ISNULL(stale_query_threshold_days, 0) AS stale_query_threshold_days
            FROM sys.database_query_store_options
          `);

          const statusData = (statusResult.recordset || statusResult) as Array<Record<string, unknown>>;
          if (statusData.length > 0) {
            const row = statusData[0];
            result.queryStoreStatus = {
              databaseName: String(row.database_name ?? ''),
              isQueryStoreOn: Boolean(row.is_query_store_on),
              currentStateDesc: String(row.current_state_desc ?? 'UNKNOWN'),
              actualStateDesc: String(row.actual_state_desc ?? 'UNKNOWN'),
              desiredStateDesc: String(row.desired_state_desc ?? 'UNKNOWN'),
              currentStorageSizeMb: Number(row.current_storage_size_mb ?? 0),
              maxStorageSizeMb: Number(row.max_storage_size_mb ?? 0),
              flushIntervalSeconds: Number(row.flush_interval_seconds ?? 0),
              staleQueryThresholdDays: Number(row.stale_query_threshold_days ?? 0),
            };
          }
        } catch (statusError: unknown) {
          const message = statusError instanceof Error ? statusError.message : String(statusError);
          result.errors.push(`Query Store Status: ${message}`);
        }
      }

      // 2. Top Queries por duração
      // Só executa se Query Store está habilitado
      if (result.queryStoreStatus?.isQueryStoreOn !== false) {
        try {
          const topQueriesResult = await db.execute(sql`
            SELECT TOP (${limit})
              q.query_id AS query_id,
              LEFT(qt.query_sql_text, 500) AS query_text_preview,
              CAST(rs.avg_duration / 1000.0 AS DECIMAL(18,2)) AS avg_duration_ms,
              CAST(rs.max_duration / 1000.0 AS DECIMAL(18,2)) AS max_duration_ms,
              CAST(rs.min_duration / 1000.0 AS DECIMAL(18,2)) AS min_duration_ms,
              CAST(rs.stdev_duration / 1000.0 AS DECIMAL(18,2)) AS stddev_duration_ms,
              rs.count_executions AS count_executions,
              CAST(rs.avg_cpu_time / 1000.0 AS DECIMAL(18,2)) AS avg_cpu_ms,
              rs.avg_logical_io_reads AS avg_logical_io_reads,
              rs.avg_physical_io_reads AS avg_physical_io_reads,
              rs.last_execution_time AS last_execution_time,
              (SELECT COUNT(DISTINCT p2.plan_id) FROM sys.query_store_plan p2 WHERE p2.query_id = q.query_id) AS plan_count
            FROM sys.query_store_query q
            JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
            JOIN sys.query_store_plan p ON q.query_id = p.query_id
            JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
            ORDER BY ${sql.raw(`rs.${safeOrderBy}`)} DESC
          `);

          const topData = (topQueriesResult.recordset || topQueriesResult) as Array<Record<string, unknown>>;
          result.topQueries = topData.map(row => ({
            queryId: Number(row.query_id),
            queryTextPreview: String(row.query_text_preview ?? ''),
            avgDurationMs: Number(row.avg_duration_ms ?? 0),
            maxDurationMs: Number(row.max_duration_ms ?? 0),
            minDurationMs: Number(row.min_duration_ms ?? 0),
            stdDevDurationMs: Number(row.stddev_duration_ms ?? 0),
            countExecutions: Number(row.count_executions ?? 0),
            avgCpuMs: Number(row.avg_cpu_ms ?? 0),
            avgLogicalIoReads: Number(row.avg_logical_io_reads ?? 0),
            avgPhysicalIoReads: Number(row.avg_physical_io_reads ?? 0),
            lastExecutionTime: row.last_execution_time as Date,
            planCount: Number(row.plan_count ?? 1),
          }));
        } catch (topError: unknown) {
          const message = topError instanceof Error ? topError.message : String(topError);
          // Query Store pode não estar habilitado
          if (message.includes('query_store')) {
            result.errors.push('Query Store não está habilitado. Execute: ALTER DATABASE [nome] SET QUERY_STORE = ON');
          } else {
            result.errors.push(`Top Queries: ${message}`);
          }
        }

        // 3. Queries com regressão de plano (múltiplos planos)
        try {
          const regressionsResult = await db.execute(sql`
            SELECT TOP (${limit})
              q.query_id AS query_id,
              LEFT(qt.query_sql_text, 500) AS query_text_preview,
              COUNT(DISTINCT p.plan_id) AS plan_count,
              CONCAT(
                CAST(MIN(rs.avg_duration) / 1000.0 AS DECIMAL(18,2)), 'ms - ',
                CAST(MAX(rs.avg_duration) / 1000.0 AS DECIMAL(18,2)), 'ms'
              ) AS avg_duration_range,
              MAX(rs.last_execution_time) AS last_execution_time
            FROM sys.query_store_query q
            JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
            JOIN sys.query_store_plan p ON q.query_id = p.query_id
            JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
            GROUP BY q.query_id, qt.query_sql_text
            HAVING COUNT(DISTINCT p.plan_id) > 1
            ORDER BY plan_count DESC
          `);

          const regressionsData = (regressionsResult.recordset || regressionsResult) as Array<Record<string, unknown>>;
          result.planRegressions = regressionsData.map(row => ({
            queryId: Number(row.query_id),
            queryTextPreview: String(row.query_text_preview ?? ''),
            planCount: Number(row.plan_count ?? 0),
            avgDurationRange: String(row.avg_duration_range ?? ''),
            lastExecutionTime: row.last_execution_time as Date,
          }));
        } catch (regError: unknown) {
          const message = regError instanceof Error ? regError.message : String(regError);
          result.errors.push(`Plan Regressions: ${message}`);
        }
      }

      // 4. Missing Indexes (não depende do Query Store)
      if (includeMissingIndexes) {
        try {
          const missingResult = await db.execute(sql`
            SELECT TOP (${limit})
              mid.statement AS table_name,
              CAST(migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans) AS DECIMAL(18,2)) AS improvement_measure,
              mid.equality_columns AS equality_columns,
              mid.inequality_columns AS inequality_columns,
              mid.included_columns AS included_columns,
              migs.user_seeks AS user_seeks,
              migs.user_scans AS user_scans
            FROM sys.dm_db_missing_index_groups mig
            JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
            JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
            WHERE mid.database_id = DB_ID()
            ORDER BY improvement_measure DESC
          `);

          const missingData = (missingResult.recordset || missingResult) as Array<Record<string, unknown>>;
          result.missingIndexes = missingData.map(row => ({
            tableName: String(row.table_name ?? ''),
            improvementMeasure: Number(row.improvement_measure ?? 0),
            equalityColumns: row.equality_columns ? String(row.equality_columns) : null,
            inequalityColumns: row.inequality_columns ? String(row.inequality_columns) : null,
            includedColumns: row.included_columns ? String(row.included_columns) : null,
            userSeeks: Number(row.user_seeks ?? 0),
            userScans: Number(row.user_scans ?? 0),
          }));
        } catch (missingError: unknown) {
          const message = missingError instanceof Error ? missingError.message : String(missingError);
          result.errors.push(`Missing Indexes: ${message}`);
        }
      }

      return NextResponse.json(result);
    } catch (error: unknown) {
      console.error('[Query Store Diagnostics] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch Query Store diagnostics',
          details: message,
        },
        { status: 500 }
      );
    }
  };

  // Permitir acesso com token interno ou permissão admin
  if (isInternalTokenOk(req)) return handler();
  return withPermission(req, 'admin.users.manage', handler);
}

/**
 * POST /api/admin/diagnostics/query-store
 * 
 * Habilitar Query Store no banco de dados
 * 
 * Body:
 * - action: 'enable' | 'disable'
 * - maxStorageSizeMb (optional): Tamanho máximo em MB (default 1000)
 * - staleQueryThresholdDays (optional): Dias para manter queries (default 30)
 */
export async function POST(req: NextRequest) {
  const handler = async () => {
    try {
      const body = await req.json();
      const action = body.action as string;
      
      if (!['enable', 'disable'].includes(action)) {
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use "enable" or "disable"' },
          { status: 400 }
        );
      }

      if (action === 'enable') {
        const maxStorageSizeMb = Math.min(Math.max(100, Number(body.maxStorageSizeMb ?? 1000)), 10000);
        const staleQueryThresholdDays = Math.min(Math.max(1, Number(body.staleQueryThresholdDays ?? 30)), 365);
        const flushIntervalSeconds = 900; // 15 minutos
        const intervalLengthMinutes = 60; // 1 hora

        // SQL Server requer comandos separados para ALTER DATABASE
        await db.execute(sql.raw(`
          ALTER DATABASE CURRENT SET QUERY_STORE = ON
        `));

        await db.execute(sql.raw(`
          ALTER DATABASE CURRENT SET QUERY_STORE (
            OPERATION_MODE = READ_WRITE,
            CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = ${staleQueryThresholdDays}),
            DATA_FLUSH_INTERVAL_SECONDS = ${flushIntervalSeconds},
            MAX_STORAGE_SIZE_MB = ${maxStorageSizeMb},
            INTERVAL_LENGTH_MINUTES = ${intervalLengthMinutes},
            SIZE_BASED_CLEANUP_MODE = AUTO
          )
        `));

        return NextResponse.json({
          success: true,
          message: 'Query Store habilitado com sucesso',
          config: {
            maxStorageSizeMb,
            staleQueryThresholdDays,
            flushIntervalSeconds,
            intervalLengthMinutes,
          },
        });
      } else {
        await db.execute(sql.raw(`
          ALTER DATABASE CURRENT SET QUERY_STORE = OFF
        `));

        return NextResponse.json({
          success: true,
          message: 'Query Store desabilitado com sucesso',
        });
      }
    } catch (error: unknown) {
      console.error('[Query Store Enable/Disable] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to modify Query Store',
          details: message,
        },
        { status: 500 }
      );
    }
  };

  // Apenas admin pode habilitar/desabilitar Query Store
  if (isInternalTokenOk(req)) return handler();
  return withPermission(req, 'admin.users.manage', handler);
}
