type DbEnv = {
  server: string;
  serverName?: string;
  database: string;
  user: string;
  password: string;
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
};

export type AuditEnv = {
  legacyDb: DbEnv;
  auditFinDb: DbEnv;
};

function firstDefined(names: string[]): string | undefined {
  for (const name of names) {
    const v = process.env[name];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return undefined;
}

function requiredAny(names: string[]): string {
  const v = firstDefined(names);
  if (!v) throw new Error(`Missing required env var (any of): ${names.join(", ")}`);
  return v;
}

function optionalAny(names: string[], fallback?: string): string | undefined {
  return firstDefined(names) ?? fallback;
}

function intAny(names: string[], fallback: number): number {
  const raw = firstDefined(names);
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var (any of): ${names.join(", ")}`);
  return n;
}

function boolAny(names: string[], fallback: boolean): boolean {
  const raw = firstDefined(names);
  if (!raw) return fallback;
  return raw === "true" || raw === "1";
}

let cachedLegacy: DbEnv | null = null;
let cachedAuditFin: DbEnv | null = null;

export function getLegacyDbEnv(): DbEnv {
  if (cachedLegacy) return cachedLegacy;
  cachedLegacy = {
    server: requiredAny([
      "GLOBAL_DB_SERVER",
      "GLOBAL_DB_HOST",
      "GLOBAL_SERVER",
      "GLOBAL_HOST",
      "AUDIT_LEGACY_DB_SERVER",
      "AUDIT_LEGACY_DB_HOST",
      "LEGACY_DB_SERVER",
      "LEGACY_DB_HOST",
    ]),
    serverName: optionalAny([
      "GLOBAL_DB_SERVERNAME",
      "GLOBAL_DB_SERVER_NAME",
      "GLOBAL_SERVERNAME",
      "GLOBAL_SERVER_NAME",
      "AUDIT_LEGACY_DB_SERVERNAME",
      "AUDIT_LEGACY_DB_SERVER_NAME",
      "LEGACY_DB_SERVERNAME",
      "LEGACY_DB_SERVER_NAME",
    ]),
    database: requiredAny([
      "GLOBAL_DB_DATABASE",
      "GLOBAL_DB_NAME",
      "GLOBAL_DATABASE",
      "GLOBAL_NAME",
      "AUDIT_LEGACY_DB_DATABASE",
      "AUDIT_LEGACY_DB_NAME",
      "LEGACY_DB_DATABASE",
      "LEGACY_DB_NAME",
    ]),
    user: requiredAny(["GLOBAL_DB_USER", "GLOBAL_USER", "AUDIT_LEGACY_DB_USER", "LEGACY_DB_USER"]),
    password: requiredAny([
      "GLOBAL_DB_PASSWORD",
      "GLOBAL_PASSWORD",
      "AUDIT_LEGACY_DB_PASSWORD",
      "LEGACY_DB_PASSWORD",
    ]),
    port: intAny(["GLOBAL_DB_PORT", "GLOBAL_PORT", "AUDIT_LEGACY_DB_PORT", "LEGACY_DB_PORT"], 1433),
    encrypt: boolAny(["GLOBAL_DB_ENCRYPT", "GLOBAL_ENCRYPT", "AUDIT_LEGACY_DB_ENCRYPT", "LEGACY_DB_ENCRYPT"], true),
    trustServerCertificate: boolAny(
      [
        "GLOBAL_DB_TRUST_SERVER_CERTIFICATE",
        "GLOBAL_DB_TRUST_CERT",
        "GLOBAL_TRUST_SERVER_CERTIFICATE",
        "GLOBAL_TRUST_CERT",
        "AUDIT_LEGACY_DB_TRUST_SERVER_CERTIFICATE",
        "AUDIT_LEGACY_DB_TRUST_CERT",
        "LEGACY_DB_TRUST_SERVER_CERTIFICATE",
        "LEGACY_DB_TRUST_CERT",
      ],
      true
    ),
  };
  return cachedLegacy;
}

export function getAuditFinDbEnv(): DbEnv {
  if (cachedAuditFin) return cachedAuditFin;
  cachedAuditFin = {
    server: requiredAny([
      "AUDIT_FIN_DB_SERVER",
      "AUDIT_FIN_DB_HOST",
      "AUDIT_DB_SERVER",
      "AUDIT_DB_HOST",
      "AUDIT_SERVER",
      "AUDIT_HOST",
    ]),
    serverName: optionalAny([
      "AUDIT_FIN_DB_SERVERNAME",
      "AUDIT_FIN_DB_SERVER_NAME",
      "AUDIT_DB_SERVERNAME",
      "AUDIT_DB_SERVER_NAME",
      "AUDIT_SERVERNAME",
      "AUDIT_SERVER_NAME",
    ]),
    database: requiredAny([
      "AUDIT_FIN_DB_DATABASE",
      "AUDIT_FIN_DB_NAME",
      "AUDIT_DB_DATABASE",
      "AUDIT_DB_NAME",
      "AUDIT_DATABASE",
      "AUDIT_NAME",
    ]),
    user: requiredAny(["AUDIT_FIN_DB_USER", "AUDIT_DB_USER", "AUDIT_USER"]),
    password: requiredAny(["AUDIT_FIN_DB_PASSWORD", "AUDIT_DB_PASSWORD", "AUDIT_PASSWORD"]),
    port: intAny(["AUDIT_FIN_DB_PORT", "AUDIT_DB_PORT", "AUDIT_PORT"], 1433),
    encrypt: boolAny(["AUDIT_FIN_DB_ENCRYPT", "AUDIT_DB_ENCRYPT", "AUDIT_ENCRYPT"], true),
    trustServerCertificate: boolAny(
      [
        "AUDIT_FIN_DB_TRUST_SERVER_CERTIFICATE",
        "AUDIT_FIN_DB_TRUST_CERT",
        "AUDIT_DB_TRUST_SERVER_CERTIFICATE",
        "AUDIT_DB_TRUST_CERT",
        "AUDIT_TRUST_SERVER_CERTIFICATE",
        "AUDIT_TRUST_CERT",
      ],
      true
    ),
  };
  return cachedAuditFin;
}

// Compat (se alguém precisar dos dois)
export function getAuditEnv(): AuditEnv {
  return { legacyDb: getLegacyDbEnv(), auditFinDb: getAuditFinDbEnv() };
}
