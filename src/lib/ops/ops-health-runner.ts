import { ensureConnection, pool } from "@/lib/db";
import { acquireIdempotency, finalizeIdempotency } from "@/lib/idempotency/sql-idempotency";
import { log } from "@/lib/observability/logger";
import { finishOpsHealthRun, insertOpsHealthRun } from "@/lib/ops/ops-health-db";

type CheckResult = {
  name: string;
  ok: boolean;
  durationMs: number;
  details?: Record<string, unknown>;
  error?: string;
};

function now() {
  return Date.now();
}

function makeRunId() {
  // reduz chance de colisão e facilita leitura humana
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `ops_${ts}_${Math.random().toString(16).slice(2, 10)}`.slice(0, 64);
}

async function checkDbConnectivity(): Promise<CheckResult> {
  const t0 = now();
  try {
    await ensureConnection();
    const r = await pool.request().query("SELECT 1 as ok");
    return { name: "db.connectivity", ok: r.recordset?.[0]?.ok === 1, durationMs: now() - t0 };
  } catch (e: unknown) {
    return { name: "db.connectivity", ok: false, durationMs: now() - t0, error: e?.message ?? String(e) };
  }
}

async function checkIdempotencyTable(): Promise<CheckResult> {
  const t0 = now();
  try {
    await ensureConnection();
    const r = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.idempotency_keys','U') IS NULL THEN 0 ELSE 1 END as ok
    `);
    return { name: "idempotency.table", ok: r.recordset?.[0]?.ok === 1, durationMs: now() - t0 };
  } catch (e: unknown) {
    return { name: "idempotency.table", ok: false, durationMs: now() - t0, error: e?.message ?? String(e) };
  }
}

async function getAnyOrganizationId(): Promise<number | null> {
  await ensureConnection();
  const r = await pool.request().query(`
    SELECT TOP 1 id
    FROM dbo.organizations
    ORDER BY id ASC
  `);
  const id = Number((r.recordset?.[0] as any)?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function checkIdempotencyBehavior(runId: string): Promise<CheckResult> {
  const t0 = now();
  try {
    const orgId = (await getAnyOrganizationId()) ?? 1;
    const scope = "ops.smoke.idempotency";
    const key = `run:${runId}`.slice(0, 128);

    const a1 = await acquireIdempotency({ organizationId: orgId, scope, key, ttlMinutes: 10 });
    if (a1.outcome !== "execute") {
      return {
        name: "idempotency.behavior",
        ok: false,
        durationMs: now() - t0,
        error: `Esperado 'execute' na primeira aquisição, veio '${a1.outcome}'`,
      };
    }

    await finalizeIdempotency({ organizationId: orgId, scope, key, status: "SUCCEEDED", resultRef: "ops-ok" });

    const a2 = await acquireIdempotency({ organizationId: orgId, scope, key, ttlMinutes: 10 });
    const ok = a2.outcome === "hit";
    return {
      name: "idempotency.behavior",
      ok,
      durationMs: now() - t0,
      details: { organizationId: orgId, first: a1, second: a2 },
      ...(ok ? {} : { error: `Esperado 'hit' na segunda aquisição, veio '${a2.outcome}'` }),
    };
  } catch (e: unknown) {
    return { name: "idempotency.behavior", ok: false, durationMs: now() - t0, error: e?.message ?? String(e) };
  }
}

function envSummary() {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "AUTH_SECRET", "APP_URL"];
  const missing = required.filter((k) => !process.env[k]);
  return {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    appUrl: process.env.APP_URL ?? null,
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
    requiredMissing: missing,
  };
}

export async function runOpsHealthOnce(reason: string = "manual") {
  const startedAt = now();
  const runId = makeRunId();
  const rowId = await insertOpsHealthRun(runId);

  log("info", "ops.health.started", { runId, reason });

  const checks: CheckResult[] = [];
  checks.push(await checkDbConnectivity());
  checks.push(await checkIdempotencyTable());
  checks.push(await checkIdempotencyBehavior(runId));

  const failed = checks.filter((c) => !c.ok);
  const status: "SUCCEEDED" | "FAILED" = failed.length ? "FAILED" : "SUCCEEDED";
  const durationMs = now() - startedAt;

  const summary = {
    runId,
    reason,
    status,
    durationMs,
    failedCount: failed.length,
    checks: checks.map((c) => ({ name: c.name, ok: c.ok, durationMs: c.durationMs })),
    env: envSummary(),
  };

  const details = {
    runId,
    reason,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    env: envSummary(),
    checks,
  };

  await finishOpsHealthRun({
    id: rowId,
    status,
    durationMs,
    summary,
    details,
    errorMessage: failed.length ? `${failed.length} check(s) falharam` : null,
  });

  log("info", "ops.health.finished", { runId, status, durationMs, failedCount: failed.length });

  return { runId, status, durationMs, failedCount: failed.length };
}

