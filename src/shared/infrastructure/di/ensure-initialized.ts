/**
 * Lazy DI Initialization for Next.js Production Workers
 *
 * Next.js production cria múltiplos workers isolados.
 * instrumentation.ts executa apenas no processo principal.
 * Workers têm containers tsyringe vazios.
 *
 * Esta função garante que o DI está inicializado no worker atual.
 * É idempotente - só inicializa uma vez por worker.
 *
 * @module shared/infrastructure/di
 * @since E14.8
 * @updated 2026-01-24 - Changed to async with dynamic import() to fix TypeError
 */

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Garante que o container DI está inicializado no worker atual.
 * VERSÃO ASYNC - deve ser awaited.
 */
export async function ensureDIInitializedAsync(): Promise<void> {
  if (isInitialized) {
    return; // Já inicializado neste worker
  }

  // Se já existe uma promise de inicialização, aguardar ela
  if (initPromise) {
    await initPromise;
    return;
  }
  
  initPromise = doInitialize();
  await initPromise;
}

/**
 * Versão síncrona (legacy) - apenas verifica se está inicializado
 * NÃO inicializa se não estiver - use ensureDIInitializedAsync() para isso
 */
export function ensureDIInitialized(): void {
  if (isInitialized) {
    return;
  }
  // Iniciar em background se ainda não iniciou
  if (!initPromise) {
    initPromise = doInitialize();
  }
  // Não aguardar - a rota vai falhar se DI não estiver pronto
  // Isso é intencional para manter compatibilidade com código legado
}

/**
 * Inicialização assíncrona real
 */
async function doInitialize(): Promise<void> {
  if (isInitialized) return;

  // CRÍTICO: Carregar reflect-metadata PRIMEIRO
  await import('reflect-metadata');

  try {
    // 1. Global Dependencies (DEVE ser primeiro)
    const { registerGlobalDependencies } = await import('@/shared/infrastructure/di/global-registrations');
    registerGlobalDependencies();

    // 2. Core Business Modules
    const [
      { initializeFinancialModule },
      { registerAccountingModule },
      { registerFiscalModule },
      { initializeWmsModule },
      { registerTmsModule },
      { registerFleetModule },
      { registerCommercialModule },
      { registerDocumentsModule },
      { registerStrategicModule },
      { registerKnowledgeModule },
      { registerContractsModule },
      { initializeIntegrationsModule },
    ] = await Promise.all([
      import('@/modules/financial/infrastructure/di/FinancialModule'),
      import('@/modules/accounting/infrastructure/di/AccountingModule'),
      import('@/modules/fiscal/infrastructure/di/FiscalModule'),
      import('@/modules/wms/infrastructure/di/WmsModule'),
      import('@/modules/tms/infrastructure/di/TmsModule'),
      import('@/modules/fleet/infrastructure/di/FleetModule'),
      import('@/modules/commercial/infrastructure/di/CommercialModule'),
      import('@/modules/documents/infrastructure/di/DocumentsModule'),
      import('@/modules/strategic/infrastructure/di/StrategicModule'),
      import('@/modules/knowledge/infrastructure/di/KnowledgeModule'),
      import('@/modules/contracts/infrastructure/di/ContractsModule'),
      import('@/modules/integrations/infrastructure/di/IntegrationsModule'),
    ]);

    // Initialize in dependency order
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

    isInitialized = true;
  } catch (error) {
    // ✅ Manter console.error para falhas críticas de DI
    console.error('[DI] ❌ Erro ao inicializar container:', error);
    throw error;
  }
}

/**
 * Verifica se o DI está inicializado (para debugging/testes)
 */
export function isDIInitialized(): boolean {
  return isInitialized;
}

/**
 * Reset do estado de inicialização (APENAS para testes)
 * @internal
 */
export function _resetDIState(): void {
  isInitialized = false;
}
