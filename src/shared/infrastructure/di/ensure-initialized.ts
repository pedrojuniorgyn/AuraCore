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
    console.log('[DI] Loading global-registrations...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerGlobalDependencies } = require('@/shared/infrastructure/di/global-registrations');
    registerGlobalDependencies();

    // 2. Core Business Modules - carregar um por um para debug
    console.log('[DI] Loading FinancialModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeFinancialModule } = require('@/modules/financial/infrastructure/di/FinancialModule');
    
    console.log('[DI] Loading AccountingModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerAccountingModule } = require('@/modules/accounting/infrastructure/di/AccountingModule');
    
    console.log('[DI] Loading FiscalModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerFiscalModule } = require('@/modules/fiscal/infrastructure/di/FiscalModule');
    
    console.log('[DI] Loading WmsModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeWmsModule } = require('@/modules/wms/infrastructure/di/WmsModule');
    
    console.log('[DI] Loading TmsModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerTmsModule } = require('@/modules/tms/infrastructure/di/TmsModule');
    
    console.log('[DI] Loading FleetModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerFleetModule } = require('@/modules/fleet/infrastructure/di/FleetModule');
    
    console.log('[DI] Loading CommercialModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerCommercialModule } = require('@/modules/commercial/infrastructure/di/CommercialModule');
    
    console.log('[DI] Loading DocumentsModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerDocumentsModule } = require('@/modules/documents/infrastructure/di/DocumentsModule');

    // 3. Strategic & Support Modules
    console.log('[DI] Loading StrategicModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerStrategicModule } = require('@/modules/strategic/infrastructure/di/StrategicModule');
    
    console.log('[DI] Loading KnowledgeModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerKnowledgeModule } = require('@/modules/knowledge/infrastructure/di/KnowledgeModule');
    
    console.log('[DI] Loading ContractsModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerContractsModule } = require('@/modules/contracts/infrastructure/di/ContractsModule');
    
    console.log('[DI] Loading IntegrationsModule...');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeIntegrationsModule } = require('@/modules/integrations/infrastructure/di/IntegrationsModule');

    // Initialize in dependency order
    console.log('[DI] Initializing Financial...');
    try { initializeFinancialModule(); } catch (e) { console.error('[DI] ❌ Financial init:', e); throw e; }
    console.log('[DI] Initializing Accounting...');
    try { registerAccountingModule(); } catch (e) { console.error('[DI] ❌ Accounting:', e); throw e; }
    console.log('[DI] Initializing Fiscal...');
    try { registerFiscalModule(); } catch (e) { console.error('[DI] ❌ Fiscal:', e); throw e; }
    console.log('[DI] Initializing WMS...');
    try { initializeWmsModule(); } catch (e) { console.error('[DI] ❌ WMS:', e); throw e; }
    console.log('[DI] Initializing TMS...');
    try { registerTmsModule(); } catch (e) { console.error('[DI] ❌ TMS:', e); throw e; }
    console.log('[DI] Initializing Fleet...');
    try { registerFleetModule(); } catch (e) { console.error('[DI] ❌ Fleet:', e); throw e; }
    console.log('[DI] Initializing Commercial...');
    try { registerCommercialModule(); } catch (e) { console.error('[DI] ❌ Commercial:', e); throw e; }
    console.log('[DI] Initializing Documents...');
    try { registerDocumentsModule(); } catch (e) { console.error('[DI] ❌ Documents:', e); throw e; }
    console.log('[DI] Initializing Strategic...');
    try { registerStrategicModule(); } catch (e) { console.error('[DI] ❌ Strategic:', e); throw e; }
    console.log('[DI] Initializing Knowledge...');
    try { registerKnowledgeModule(); } catch (e) { console.error('[DI] ❌ Knowledge:', e); throw e; }
    console.log('[DI] Initializing Contracts...');
    try { registerContractsModule(); } catch (e) { console.error('[DI] ❌ Contracts:', e); throw e; }
    console.log('[DI] Initializing Integrations...');
    try { initializeIntegrationsModule(); } catch (e) { console.error('[DI] ❌ Integrations:', e); throw e; }

    isInitialized = true;
    console.log('[DI] ✅ Container inicializado no worker');
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
