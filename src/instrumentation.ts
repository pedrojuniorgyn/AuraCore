/**
 * Next.js Instrumentation
 * Executa uma vez no runtime do servidor (boot do `next start`).
 *
 * Usamos isso para iniciar CRON sem causar side-effects no `next build`.
 */
export async function register() {
  // Nunca rodar durante o build
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Em edge runtime não há suporte para node-cron
  if (process.env.NEXT_RUNTIME === "edge") return;

  // Feature flag (controlado via .env)
  if (process.env.ENABLE_CRON !== "true") return;

  const { initializeCronJobs } = await import("@/lib/cron-setup");
  initializeCronJobs();
}

