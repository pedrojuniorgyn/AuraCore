/**
 * DownloadNfesUseCase - Application Command
 *
 * Caso de uso para download de NFes da SEFAZ (DistribuicaoDFe).
 * Orquestra busca de configurações, consulta SEFAZ e processamento de documentos.
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E8 Fase 3: Use Cases Orquestradores
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  IDownloadNfesUseCase,
  DownloadNfesInput,
  DownloadNfesOutput,
} from '../../domain/ports/input/IDownloadNfesUseCase';

// Domain Services
import { SefazDocumentProcessor } from '../../domain/services';
import { createFiscalDocumentImportAdapter } from '../../infrastructure/adapters';

// Legacy service (TODO E8 Fase 4: Migrate to ISefazGateway)
// This service fetches certificate/NSU from database
import { createSefazService } from '@/services/sefaz-service';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para download de NFes da SEFAZ.
 *
 * Fluxo:
 * 1. Validar input
 * 2. Criar serviço SEFAZ (busca certificado do banco)
 * 3. Consultar DistribuicaoDFe
 * 4. Processar documentos recebidos
 * 5. Retornar resultado
 *
 * Regras:
 * - Filial deve ter certificado digital configurado
 * - Certificado deve estar válido (não expirado)
 * - Respeitar throttling da SEFAZ (erro 656)
 *
 * TODO (E8 Fase 4): Substituir serviços legacy por:
 *   - IBranchRepository para buscar certificado e NSU
 *   - ICertificateService para validar certificado
 *   - ISefazGateway.queryDistribuicaoDFe() para consulta
 */
@injectable()
export class DownloadNfesUseCase implements IDownloadNfesUseCase {
  async execute(input: DownloadNfesInput): Promise<Result<DownloadNfesOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      console.log(`🤖 [DownloadNfesUseCase] Iniciando download de NFes (Branch: ${input.branchId})...`);

      // 2. Criar serviço SEFAZ (legacy - busca certificado do banco)
      const sefazService = createSefazService(input.branchId, input.organizationId);

      // 3. Consultar DistribuicaoDFe
      const downloadResult = await sefazService.getDistribuicaoDFe();

      console.log(`📦 [DownloadNfesUseCase] Documentos recebidos: ${downloadResult.totalDocuments}`);

      // 4. Verificar se houve erro (ex: 656 - Consumo Indevido)
      if (downloadResult.error) {
        console.log(`⚠️ [DownloadNfesUseCase] Erro SEFAZ: ${downloadResult.error.code} - ${downloadResult.error.message}`);

        return Result.ok({
          totalDocuments: 0,
          maxNsu: downloadResult.maxNsu,
          processing: null,
          message: downloadResult.error.message,
        });
      }

      // 5. Se houver documentos, processar automaticamente
      let processResult = null;

      if (downloadResult.totalDocuments > 0) {
        console.log('🤖 [DownloadNfesUseCase] Iniciando processamento automático...');

        // Cria adapter de importação (DDD)
        const importAdapter = createFiscalDocumentImportAdapter(
          input.organizationId,
          input.branchId,
          input.userId
        );

        // Cria processor (Domain Service)
        const processor = new SefazDocumentProcessor(importAdapter);

        // Processa o XML da Sefaz
        const result = await processor.processResponse(downloadResult.xml);

        if (Result.isOk(result)) {
          processResult = result.value;
          console.log('✅ [DownloadNfesUseCase] Processamento concluído:', processResult);
        } else {
          console.error('❌ [DownloadNfesUseCase] Erro ao processar documentos:', result.error.message);
          // Continua e retorna os dados da consulta mesmo se o processamento falhar
        }
      }

      // 6. Retornar resultado
      const message = processResult
        ? `${processResult.imported} NFe(s) importada(s) automaticamente!`
        : downloadResult.totalDocuments === 0
          ? 'Nenhum documento novo disponível'
          : `${downloadResult.totalDocuments} documento(s) retornado(s) pela Sefaz`;

      return Result.ok({
        totalDocuments: downloadResult.totalDocuments,
        maxNsu: downloadResult.maxNsu,
        processing: processResult
          ? {
              imported: processResult.imported,
              duplicates: processResult.duplicates,
              errors: processResult.errors,
            }
          : null,
        message,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [DownloadNfesUseCase] Erro: ${errorMessage}`);

      // Verificar se é erro de certificado
      if (errorMessage.includes('Certificado')) {
        return Result.fail(`Certificado não configurado: ${errorMessage}`);
      }

      return Result.fail(`Erro ao consultar SEFAZ: ${errorMessage}`);
    }
  }

  private validateInput(input: DownloadNfesInput): Result<void, string> {
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail('organizationId inválido');
    }
    if (!input.branchId || input.branchId <= 0) {
      return Result.fail('branchId inválido');
    }
    if (!input.userId?.trim()) {
      return Result.fail('userId obrigatório');
    }
    return Result.ok(undefined);
  }
}
