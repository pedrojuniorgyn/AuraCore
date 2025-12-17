import sql from "mssql";
import { isIP } from "node:net";
import { getAuditEnv } from "@/lib/audit/env";

export type MssqlPool = sql.ConnectionPool;

type PoolKey = "legacy" | "auditFin";

type GlobalWithPools = typeof globalThis & {
  __auraAuditPools?: Partial<Record<PoolKey, MssqlPool>>;
};

function globalWithPools(): GlobalWithPools {
  return globalThis as GlobalWithPools;
}

function buildConfig(kind: PoolKey): sql.config {
  const env = getAuditEnv();
  const c = kind === "legacy" ? env.legacyDb : env.auditFinDb;

  // Tedious (via mssql) não permite SNI usando IP quando encrypt=true.
  if (c.encrypt && isIP(c.server) && !c.serverName) {
    throw new Error(
      `Config inválida: encrypt=true com server em IP (${c.server}). ` +
        `Defina *_DB_SERVERNAME=<hostname do certificado/SNI> ou desligue TLS com *_DB_ENCRYPT=false.`
    );
  }

  return {
    user: c.user,
    password: c.password,
    server: c.server,
    database: c.database,
    port: c.port,
    options: {
      encrypt: c.encrypt,
      trustServerCertificate: c.trustServerCertificate,
      enableArithAbort: true,
      ...(c.serverName ? { serverName: c.serverName } : {}),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
    requestTimeout: 120_000,
  };
}

async function getOrCreatePool(kind: PoolKey): Promise<MssqlPool> {
  const g = globalWithPools();
  g.__auraAuditPools = g.__auraAuditPools ?? {};

  const existing = g.__auraAuditPools[kind];
  if (existing?.connected) return existing;

  const pool = new sql.ConnectionPool(buildConfig(kind));
  g.__auraAuditPools[kind] = pool;
  await pool.connect();
  return pool;
}

export async function getAuditLegacyPool(): Promise<MssqlPool> {
  return await getOrCreatePool("legacy");
}

export async function getAuditFinPool(): Promise<MssqlPool> {
  return await getOrCreatePool("auditFin");
}

export async function closeAllAuditPools(): Promise<void> {
  const g = globalWithPools();
  const pools = g.__auraAuditPools;
  if (!pools) return;

  await Promise.all(
    Object.values(pools)
      .filter(Boolean)
      .map(async (p) => {
        try {
          await p!.close();
        } catch {
          // ignore
        }
      })
  );

  g.__auraAuditPools = {};
}
