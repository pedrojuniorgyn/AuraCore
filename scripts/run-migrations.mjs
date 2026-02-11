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
// Main
// ---------------------------------------------------------------------------

async function runMigrations() {
  console.log('=== AuraCore SQL Migrations ===');
  console.log(`Target: ${dbHost}:${dbPort}/${process.env.DB_NAME}`);
  console.log('');

  const pool = new sql.ConnectionPool(connectionConfig);

  try {
    await pool.connect();
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
    let errorCount = 0;

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

          // Idempotent: skip "already exists" errors
          if (
            msg.includes('already exists') ||
            msg.includes('There is already an object') ||
            msg.includes('Column names in each table must be unique') ||
            msg.includes('already has a column')
          ) {
            skipCount++;
            // Silent skip for idempotent operations
          } else {
            errorCount++;
            console.error(`  ERROR [${i + 1}/${statements.length}]: ${preview}`);
            console.error(`         ${msg}`);
          }
        }
      }
    }

    console.log('');
    console.log('=== Migration Summary ===');
    console.log(`  Executed: ${successCount}`);
    console.log(`  Skipped (idempotent): ${skipCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('');

    if (errorCount > 0) {
      console.error('Some migrations had errors. Check logs above.');
      process.exit(1);
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Fatal error running migrations:', err);
    process.exit(1);
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
