import { log } from "@/lib/observability/logger";
import { runOpsHealthOnce } from "@/lib/ops/ops-health-runner";

const GLOBAL_KEY = "__aura_ops_auto_smoke__";

function getGlobal(): { started: boolean; running: boolean; lastRunId?: string } {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { started: false, running: false } as any;
  return g[GLOBAL_KEY];
}

export function scheduleAutoSmokeRun(reason: string) {
  const enabled =
    (process.env.AUTO_SMOKE_ENABLED ?? (process.env.NODE_ENV === "production" ? "true" : "false")) === "true";
  if (!enabled) return;

  const state = getGlobal();
  if (state.started || state.running) return;

  state.started = true;
  state.running = true;

  // Não bloquear request (ex.: /api/health). Roda em background.
  setTimeout(() => {
    runOpsHealthOnce(reason)
      .then((r) => {
        state.lastRunId = r.runId;
      })
      .catch((e) => {
        log("error", "ops.health.auto_failed", { error: e });
      })
      .finally(() => {
        state.running = false;
      });
  }, 250);
}

