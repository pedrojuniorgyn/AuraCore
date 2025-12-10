/**
 * 🤖 SERVIÇO DE IMPORTAÇÃO AUTOMÁTICA DE NFes
 * 
 * Roda a cada 1 hora e importa automaticamente NFes da Sefaz
 * para todas as filiais que têm auto-import habilitado
 */

import cron from "node-cron";
import { db } from "@/lib/db";
import { fiscalSettings, branches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notificationService } from "@/services/notification-service";

let cronJob: cron.ScheduledTask | null = null;

/**
 * Inicia o cron job de importação automática
 */
export function startAutoImportCron() {
  if (cronJob) {
    console.log("⚠️  Cron job já está rodando");
    return;
  }

  // Roda a cada 1 hora (minuto 0 de cada hora)
  cronJob = cron.schedule("0 * * * *", async () => {
    console.log("🤖 [Auto-Import] Iniciando importação automática...");
    
    try {
      await runAutoImport();
    } catch (error: any) {
      console.error("❌ [Auto-Import] Erro:", error.message);
    }
  });

  console.log("✅ Cron job de importação automática iniciado (a cada 1 hora)");
}

/**
 * Para o cron job
 */
export function stopAutoImportCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("⏹️  Cron job de importação automática parado");
  }
}

/**
 * Executa a importação para todas as filiais habilitadas
 */
async function runAutoImport() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // Buscar todas as configurações com auto-import habilitado
    const settings = await db
      .select()
      .from(fiscalSettings)
      .where(eq(fiscalSettings.autoImportEnabled, "S"));

    if (settings.length === 0) {
      console.log("ℹ️  [Auto-Import] Nenhuma filial com auto-import habilitado");
      return;
    }

    console.log(`📋 [Auto-Import] ${settings.length} filial(is) para importar`);

    for (const setting of settings) {
      try {
        // Buscar dados da filial
        const [branch] = await db
          .select()
          .from(branches)
          .where(eq(branches.id, setting.branchId));

        if (!branch) {
          console.log(`⚠️  [Auto-Import] Filial ${setting.branchId} não encontrada`);
          continue;
        }

        console.log(`🏢 [Auto-Import] Importando para: ${branch.name}`);

        // ✅ CORREÇÃO: Chamar serviço SEFAZ diretamente (sem HTTP request)
        const { downloadNFesFromSefaz } = await import("@/services/sefaz-service");
        
        const result = await downloadNFesFromSefaz(
          setting.organizationId,
          setting.branchId,
          branch.cnpj,
          "system-cron" // userId para auditoria
        );

        console.log(`✅ [Auto-Import] ${branch.name}: ${result.imported || 0} NFe(s) importada(s)`);

        // 🔔 NOTIFICAR: Importação bem-sucedida
        if (result.imported > 0) {
          await notificationService.notifyImportSuccess(
            setting.organizationId,
            setting.branchId,
            result.imported,
            result.duplicates || 0,
            result.totalValue
          );
        }

        // 🔔 NOTIFICAR: Erro SEFAZ 656 (Consumo Indevido)
        if (result.sefazStatus === "656") {
          await notificationService.notifySefazError656(
            setting.organizationId,
            setting.branchId
          );
        }

        // Atualizar última importação
        await db
          .update(fiscalSettings)
          .set({
            lastAutoImport: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(fiscalSettings.id, setting.id));

        // Aguardar 2 segundos entre filiais para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`❌ [Auto-Import] Erro na filial ${setting.branchId}:`, error.message);
        
        // 🔔 NOTIFICAR: Erro na importação
        await notificationService.notifyImportError(
          setting.organizationId,
          setting.branchId,
          error.message
        );
      }
    }

    console.log("✅ [Auto-Import] Importação automática concluída");

  } catch (error: any) {
    console.error("❌ [Auto-Import] Erro geral:", error.message);
  }
}

/**
 * Executa importação manual (para testes)
 */
export async function runManualImport() {
  console.log("🔧 [Manual Import] Executando importação manual...");
  await runAutoImport();
}


