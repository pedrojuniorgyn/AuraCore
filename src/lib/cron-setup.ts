/**
 * ⚙️ SETUP DE CRON JOBS
 * 
 * Inicializa todos os cron jobs do sistema
 */

import { startAutoImportCron } from "@/services/cron/auto-import-nfe";
import cron from "node-cron";
import { runMaintenanceAlertsJob } from "@/services/cron/check-maintenance-alerts";

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

  if (typeof window === "undefined") {
    // Apenas no servidor
    console.log("🤖 Inicializando Cron Jobs...");
    
    // Job 1: Importação automática de NFes (a cada 1 hora)
    startAutoImportCron();
    
    // Job 2: Verificação de Planos de Manutenção (diariamente às 8h)
    cron.schedule("0 8 * * *", async () => {
      console.log("🕐 [CRON] Executando verificação de manutenções preventivas...");
      await runMaintenanceAlertsJob();
    });
    
    initialized = true;
    console.log("✅ Cron Jobs inicializados!");
    console.log("  - Importação NFe: a cada hora configurada");
    console.log("  - Alertas Manutenção: diariamente às 8h");
  }
}

// ⚠️ Não auto-inicializar aqui.
// A inicialização deve ser feita pelo `src/instrumentation.ts` (startup do Next).
