import { drizzle } from "drizzle-orm/node-mssql";
import sql from "mssql";
import * as schema from "./schema";
import { isIP } from "node:net";

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT ?? "1433");
const dbEncrypt = (process.env.DB_ENCRYPT ?? "false") === "true";
const dbTrustServerCertificate = (process.env.DB_TRUST_CERT ?? "true") === "true";
const dbServerName = process.env.DB_SERVERNAME; // hostname do certificado/SNI (obrigatório se DB_HOST for IP + encrypt=true)

// Tedious (via mssql) não permite SNI usando IP quando encrypt=true.
if (dbEncrypt && isIP(dbHost) && !dbServerName) {
  throw new Error(
    `Config inválida: DB_ENCRYPT=true com DB_HOST em IP (${dbHost}). ` +
      `Defina DB_SERVERNAME=<hostname do certificado/SNI> ou desligue TLS com DB_ENCRYPT=false.`
  );
}

// 1. Configuração Robusta do Banco
const connectionConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: dbHost,
  port: dbPort,
  database: process.env.DB_NAME,
  options: {
    encrypt: dbEncrypt,
    trustServerCertificate: dbTrustServerCertificate,
    enableArithAbort: true,
    ...(dbServerName ? { serverName: dbServerName } : {}),
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// 2. Singleton Global para evitar múltiplas conexões no Hot Reload
const globalForDb = globalThis as unknown as {
  conn: sql.ConnectionPool | undefined;
  schemaEnsured: boolean | undefined;
};

let conn: sql.ConnectionPool;

if (!globalForDb.conn) {
  // Cria o pool apenas uma vez
  globalForDb.conn = new sql.ConnectionPool(connectionConfig);
}
conn = globalForDb.conn;

// 4. Exports de Compatibilidade (Para não quebrar seus Cron Jobs antigos)
export const pool = conn;
export const ensureConnection = async () => {
    if (!conn.connected) await conn.connect();
    // Migrações idempotentes mínimas (evita quebrar selects quando adicionamos colunas novas no schema do Drizzle)
    if (!globalForDb.schemaEnsured) {
      // Branches: integração com legado (Audit ETL)
      await conn.request().query(`
        IF OBJECT_ID('dbo.branches','U') IS NOT NULL
          AND COL_LENGTH('dbo.branches', 'legacy_company_branch_code') IS NULL
        BEGIN
          ALTER TABLE dbo.branches ADD legacy_company_branch_code int NULL;
        END
      `);
      globalForDb.schemaEnsured = true;
    }
    return conn;
};

// Compat: alguns pontos do app esperam getDb()
export const getDb = async () => {
  await ensureConnection();
  return db;
};

// 5. Instância do Drizzle
export const db = drizzle({ client: conn, schema });
