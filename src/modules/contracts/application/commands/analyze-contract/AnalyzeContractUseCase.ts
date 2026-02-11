/**
 * AnalyzeContractUseCase - Application Command
 *
 * Use case para análise de contratos genéricos.
 * Recebe texto ou arquivo e retorna análise estruturada.
 *
 * @module contracts/application/commands
 * @implements IAnalyzeContractUseCase
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { ContractParser } from '../../../domain/services/ContractParser';
import type { ParsedRiskLevel } from '../../../domain/types';
import type {
  IAnalyzeContractUseCase,
  AnalyzeContractInput,
  AnalyzeContractOutput,
} from '../../../domain/ports/input';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Use Case para análise de contratos
 */
@injectable()
export class AnalyzeContractUseCase implements IAnalyzeContractUseCase {
  /**
   * Executa a análise do contrato
   */
  async execute(input: AnalyzeContractInput): Promise<Result<AnalyzeContractOutput, string>> {
    // 1. Validar input
    const trimmedFileName = input.fileName?.trim() ?? '';
    if (!trimmedFileName) {
      return Result.fail('Nome do arquivo é obrigatório');
    }

    // 2. Obter conteúdo
    let content = input.content;
    
    if (!content && input.filePath) {
      // Ler arquivo do sistema de arquivos
      try {
        const fs = await import('node:fs/promises');
        content = await fs.readFile(input.filePath, 'utf-8');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Result.fail(`Erro ao ler arquivo: ${msg}`);
      }
    }

    if (!content || content.trim().length === 0) {
      return Result.fail('Conteúdo do contrato não fornecido ou vazio');
    }

    // 3. Analisar contrato usando Domain Service
    const analysisResult = ContractParser.analyzeContract(content);
    
    if (Result.isFail(analysisResult)) {
      return Result.fail(analysisResult.error);
    }

    const analysis = analysisResult.value;

    // 4. Calcular nível de risco geral
    const highRisks = analysis.risks.filter(r => r.type === 'HIGH').length;
    const mediumRisks = analysis.risks.filter(r => r.type === 'MEDIUM').length;
    
    let riskLevel: ParsedRiskLevel = 'LOW';
    if (highRisks > 0) {
      riskLevel = 'HIGH';
    } else if (mediumRisks > 1) {
      riskLevel = 'MEDIUM';
    }

    // 5. Criar resumo executivo
    const summary = {
      contractType: analysis.contractType,
      partiesCount: analysis.parties.length,
      clausesCount: analysis.clauses.length,
      hasPaymentTerms: !!analysis.paymentTerms,
      hasPricing: (analysis.pricing?.length ?? 0) > 0,
      hasInsurance: !!analysis.insurance,
      riskLevel,
      confidence: `${Math.round(analysis.confidence * 100)}%`,
    };

    return Result.ok({
      analysis,
      summary,
    });
  }
}
