/**
 * AutoImportNfeJob - E10 Phase 2
 * Importação automática de NFe via DFe
 *
 * E10 Fase 3: Atualizado para usar DownloadNfesUseCase via DI
 * Migrado de: src/services/cron/auto-import-nfe.ts
 *
 * @description Executa a cada hora, consultando a Sefaz para importar
 * automaticamente NFes para filiais com auto-import habilitado.
 */

import { injectable, inject } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import cron from 'node-cron';
import { db } from '@/lib/db';
import { fiscalSettings } from '@/modules/fiscal/infrastructure/persistence/schemas';
import { branches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { logger } from '@/shared/infrastructure/logging';
import type { IInAppNotificationService } from '@/shared/domain/ports/output/IInAppNotificationService';
import type { IDownloadNfesUseCase } from '@/modules/fiscal/domain/ports/input/IDownloadNfesUseCase';

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

  constructor(
    @inject(TOKENS.DownloadNfesUseCase)
    private readonly downloadNfesUseCase: IDownloadNfesUseCase,
    @inject(TOKENS.InAppNotificationService)
    private readonly notificationService: IInAppNotificationService
  ) {}

  /**
   * Inicia o cron job de importação automática
   * Executa a cada hora (minuto 0)
   */
  start(): void {
    if (this.cronJob) {
      logger.warn('[AutoImportNfeJob] Cron job ja esta rodando');
      return;
    }

    // Roda a cada 1 hora (minuto 0 de cada hora)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      logger.info('[AutoImportNfeJob] Iniciando importacao automatica');

      try {
        await this.execute();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[AutoImportNfeJob] Erro na execucao do cron', { error: errorMessage });
      }
    });

    logger.info('[AutoImportNfeJob] Cron job iniciado (a cada 1 hora)');
  }

  /**
   * Para o cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('[AutoImportNfeJob] Cron job parado');
    }
  }

  /**
   * Executa importação manual (para testes ou chamadas diretas)
   */
  async runManually(): Promise<AutoImportResult> {
    logger.info('[AutoImportNfeJob] Executando importacao manual');
    return this.execute();
  }

  /**
   * Executa a importação para todas as filiais habilitadas
   * E10 Fase 3: Usa DownloadNfesUseCase via DI
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
      const settings = await db.select().from(fiscalSettings).where(eq(fiscalSettings.autoImportEnabled, 'S'));

      if (settings.length === 0) {
        logger.info('[AutoImportNfeJob] Nenhuma filial com auto-import habilitado');
        return result;
      }

      logger.info('[AutoImportNfeJob] Filiais para importar', { branchCount: settings.length });

      for (const setting of settings) {
        try {
          // Buscar dados da filial
          const [branch] = await db.select().from(branches).where(eq(branches.id, setting.branchId));

          if (!branch) {
            logger.warn('[AutoImportNfeJob] Filial nao encontrada', { branchId: setting.branchId });
            continue;
          }

          logger.info('[AutoImportNfeJob] Importando para filial', { branchName: branch.name, branchId: setting.branchId });

          // Chamar UseCase via DI
          const importResult = await this.downloadNfesUseCase.execute({
            organizationId: setting.organizationId,
            branchId: setting.branchId,
            userId: 'system-cron',
          });

          result.branchesProcessed++;

          if (Result.isOk(importResult)) {
            const data = importResult.value;
            result.totalImported += data.processing?.imported || 0;
            result.totalDuplicates += data.processing?.duplicates || 0;

            logger.info('[AutoImportNfeJob] NFes importadas para filial', {
              branchName: branch.name,
              imported: data.processing?.imported || 0,
            });

            // Notificar importação bem-sucedida
            if (data.processing && data.processing.imported > 0) {
              await this.notificationService.notifyImportSuccess(
                setting.organizationId,
                setting.branchId,
                data.processing.imported,
                data.processing.duplicates || 0,
                0 // totalValue - TODO: calcular
              );
            }

            // Verificar se houve erro 656 (Consumo Indevido)
            if (data.message?.includes('656')) {
              await this.notificationService.notifySefazError656(setting.organizationId, setting.branchId);
            }
          } else {
            const errorMsg = importResult.error;
            logger.error('[AutoImportNfeJob] Erro na filial', { branchId: setting.branchId, error: errorMsg });

            result.totalErrors++;
            result.errors.push(`Filial ${setting.branchId}: ${errorMsg}`);

            // Notificar erro na importação
            await this.notificationService.notifyImportError(setting.organizationId, setting.branchId, errorMsg);
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
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('[AutoImportNfeJob] Erro na filial', { branchId: setting.branchId, error: errorMessage });

          result.totalErrors++;
          result.errors.push(`Filial ${setting.branchId}: ${errorMessage}`);

          // Notificar erro na importação
          await this.notificationService.notifyImportError(setting.organizationId, setting.branchId, errorMessage);
        }
      }

      logger.info('[AutoImportNfeJob] Importacao automatica concluida', {
        branchesProcessed: result.branchesProcessed,
        totalImported: result.totalImported,
        totalDuplicates: result.totalDuplicates,
        totalErrors: result.totalErrors,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[AutoImportNfeJob] Erro geral', { error: errorMessage });

      result.success = false;
      result.errors.push(errorMessage);
      return result;
    }
  }
}
