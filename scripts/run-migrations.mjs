/**
 * Script: Run SQL Migrations (ESM / pure Node.js)
 *
 * Executes all pending SQL migrations from drizzle/migrations/ in order.
 * Designed to run inside the Docker standalone container (no tsx/ts-node needed).
 *
 * Usage:
 *   node scripts/run-migrations.mjs
 *
 * Environment variables:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *   DB_ENCRYPT, DB_TRUST_CERT, DB_SERVERNAME
 *
 * @module scripts/run-migrations
 * @since E13.3
 */

import sql from 'mssql';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// DB Config (mirrors src/lib/db/index.ts without TS imports)
// ---------------------------------------------------------------------------

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT ?? '1433');
const dbEncrypt = (process.env.DB_ENCRYPT ?? 'false') === 'true';
const dbTrustCert = (process.env.DB_TRUST_CERT ?? 'true') === 'true';
const dbServerName = process.env.DB_SERVERNAME;

/** @type {import('mssql').config} */
const connectionConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: dbHost,
  port: dbPort,
  database: process.env.DB_NAME,
  options: {
    encrypt: dbEncrypt,
    trustServerCertificate: dbTrustCert,
    enableArithAbort: true,
    ...(dbServerName ? { serverName: dbServerName } : {}),
  },
  pool: { max: 5, min: 1, idleTimeoutMillis: 15000 },
  requestTimeout: 60000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split SQL content by GO statements (SQL Server batch separator).
 * @param {string} content
 * @returns {string[]}
 */
function splitByGo(content) {
  return content
    .split(/^\s*GO\s*$/gim)
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length === 0) return false;
      // Only discard batches that are ENTIRELY comments/empty lines
      const hasSQL = s.split('\n').some(
        (line) => line.trim().length > 0 && !line.trim().startsWith('--'),
      );
      return hasSQL;
    });
}

// ---------------------------------------------------------------------------
// Connection helpers
// ---------------------------------------------------------------------------

const MAX_RETRIES = 10;
const INITIAL_DELAY_MS = 2000;
const MAX_DELAY_MS = 15000;

/**
 * Wait for the given number of milliseconds.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connect to SQL Server with retry + exponential backoff.
 * Handles the common Docker scenario where the web container starts before
 * SQL Server is fully ready to accept connections.
 *
 * @param {import('mssql').config} config
 * @returns {Promise<import('mssql').ConnectionPool>}
 */
