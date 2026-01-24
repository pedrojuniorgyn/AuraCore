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

  // CRÍTICO: Carregar reflect-metadata PRIMEIRO via require dinâmico
  // Isso garante que seja executado ANTES de qualquer módulo com decorators
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('reflect-metadata');

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

    // Initialize in dependency order
    try { initializeFinancialModule(); } catch (e) { console.error('[DI] ❌ Financial:', e); throw e; }
    try { registerAccountingModule(); } catch (e) { console.error('[DI] ❌ Accounting:', e); throw e; }
    try { registerFiscalModule(); } catch (e) { console.error('[DI] ❌ Fiscal:', e); throw e; }
    try { initializeWmsModule(); } catch (e) { console.error('[DI] ❌ WMS:', e); throw e; }
    try { registerTmsModule(); } catch (e) { console.error('[DI] ❌ TMS:', e); throw e; }
    try { registerFleetModule(); } catch (e) { console.error('[DI] ❌ Fleet:', e); throw e; }
    try { registerCommercialModule(); } catch (e) { console.error('[DI] ❌ Commercial:', e); throw e; }
    try { registerDocumentsModule(); } catch (e) { console.error('[DI] ❌ Documents:', e); throw e; }
    try { registerStrategicModule(); } catch (e) { console.error('[DI] ❌ Strategic:', e); throw e; }
    try { registerKnowledgeModule(); } catch (e) { console.error('[DI] ❌ Knowledge:', e); throw e; }
    try { registerContractsModule(); } catch (e) { console.error('[DI] ❌ Contracts:', e); throw e; }
    try { initializeIntegrationsModule(); } catch (e) { console.error('[DI] ❌ Integrations:', e); throw e; }

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
