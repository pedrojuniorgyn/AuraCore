/**
 * Process Tax Credits Use Case
 * 
 * Processa créditos fiscais pendentes de PIS/COFINS
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 3/8 - tax-credit-engine.ts → ProcessTaxCreditsUseCase
 */

import { Result } from "@/shared/domain";
import { TaxCreditCalculator } from "@/modules/fiscal/domain/services/TaxCreditCalculator";
import type { ITaxCreditRepository } from '@/modules/fiscal/domain/ports/output/ITaxCreditRepository';
import { logger } from '@/shared/infrastructure/logging';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ProcessTaxCreditsRequest {
  organizationId: bigint;
  userId: string;
}

export interface ProcessTaxCreditsResponse {
  processed: number;
  totalCredit: number;
  errors: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USE CASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class ProcessTaxCreditsUseCase {
  constructor(
    private readonly calculator: TaxCreditCalculator,
    private readonly repository: ITaxCreditRepository
  ) {}

  async execute(
    request: ProcessTaxCreditsRequest
  ): Promise<Result<ProcessTaxCreditsResponse, Error>> {
    try {
      logger.info('Processando creditos fiscais pendentes');

      // 1. Buscar documentos pendentes
      const pendingDocsResult = await this.repository.getPendingDocuments(request.organizationId);

      if (Result.isFail(pendingDocsResult)) {
        return Result.fail(pendingDocsResult.error);
      }

      const pendingDocIds = pendingDocsResult.value;

      logger.info('Documentos pendentes encontrados', { count: pendingDocIds.length });

      let processed = 0;
      let totalCredit = 0;
      const errors: string[] = [];

      // 2. Processar cada documento
      for (const docId of pendingDocIds) {
        try {
          // 2.1. Buscar dados do documento
          const docDataResult = await this.repository.getFiscalDocumentData(
            docId,
            request.organizationId
          );

          if (Result.isFail(docDataResult)) {
            errors.push(`Documento ${docId}: ${docDataResult.error.message}`);
            continue;
          }

          if (!docDataResult.value) {
            errors.push(`Documento ${docId}: não encontrado`);
            continue;
          }

          // 2.2. Calcular crédito
          const creditResult = this.calculator.calculate(docDataResult.value);

          if (Result.isFail(creditResult)) {
            // Não é erro crítico - documento pode não ser elegível
            logger.warn('Documento nao elegivel para credito', { docId, reason: creditResult.error.message });
            continue;
          }

          const credit = creditResult.value;

          // ✅ S1.3-APP: hasCredit() retorna Result<boolean, string>
          const hasCreditResult = credit.hasCredit();
          if (Result.isFail(hasCreditResult) || !hasCreditResult.value) {
            logger.warn('Documento com credito zerado', { docId });
            continue;
          }

          // 2.3. Registrar crédito
          const registerResult = await this.repository.registerCredit(
            credit,
            request.userId,
            request.organizationId
          );

          if (Result.isFail(registerResult)) {
            errors.push(`Documento ${docId}: ${registerResult.error.message}`);
            continue;
          }

          processed++;
          
          // ✅ S1.3-APP: getTotalCredit() retorna Result<Money, string>
          const totalCreditResult = credit.getTotalCredit();
          if (Result.isFail(totalCreditResult)) {
            errors.push(`Documento ${docId}: Erro ao obter total crédito - ${totalCreditResult.error}`);
            continue;
          }
          
          totalCredit += totalCreditResult.value.amount;

          logger.info('Credito registrado para documento', { docId, amount: totalCreditResult.value.amount.toFixed(2) });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Documento ${docId}: ${errorMessage}`);
        }
      }

      logger.info('Resumo do processamento de creditos fiscais', {
        totalPendentes: pendingDocIds.length,
        processados: processed,
        creditoTotal: totalCredit.toFixed(2),
        erros: errors.length,
      });

      return Result.ok({
        processed,
        totalCredit,
        errors,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao processar créditos fiscais: ${errorMessage}`));
    }
  }
}

/**
 * Factory para criar use case
 */
/**
 * Factory para criar use case
 */
export function createProcessTaxCreditsUseCase(
  calculator: TaxCreditCalculator,
  repository: ITaxCreditRepository
): ProcessTaxCreditsUseCase {
  return new ProcessTaxCreditsUseCase(calculator, repository);
}

