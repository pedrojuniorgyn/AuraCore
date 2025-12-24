import { z } from "zod";
import { isIP } from "node:net";

/**
 * Auditoria interna v2 — ENV
 *
 * Regras:
 * - Feature flag AUDIT_MODULE_ENABLED controla tudo.
 * - Se habilitado, valida env vars de Legacy(GlobalTCL) e Store(AuditFinDB).
 * - Em caso de misconfig, NÃO derruba o app no import: retorna enabled=false com erros,
 *   para que as rotas/UI possam degradar graciosamente (ex.: 503 "não configurado").
 */

function boolFromEnv(v: unknown, defaultValue: boolean): boolean {
  if (v === undefined || v === null || v === "") return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return defaultValue;
}

function nonEmpty(v: unknown): string | undefined {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

export type AuditDbConnEnv = {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  serverName?: string;
};

export type AuditModuleEnv = {
  enabled: boolean;
  legacy?: AuditDbConnEnv;
  store?: AuditDbConnEnv;
  errors?: string[];
};

const DbSchema = z.object({
  server: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  encrypt: z.boolean(),
  trustServerCertificate: z.boolean(),
  serverName: z.string().optional(),
});

function readDb(prefix: "AUDIT_LEGACY_DB" | "AUDIT_STORE_DB"): {
  ok: boolean;
  value?: AuditDbConnEnv;
  errors?: string[];
} {
  const server = nonEmpty(process.env[`${prefix}_SERVER`]);
  const portRaw = nonEmpty(process.env[`${prefix}_PORT`]) ?? "1433";
  const database = nonEmpty(process.env[`${prefix}_DATABASE`]);
  const user = nonEmpty(process.env[`${prefix}_USER`]);
  const password = nonEmpty(process.env[`${prefix}_PASSWORD`]);
  const encrypt = boolFromEnv(process.env[`${prefix}_ENCRYPT`], false);
  const trustServerCertificate = boolFromEnv(process.env[`${prefix}_TRUST_SERVER_CERTIFICATE`], true);
  const serverName = nonEmpty(process.env[`${prefix}_SERVERNAME`]);

  const port = Number(portRaw);
  const parsed = DbSchema.safeParse({
    server: server ?? "",
    port: Number.isFinite(port) ? port : 1433,
    database: database ?? "",
    user: user ?? "",
    password: password ?? "",
    encrypt,
    trustServerCertificate,
    serverName,
  });

  const errors: string[] = [];
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${prefix}: ${issue.path.join(".") || "env"} ${issue.message}`);
    }
    return { ok: false, errors };
  }

  // Tedious (via mssql) não permite SNI usando IP quando encrypt=true.
  if (parsed.data.encrypt && isIP(parsed.data.server) && !parsed.data.serverName) {
    errors.push(
      `${prefix}: config inválida: *_ENCRYPT=true com *_SERVER em IP (${parsed.data.server}). ` +
        `Defina ${prefix}_SERVERNAME=<hostname do certificado/SNI> ou desligue TLS com ${prefix}_ENCRYPT=false.`
    );
    return { ok: false, errors };
  }

  return { ok: true, value: parsed.data };
}

let cached: AuditModuleEnv | null = null;

export function getAuditModuleEnv(): AuditModuleEnv {
  if (cached) return cached;

  const enabled = boolFromEnv(process.env.AUDIT_MODULE_ENABLED, false);
  if (!enabled) {
    cached = { enabled: false };
    return cached;
  }

  const legacy = readDb("AUDIT_LEGACY_DB");
  const store = readDb("AUDIT_STORE_DB");
  const errors = [...(legacy.errors ?? []), ...(store.errors ?? [])];

  if (!legacy.ok || !store.ok) {
    // Degrada graciosamente: o módulo fica efetivamente desabilitado, mas com erro explicativo.
    cached = { enabled: false, errors };
    return cached;
  }

  cached = { enabled: true, legacy: legacy.value!, store: store.value! };
  return cached;
}

export function isAuditModuleEnabled(): boolean {
  return getAuditModuleEnv().enabled === true;
}

/**
 * Para rotas/worker: obtém env ou lança erro com mensagem segura.
 * Use isto para responder 503 em endpoints quando não configurado.
 */
export function requireAuditModuleEnv(): { legacy: AuditDbConnEnv; store: AuditDbConnEnv } {
  const env = getAuditModuleEnv();
  if (!env.enabled || !env.legacy || !env.store) {
    const msg =
      env.errors?.length
        ? `Módulo Auditoria não configurado: ${env.errors.join(" | ")}`
        : "Módulo Auditoria desabilitado (AUDIT_MODULE_ENABLED=false).";
    throw new Error(msg);
  }
  return { legacy: env.legacy, store: env.store };
}

