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
 */
import 'reflect-metadata';

let isInitialized = false;

/**
 * Garante que o container DI está inicializado no worker atual.
 * Deve ser chamado antes de qualquer container.resolve().
 *
 * Esta função é THREAD-SAFE (single-threaded JS) e IDEMPOTENT.
 */
export function ensureDIInitialized(): void {
  if (isInitialized) {
    return; // Já inicializado neste worker
  }

  // console.log('[DI] Inicializando container no worker...');

  try {
    // 1. Global Dependencies (DEVE ser primeiro)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerGlobalDependencies } = require('@/shared/infrastructure/di/global-registrations');
    registerGlobalDependencies();

    // 2. Core Business Modules
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeFinancialModule } = require('@/modules/financial/infrastructure/di/FinancialModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerAccountingModule } = require('@/modules/accounting/infrastructure/di/AccountingModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerFiscalModule } = require('@/modules/fiscal/infrastructure/di/FiscalModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeWmsModule } = require('@/modules/wms/infrastructure/di/WmsModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerTmsModule } = require('@/modules/tms/infrastructure/di/TmsModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerFleetModule } = require('@/modules/fleet/infrastructure/di/FleetModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerCommercialModule } = require('@/modules/commercial/infrastructure/di/CommercialModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerDocumentsModule } = require('@/modules/documents/infrastructure/di/DocumentsModule');

    // 3. Strategic & Support Modules
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerStrategicModule } = require('@/modules/strategic/infrastructure/di/StrategicModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerKnowledgeModule } = require('@/modules/knowledge/infrastructure/di/KnowledgeModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerContractsModule } = require('@/modules/contracts/infrastructure/di/ContractsModule');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeIntegrationsModule } = require('@/modules/integrations/infrastructure/di/IntegrationsModule');

    // Initialize in dependency order with debug
    console.log('[DI] Iniciando Financial...');
    initializeFinancialModule();
    console.log('[DI] Iniciando Accounting...');
    registerAccountingModule();
    console.log('[DI] Iniciando Fiscal...');
    registerFiscalModule();
    console.log('[DI] Iniciando WMS...');
    initializeWmsModule();
    console.log('[DI] Iniciando TMS...');
    registerTmsModule();
    console.log('[DI] Iniciando Fleet...');
    registerFleetModule();
    console.log('[DI] Iniciando Commercial...');
    registerCommercialModule();
    console.log('[DI] Iniciando Documents...');
    registerDocumentsModule();

    console.log('[DI] Iniciando Strategic...');
    registerStrategicModule();
    console.log('[DI] Iniciando Knowledge...');
    registerKnowledgeModule();
    console.log('[DI] Iniciando Contracts...');
    registerContractsModule();
    console.log('[DI] Iniciando Integrations...');
    initializeIntegrationsModule();

    isInitialized = true;
    // console.log('[DI] ✅ Container inicializado no worker');
  } catch (error) {
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
