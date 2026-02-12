import 'reflect-metadata';

/**
 * Next.js Instrumentation
 * Executa uma vez no runtime do servidor (boot do `next start`).
 * 
 * Responsabilidades:
 * 1. Inicializar módulos DDD (Dependency Injection)
 * 2. Inicializar Redis Cache
 * 3. Cache warming (se habilitado)
 * 4. CRON jobs (se habilitado)
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Nunca rodar durante o build
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Em edge runtime não há suporte para node-cron e tsyringe
  if (process.env.NEXT_RUNTIME === "edge") return;

  console.log('[Instrumentation] Server starting...');

  // === 1. Inicializar módulos DDD (tsyringe DI) ===
  // CRÍTICO: Registrar dependências dos módulos no container DI
  // Deve ser feito ANTES de qualquer rota API tentar usar os use cases
  try {
    console.log('[Instrumentation] Initializing DDD modules...');
    
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

    console.log("[Instrumentation] ✅ All DDD modules initialized successfully");

    // === 1.1. Bootstrap Event Subscriptions (F1.4) ===
    const { bootstrapEventSubscriptions } = await import("@/shared/infrastructure/events/EventSubscriptionBootstrap");
    bootstrapEventSubscriptions();
    console.log("[Instrumentation] ✅ Event subscriptions bootstrapped");

    // === 1.2. Start Outbox Processor (F1.7) ===
    try {
      const { container } = await import("tsyringe");
      const { TOKENS } = await import("@/shared/infrastructure/di/tokens");
      const { OutboxProcessor } = await import("@/shared/infrastructure/events/outbox");
      const processor = container.resolve<InstanceType<typeof OutboxProcessor>>(TOKENS.OutboxProcessor);
      processor.start({ pollingIntervalMs: 5_000, batchSize: 50 });
      console.log("[Instrumentation] ✅ Outbox processor started (polling every 5s)");
    } catch (outboxError) {
      console.error("[Instrumentation] ⚠️ Outbox processor failed to start (non-fatal):", outboxError);
      // Não fatal: eventos serão publicados diretamente via InMemoryEventPublisher como fallback
    }
  } catch (error) {
    console.error("[Instrumentation] ❌ Failed to initialize DDD modules:", error);
    throw error; // Falhar startup se DDD não inicializar (CRÍTICO)
  }

  // === 2. Inicializar Redis Cache ===
  try {
    console.log('[Instrumentation] Initializing Redis cache...');
    const { initRedisCache } = await import('@/lib/cache/init');
    initRedisCache();
    
    // Aguardar conexão Redis estabilizar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('[Instrumentation] ✅ Redis cache initialized');
  } catch (error) {
    console.error('[Instrumentation] ⚠️ Redis cache initialization failed (non-fatal):', error);
    // Não falhar a aplicação - continuar sem cache
  }

  // === 3. Cache warming (apenas se habilitado) ===
  const warmingEnabled = process.env.CACHE_WARMING_ENABLED === 'true';
  
  if (warmingEnabled) {
    try {
      console.log('[Instrumentation] Cache warming enabled - starting background task');
      const { warmCache } = await import('./scripts/warm-cache');
      
      // Executar warming em background (não bloqueia startup)
      warmCache().catch(error => {
        console.error('[Instrumentation] ⚠️ Cache warming failed (non-fatal):', error);
      });
    } catch (error) {
      console.error('[Instrumentation] ⚠️ Cache warming initialization failed:', error);
    }
  } else {
    console.log('[Instrumentation] Cache warming disabled (CACHE_WARMING_ENABLED=false)');
  }

  // === 4. Inicializar CRON jobs (se habilitado) ===
  if (process.env.ENABLE_CRON === "true") {
    try {
      console.log('[Instrumentation] Initializing CRON jobs...');
      const { initializeCronJobs } = await import("@/lib/cron-setup");
      initializeCronJobs();
      console.log('[Instrumentation] ✅ CRON jobs initialized');
    } catch (error) {
      console.error('[Instrumentation] ⚠️ CRON initialization failed (non-fatal):', error);
    }
  }

  console.log('[Instrumentation] 🚀 Server ready!');
}
