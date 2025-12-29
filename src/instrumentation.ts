/**
 * Next.js Instrumentation
 * Executa uma vez no runtime do servidor (boot do `next start`).
 *
 * Usamos isso para iniciar CRON e inicializar módulos DDD sem causar side-effects no `next build`.
 */
export async function register() {
  // Nunca rodar durante o build
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Em edge runtime não há suporte para node-cron e tsyringe
  if (process.env.NEXT_RUNTIME === "edge") return;

  // === 1. Inicializar módulos DDD (tsyringe DI) ===
  // BUG 1 FIX: Registrar dependências dos módulos no container DI
  // Deve ser feito ANTES de qualquer rota API tentar usar os use cases
  try {
    const { initializeFinancialModule } = await import("@/modules/financial/presentation/bootstrap");
    const { initializeAccountingModule } = await import("@/modules/accounting/presentation/bootstrap");
    const { initializeFiscalModule } = await import("@/modules/fiscal/infrastructure/bootstrap");

    initializeFinancialModule();
    initializeAccountingModule();
    initializeFiscalModule();

    console.log("[Instrumentation] DDD modules initialized (Financial, Accounting, Fiscal)");
  } catch (error) {
    console.error("[Instrumentation] Failed to initialize DDD modules:", error);
  }

  // === 2. Inicializar CRON jobs (se habilitado) ===
  if (process.env.ENABLE_CRON !== "true") return;

  const { initializeCronJobs } = await import("@/lib/cron-setup");
  initializeCronJobs();
}