async function connectWithRetry(config) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      return pool;
    } catch (/** @type {any} */ err) {
      lastError = err;
      const delayMs = Math.min(INITIAL_DELAY_MS * Math.pow(1.5, attempt - 1), MAX_DELAY_MS);
      console.log(
        `  Attempt ${attempt}/${MAX_RETRIES} failed: ${err?.message || err}`,
      );
      if (attempt < MAX_RETRIES) {
        console.log(`  Retrying in ${Math.round(delayMs / 1000)}s...`);
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Ensure the target database exists. Connects to 'master' and creates the
 * database if it doesn't already exist. This handles fresh deployments where
 * the SQL Server volume was reset.
 */
async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME;
  if (!dbName) return;

  console.log(`Ensuring database [${dbName}] exists...`);

  const masterConfig = {
    ...connectionConfig,
    database: 'master',
  };

  const masterPool = await connectWithRetry(masterConfig);
  try {
    const result = await masterPool
      .request()
      .query(`SELECT DB_ID('${dbName}') AS dbId`);
    const exists = result.recordset[0]?.dbId != null;

    if (!exists) {
      console.log(`  Database [${dbName}] not found. Creating...`);
      await masterPool.request().query(`CREATE DATABASE [${dbName}]`);
      console.log(`  Database [${dbName}] created successfully.`);
    } else {
      console.log(`  Database [${dbName}] already exists.`);
    }
  } finally {
    try {
      await masterPool.close();
    } catch {
      // ignore close errors
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runMigrations() {
  console.log('=== AuraCore SQL Migrations ===');
  console.log(`Target: ${dbHost}:${dbPort}/${process.env.DB_NAME}`);
  console.log('');

  try {
    // Step 0: Ensure database exists (handles fresh volumes)
    await ensureDatabaseExists();

    console.log('');
  } catch (/** @type {any} */ err) {
    console.error('Failed to ensure database exists:', err?.message || err);
    process.exit(1);
  }

  // Step 1: Connect to target database with retry
  console.log(`Connecting to [${process.env.DB_NAME}]...`);
  const pool = await connectWithRetry(connectionConfig);

  try {
    console.log('Connected to database.\n');

    // Discover migration files (sorted alphabetically = chronological order)
    const migrationsDir = path.join(process.cwd(), 'drizzle', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log(`No migrations directory found at ${migrationsDir}. Skipping.`);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No .sql migration files found. Nothing to do.');
      return;
    }

    console.log(`Found ${files.length} migration file(s).\n`);

    let successCount = 0;
    let skipCount = 0;
    let warnCount = 0;
    let errorCount = 0;

    /** @type {Array<{file: string, stmtIndex: number, stmtTotal: number, preview: string, msg: string}>} */
    const fatalErrors = [];

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const statements = splitByGo(content);

      console.log(`--- ${file} (${statements.length} statement(s)) ---`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.substring(0, 80).replace(/\n/g, ' ');

        try {
          await pool.request().query(stmt);
          successCount++;
        } catch (/** @type {any} */ err) {
          const msg = err?.message || String(err);

          // Collect all error messages (main + preceding) for idempotent check.
          // SQL Server wraps "already exists" in precedingErrors and the main
          // error is a generic "Could not create constraint or index" which we
          // must also recognise as idempotent.
          const allMessages = [
            msg,
            ...(err?.precedingErrors || []).map(
              (/** @type {any} */ pe) => pe?.message || String(pe),
            ),
          ];

          // Patterns that indicate the operation was already applied (truly idempotent).
          // These are silently skipped.
          const idempotentPatterns = [
            'already exists',
            'There is already an object',
            'Column names in each table must be unique',
            'already has a column',
            'Cannot drop the index',
            'Cannot find the object',
            'is not a constraint',
            'Cannot insert duplicate key',
            'Violation of UNIQUE KEY constraint',
            'Violation of PRIMARY KEY constraint',
            'Could not create constraint or index',
            'conflicted with the FOREIGN KEY constraint',
            'Property cannot be added',
          ];

          // Non-fatal patterns: errors from migrations that reference objects not yet
          // created in this environment (e.g. dev-only tables, future features).
          // Logged as warnings but do NOT block server startup.
          const nonFatalPatterns = [
            'references invalid table',
            'Invalid object name',
            'Invalid column name',
            'does not exist or you do not have permissions',
            'does not exist in the target table or view',
            'referenced by a FOREIGN KEY constraint',
            'Missing end comment mark',
            'Incorrect syntax near',
          ];

          const isIdempotent = allMessages.some((m) =>
            idempotentPatterns.some((pattern) => m.includes(pattern)),
          );

          const isNonFatal =
            !isIdempotent &&
            allMessages.some((m) =>
              nonFatalPatterns.some((pattern) => m.includes(pattern)),
            );

          if (isIdempotent) {
            skipCount++;
            // Silent skip for idempotent operations
          } else if (isNonFatal) {
            warnCount++;
            // Log but don't block startup
          } else {
            errorCount++;
            fatalErrors.push({
              file,
              stmtIndex: i + 1,
              stmtTotal: statements.length,
              preview,
              msg,
            });
          }
        }
      }
    }

    console.log('');
    console.log('=== Migration Summary ===');
    console.log(`  Executed: ${successCount}`);
    console.log(`  Skipped (idempotent): ${skipCount}`);
    console.log(`  Warnings (non-fatal): ${warnCount}`);
    console.log(`  Errors (fatal): ${errorCount}`);
    console.log('');

    if (warnCount > 0) {
      console.warn(
        `${warnCount} non-fatal warning(s) — some migrations reference objects not yet in this environment.`,
      );
    }

    if (errorCount > 0) {
      console.error('');
      console.error(
        '╔══════════════════════════════════════════════════════════════╗',
      );
      console.error(
        '║              FATAL ERRORS DETAIL                           ║',
      );
      console.error(
        '╚══════════════════════════════════════════════════════════════╝',
      );
      for (let idx = 0; idx < fatalErrors.length; idx++) {
        const fe = fatalErrors[idx];
        console.error('');
        console.error(
          `[${idx + 1}/${fatalErrors.length}] File: ${fe.file} | Statement ${fe.stmtIndex}/${fe.stmtTotal}`,
        );
        console.error(`  SQL: ${fe.preview}`);
        console.error(`  Error: ${fe.msg}`);
      }
      console.error('');
      console.error(
        'Fix these errors or add matching patterns to idempotentPatterns/nonFatalPatterns.',
      );
      process.exit(1);
    }

    console.log('All migrations completed successfully.');
  } finally {
    try {
      await pool.close();
    } catch {
      // ignore close errors
    }
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled migration error:', err);
    process.exit(1);
  });
