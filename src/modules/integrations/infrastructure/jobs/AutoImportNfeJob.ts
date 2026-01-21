/**
 * AutoImportNfeJob - E10 Phase 2
 * Importação automática de NFe via DFe
 *
 * Migrado de: src/services/cron/auto-import-nfe.ts
 *
 * @description Executa a cada hora, consultando a Sefaz para importar
 * automaticamente NFes para filiais com auto-import habilitado.
 */

import { injectable } from 'tsyringe';
import cron from 'node-cron';
import { db } from '@/lib/db';
import { fiscalSettings, branches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notificationService } from '@/services/notification-service';

export interface IAutoImportNfeJob {
  start(): void;
  stop(): void;
  runManually(): Promise<AutoImportResult>;
}

export interface AutoImportResult {
  success: boolean;
  branchesProcessed: number;
  totalImported: number;
  totalDuplicates: number;
  totalErrors: number;
  processedAt: Date;
  errors: string[];
}

@injectable()
export class AutoImportNfeJob implements IAutoImportNfeJob {
  private cronJob: ReturnType<typeof cron.schedule> | null = null;

  /**
   * Inicia o cron job de importação automática
   * Executa a cada hora (minuto 0)
   */
  start(): void {
    if (this.cronJob) {
      console.log('⚠️  [AutoImportNfeJob] Cron job já está rodando');
      return;
    }

    // Roda a cada 1 hora (minuto 0 de cada hora)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('🤖 [AutoImportNfeJob] Iniciando importação automática...');

      try {
        await this.execute();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error('❌ [AutoImportNfeJob] Erro:', errorMessage);
      }
    });

    console.log(
      '✅ [AutoImportNfeJob] Cron job iniciado (a cada 1 hora)'
    );
  }

  /**
   * Para o cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️  [AutoImportNfeJob] Cron job parado');
    }
  }

  /**
   * Executa importação manual (para testes ou chamadas diretas)
   */
  async runManually(): Promise<AutoImportResult> {
    console.log('🔧 [AutoImportNfeJob] Executando importação manual...');
    return this.execute();
  }

  /**
   * Executa a importação para todas as filiais habilitadas
   */
  private async execute(): Promise<AutoImportResult> {
    const result: AutoImportResult = {
      success: true,
      branchesProcessed: 0,
      totalImported: 0,
      totalDuplicates: 0,
      totalErrors: 0,
      processedAt: new Date(),
      errors: [],
    };

    try {
      const { ensureConnection } = await import('@/lib/db');
      await ensureConnection();

      // Buscar todas as configurações com auto-import habilitado
      const settings = await db
        .select()
        .from(fiscalSettings)
        .where(eq(fiscalSettings.autoImportEnabled, 'S'));

      if (settings.length === 0) {
        console.log(
          'ℹ️  [AutoImportNfeJob] Nenhuma filial com auto-import habilitado'
        );
        return result;
      }

      console.log(
        `📋 [AutoImportNfeJob] ${settings.length} filial(is) para importar`
      );

      for (const setting of settings) {
        try {
          // Buscar dados da filial
          const [branch] = await db
            .select()
            .from(branches)
            .where(eq(branches.id, setting.branchId));

          if (!branch) {
            console.log(
              `⚠️  [AutoImportNfeJob] Filial ${setting.branchId} não encontrada`
            );
            continue;
          }

          console.log(`🏢 [AutoImportNfeJob] Importando para: ${branch.name}`);

          // Chamar serviço SEFAZ
          const { downloadNFesFromSefaz } = await import(
            '@/services/sefaz-service'
          );

          const importResult = await downloadNFesFromSefaz(
            setting.organizationId,
            setting.branchId,
            branch.document,
            'system-cron'
          );

          result.branchesProcessed++;
          result.totalImported += importResult.imported || 0;
          result.totalDuplicates += importResult.duplicates || 0;

          console.log(
            `✅ [AutoImportNfeJob] ${branch.name}: ${importResult.imported || 0} NFe(s) importada(s)`
          );

          // Notificar importação bem-sucedida
          if (importResult.imported > 0) {
            await notificationService.notifyImportSuccess(
              setting.organizationId,
              setting.branchId,
              importResult.imported,
              importResult.duplicates || 0,
              importResult.totalValue
            );
          }

          // Notificar erro SEFAZ 656 (Consumo Indevido)
          if (importResult.sefazStatus === '656') {
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
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `❌ [AutoImportNfeJob] Erro na filial ${setting.branchId}:`,
            errorMessage
          );

          result.totalErrors++;
          result.errors.push(`Filial ${setting.branchId}: ${errorMessage}`);

          // Notificar erro na importação
          await notificationService.notifyImportError(
            setting.organizationId,
            setting.branchId,
            errorMessage
          );
        }
      }

      console.log('✅ [AutoImportNfeJob] Importação automática concluída');
      console.log(`   - Filiais processadas: ${result.branchesProcessed}`);
      console.log(`   - Total importadas: ${result.totalImported}`);
      console.log(`   - Total duplicadas: ${result.totalDuplicates}`);
      console.log(`   - Total erros: ${result.totalErrors}`);

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[AutoImportNfeJob] Erro geral:', errorMessage);

      result.success = false;
      result.errors.push(errorMessage);
      return result;
    }
  }
}
