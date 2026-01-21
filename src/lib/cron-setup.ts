/**
 * ⚙️ SETUP DE CRON JOBS
 *
 * Inicializa todos os cron jobs do sistema
 *
 * E10 Phase 2: Migrado de src/services/cron/ para módulos DDD
 */

import cron from 'node-cron';
import { AutoImportNfeJob } from '@/modules/integrations/infrastructure/jobs';
import { CheckMaintenanceAlertsJob } from '@/modules/fleet/infrastructure/jobs';

let initialized = false;

export function initializeCronJobs() {
  // Evitar múltiplas inicializações (dev mode hot reload)
  if (initialized) {
    return;
  }

  /**
   * ✅ Next.js: não iniciar CRON durante o build.
   * Durante `next build`, alguns módulos podem ser importados para análise/pré-render.
   * Se iniciarmos CRON aqui, criamos side-effects e podemos quebrar o build.
   */
  const phase = process.env.NEXT_PHASE;
  if (phase === "phase-production-build") {
    return;
  }

  // ✅ Em homologação/produção, só inicia se explicitamente habilitado
  // (evita rodar durante `next build`/pré-render e evitar efeitos colaterais)
  if (process.env.ENABLE_CRON !== "true") {
    return;
  }

  if (typeof window === 'undefined') {
    // Apenas no servidor
    console.log('🤖 Inicializando Cron Jobs...');

    // Job 1: Importação automática de NFes (a cada 1 hora)
    // E10: Migrado para módulo DDD integrations/infrastructure/jobs
    const autoImportJob = new AutoImportNfeJob();
    autoImportJob.start();

    // Job 2: Verificação de Planos de Manutenção (diariamente às 8h)
    // E10: Migrado para módulo DDD fleet/infrastructure/jobs
    const maintenanceJob = new CheckMaintenanceAlertsJob();
    cron.schedule('0 8 * * *', async () => {
      console.log('🕐 [CRON] Executando verificação de manutenções preventivas...');
      await maintenanceJob.execute();
    });

    // Job 3: Document Pipeline (fila de jobs) — a cada minuto
    cron.schedule("*/1 * * * *", async () => {
      try {
        const { runDocumentJobsTick } = await import("@/lib/documents/jobs-worker");
        const r = await runDocumentJobsTick({ maxJobs: 5 });
        if (r.processed > 0) {
          console.log(`🗂️ [CRON] Document jobs: processed=${r.processed} ok=${r.succeeded} fail=${r.failed}`);
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("❌ [CRON] Falha ao processar document jobs:", errorMsg);
      }
    });
    
    initialized = true;
    console.log("✅ Cron Jobs inicializados!");
    console.log("  - Importação NFe: a cada hora configurada");
    console.log("  - Alertas Manutenção: diariamente às 8h");
    console.log("  - Document Jobs: a cada 1 minuto");
  }
}

// ⚠️ Não auto-inicializar aqui.
// A inicialização deve ser feita pelo `src/instrumentation.ts` (startup do Next).
