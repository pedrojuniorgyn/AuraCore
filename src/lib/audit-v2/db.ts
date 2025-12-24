import sql from "mssql";
import { requireAuditModuleEnv, type AuditDbConnEnv, getAuditModuleEnv } from "./env";

/**
 * Auditoria interna v2 — pools MSSQL (GlobalTCL RO + AuditFinDB RW)
 *
 * Importante:
 * - Mantém singletons em globalThis para evitar múltiplos pools em hot-reload.
 * - Não conecta no import; conecta sob demanda.
 * - Se módulo não estiver habilitado/configurado, as funções lançam erro (para rotas responderem 503).
 */

function toMssqlConfig(conn: AuditDbConnEnv): sql.config {
  return {
    user: conn.user,
    password: conn.password,
    server: conn.server,
    port: conn.port,
    database: conn.database,
    options: {
      encrypt: conn.encrypt,
      trustServerCertificate: conn.trustServerCertificate,
      enableArithAbort: true,
      ...(conn.serverName ? { serverName: conn.serverName } : {}),
    },
    pool: {
      // Auditoria é workload paralelo ao ERP — manter pools menores por padrão.
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

const globalForAuditPools = globalThis as unknown as {
  auditLegacyPool?: sql.ConnectionPool;
  auditStorePool?: sql.ConnectionPool;
};

async function ensureConnected(pool: sql.ConnectionPool): Promise<sql.ConnectionPool> {
  if (!pool.connected) {
    await pool.connect();
  }
  return pool;
}

export function isAuditConfigured(): boolean {
  return getAuditModuleEnv().enabled === true;
}

export async function getAuditLegacyPool(): Promise<sql.ConnectionPool> {
  const { legacy } = requireAuditModuleEnv();

  if (!globalForAuditPools.auditLegacyPool) {
    globalForAuditPools.auditLegacyPool = new sql.ConnectionPool(toMssqlConfig(legacy));
  }
  return await ensureConnected(globalForAuditPools.auditLegacyPool);
}

export async function getAuditStorePool(): Promise<sql.ConnectionPool> {
  const { store } = requireAuditModuleEnv();

  if (!globalForAuditPools.auditStorePool) {
    globalForAuditPools.auditStorePool = new sql.ConnectionPool(toMssqlConfig(store));
  }
  return await ensureConnected(globalForAuditPools.auditStorePool);
}

