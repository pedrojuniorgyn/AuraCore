/**
 * Next.js Instrumentation
 * Executado durante startup (server-side only)
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Server starting...');

    try {
      // 1. Inicializar Redis cache
      console.log('[Instrumentation] Initializing Redis cache...');
      const { initRedisCache } = await import('./src/lib/cache/init');
      initRedisCache();

      // 2. Aguardar conexão Redis estabilizar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Cache warming (apenas se habilitado)
      const warmingEnabled = process.env.CACHE_WARMING_ENABLED === 'true';
      
      if (warmingEnabled) {
        console.log('[Instrumentation] Cache warming enabled - starting background task');
        const { warmCache } = await import('./scripts/warm-cache');
        
        // Executar warming em background (não bloqueia startup)
        warmCache().catch(error => {
          console.error('[Instrumentation] Cache warming failed (non-fatal):', error);
        });
      } else {
        console.log('[Instrumentation] Cache warming disabled (CACHE_WARMING_ENABLED=false)');
      }

      console.log('[Instrumentation] Server ready!');
    } catch (error) {
      console.error('[Instrumentation] Initialization error:', error);
      // Não falhar a aplicação - continuar sem cache warming
    }
  }
}
