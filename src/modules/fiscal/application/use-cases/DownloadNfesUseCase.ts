/**
 * DownloadNfesUseCase - Application Command
 *
 * Caso de uso para download de NFes da SEFAZ (DistribuicaoDFe).
 * Orquestra busca de configurações, consulta SEFAZ e processamento de documentos.
 *
 * E10 Fase 3: Migrado de sefaz-service.ts para usar ISefazGateway via DI
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E8 Fase 3: Use Cases Orquestradores
 */

import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { db } from '@/lib/db';
import { branches } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  IDownloadNfesUseCase,
  DownloadNfesInput,
  DownloadNfesOutput,
} from '../../domain/ports/input/IDownloadNfesUseCase';
import type { ISefazGateway } from '@/modules/integrations/domain/ports/output/ISefazGateway';

// Domain Services
import { SefazDocumentProcessor } from '../../domain/services';
import { createFiscalDocumentImportAdapter } from '../../infrastructure/adapters';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para download de NFes da SEFAZ.
 *
 * Fluxo:
 * 1. Validar input
 * 2. Buscar certificado digital do banco
 * 3. Consultar DistribuicaoDFe via ISefazGateway
 * 4. Atualizar NSU da filial
 * 5. Processar documentos recebidos
 * 6. Retornar resultado
 *
 * Regras:
 * - Filial deve ter certificado digital configurado
 * - Certificado deve estar válido (não expirado)
 * - Respeitar throttling da SEFAZ (erro 656)
 *
 * E10 Fase 3: Usa ISefazGateway via DI ao invés de sefaz-service legado
 */
@injectable()
export class DownloadNfesUseCase implements IDownloadNfesUseCase {
  constructor(
    @inject(TOKENS.SefazGateway)
    private readonly sefazGateway: ISefazGateway
  ) {}

  async execute(input: DownloadNfesInput): Promise<Result<DownloadNfesOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      console.log(`🤖 [DownloadNfesUseCase] Iniciando download de NFes (Branch: ${input.branchId})...`);

      // 2. Buscar certificado digital do banco
      const certificateResult = await this.getCertificate(input.branchId, input.organizationId);
      if (Result.isFail(certificateResult)) {
        return Result.fail(certificateResult.error);
      }

      const cert = certificateResult.value;
      console.log(`📜 Certificado carregado (${cert.pfx.length} bytes)`);
      console.log(`🔢 Último NSU processado: ${cert.lastNsu}`);
      console.log(`🌐 Ambiente: ${cert.environment}`);

      // 3. Consultar DistribuicaoDFe via Gateway
      const downloadResult = await this.sefazGateway.getDistribuicaoDFe({
        cnpj: cert.cnpj,
        lastNsu: cert.lastNsu,
        environment: cert.environment === 'PRODUCTION' ? 'production' : 'homologation',
        uf: cert.uf,
        certificate: {
          pfx: cert.pfx,
          password: cert.password,
        },
      });

      if (Result.isFail(downloadResult)) {
        return Result.fail(downloadResult.error);
      }

      const dfeResponse = downloadResult.value;
      console.log(`📦 [DownloadNfesUseCase] Documentos recebidos: ${dfeResponse.totalDocuments}`);

      // 4. Atualizar NSU da filial se necessário
      if (dfeResponse.maxNsu !== cert.lastNsu) {
        await db
          .update(branches)
          .set({
            lastNsu: dfeResponse.maxNsu,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(branches.id, input.branchId),
              eq(branches.organizationId, input.organizationId)
            )
          );
        console.log(`✅ NSU atualizado: ${cert.lastNsu} → ${dfeResponse.maxNsu}`);
      }

      // 5. Verificar se houve erro (ex: 656 - Consumo Indevido)
      if (dfeResponse.error) {
        console.log(`⚠️ [DownloadNfesUseCase] Erro SEFAZ: ${dfeResponse.error.code} - ${dfeResponse.error.message}`);

        return Result.ok({
          totalDocuments: 0,
          maxNsu: dfeResponse.maxNsu,
          processing: null,
          message: dfeResponse.error.message,
        });
      }

      // 6. Se houver documentos, processar automaticamente
      let processResult = null;

      if (dfeResponse.totalDocuments > 0) {
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
        const result = await processor.processResponse(dfeResponse.xml);

        if (Result.isOk(result)) {
          processResult = result.value;
          console.log('✅ [DownloadNfesUseCase] Processamento concluído:', processResult);
        } else {
          console.error('❌ [DownloadNfesUseCase] Erro ao processar documentos:', result.error.message);
          // Continua e retorna os dados da consulta mesmo se o processamento falhar
        }
      }

      // 7. Retornar resultado
      const message = processResult
        ? `${processResult.imported} NFe(s) importada(s) automaticamente!`
        : dfeResponse.totalDocuments === 0
          ? 'Nenhum documento novo disponível'
          : `${dfeResponse.totalDocuments} documento(s) retornado(s) pela Sefaz`;

      return Result.ok({
        totalDocuments: dfeResponse.totalDocuments,
        maxNsu: dfeResponse.maxNsu,
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

  /**
   * Busca o certificado digital da filial no banco
   * E10 Fase 3: Migrado de sefaz-service.ts SefazService.getCertificate()
   */
  private async getCertificate(
    branchId: number,
    organizationId: number
  ): Promise<
    Result<
      {
        pfx: Buffer;
        password: string;
        lastNsu: string;
        environment: string;
        cnpj: string;
        uf: string;
      },
      string
    >
  > {
    const [branch] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.organizationId, organizationId), isNull(branches.deletedAt)));

    if (!branch) {
      return Result.fail('Filial não encontrada');
    }

    if (!branch.certificatePfx || !branch.certificatePassword) {
      return Result.fail('Certificado digital não configurado para esta filial. Faça o upload do .pfx primeiro.');
    }

    // Converte Base64 de volta para Buffer
    const pfxBuffer = Buffer.from(branch.certificatePfx, 'base64');

    return Result.ok({
      pfx: pfxBuffer,
      password: branch.certificatePassword,
      lastNsu: branch.lastNsu || '0',
      environment: branch.environment || 'HOMOLOGATION',
      cnpj: branch.document.replace(/\D/g, ''),
      uf: branch.state || 'GO',
    });
  }
}
