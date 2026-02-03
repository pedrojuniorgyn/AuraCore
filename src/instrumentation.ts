import 'reflect-metadata';

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
    // Global Dependencies
    const { registerGlobalDependencies } = await import("@/shared/infrastructure/di/global-registrations");
    registerGlobalDependencies();

    // Core Modules
    const { initializeFinancialModule } = await import("@/modules/financial/infrastructure/di/FinancialModule");
    const { registerAccountingModule } = await import("@/modules/accounting/infrastructure/di/AccountingModule");
    const { registerFiscalModule } = await import("@/modules/fiscal/infrastructure/di/FiscalModule");
    const { initializeWmsModule } = await import("@/modules/wms/infrastructure/di/WmsModule");
    const { registerTmsModule } = await import("@/modules/tms/infrastructure/di/TmsModule");
    const { registerFleetModule } = await import("@/modules/fleet/infrastructure/di/FleetModule");
    const { registerCommercialModule } = await import("@/modules/commercial/infrastructure/di/CommercialModule");
    const { registerDocumentsModule } = await import("@/modules/documents/infrastructure/di/DocumentsModule");
    
    // Strategic & Support Modules
    const { registerStrategicModule } = await import("@/modules/strategic/infrastructure/di/StrategicModule");
    const { registerKnowledgeModule } = await import("@/modules/knowledge/infrastructure/di/KnowledgeModule");
    const { registerContractsModule } = await import("@/modules/contracts/infrastructure/di/ContractsModule");
    const { initializeIntegrationsModule } = await import("@/modules/integrations/infrastructure/di/IntegrationsModule");

    // Initialize in order
    initializeFinancialModule();
    registerAccountingModule();
    registerFiscalModule();
    initializeWmsModule();
    registerTmsModule();
    registerFleetModule();
    registerCommercialModule();
    registerDocumentsModule();
    
    registerStrategicModule();
    registerKnowledgeModule();
    registerContractsModule();
    initializeIntegrationsModule();

    console.log("[Instrumentation] All DDD modules initialized successfully");
  } catch (error) {
    console.error("[Instrumentation] Failed to initialize DDD modules:", error);
  }

  // === 1.5. Inicializar Redis Cache ===
  try {
    const { initRedisCache } = await import("@/lib/cache");
    initRedisCache();
  } catch (error) {
    console.error("[Instrumentation] Failed to initialize Redis cache:", error);
  }

  // === 2. Inicializar CRON jobs (se habilitado) ===
  if (process.env.ENABLE_CRON !== "true") return;

  const { initializeCronJobs } = await import("@/lib/cron-setup");
  initializeCronJobs();
}
