import { log } from "@/lib/observability/logger";
import { runOpsHealthOnce } from "@/lib/ops/ops-health-runner";

const GLOBAL_KEY = "__aura_ops_auto_smoke__";

function getGlobal(): {
  running: boolean;
  lastRunId?: string;
  lastRunAt?: number;
} {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { running: false } as any;
  return g[GLOBAL_KEY];
}

export function scheduleAutoSmokeRun(reason: string) {
  const enabled =
    (process.env.AUTO_SMOKE_ENABLED ?? (process.env.NODE_ENV === "production" ? "true" : "false")) === "true";
  if (!enabled) return;

  const state = getGlobal();
  if (state.running) return;

  // Evita spam do healthcheck. Permite múltiplas execuções ao longo do tempo.
  const minIntervalMsRaw = process.env.AUTO_SMOKE_MIN_INTERVAL_MS;
  const minIntervalMs = Number.isFinite(Number(minIntervalMsRaw))
    ? Math.max(0, Number(minIntervalMsRaw))
    : 10 * 60_000; // default: 10min
  const now = Date.now();
  if (state.lastRunAt && now - state.lastRunAt < minIntervalMs) return;

  state.running = true;

  // Não bloquear request (ex.: /api/health). Roda em background.
  setTimeout(() => {
    runOpsHealthOnce(reason)
      .then((r) => {
        state.lastRunId = r.runId;
        state.lastRunAt = Date.now();
      })
      .catch((e) => {
        log("error", "ops.health.auto_failed", { error: e });
      })
      .finally(() => {
        state.running = false;
      });
  }, 250);
}

