/**
 * Input Port: IAnalyzeContractUseCase
 *
 * Interface para caso de uso de análise de contratos genéricos.
 * Recebe texto ou arquivo e retorna análise estruturada.
 *
 * @module contracts/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 */

import type { Result } from '@/shared/domain';
import type { ContractAnalysisResult, ParsedRiskLevel } from '../../types';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Input para análise de contrato.
 */
export interface AnalyzeContractInput {
  /** Caminho do arquivo (opcional se content fornecido) */
  filePath?: string;

  /** Conteúdo textual do contrato */
  content?: string;

  /** Nome do arquivo */
  fileName: string;

  /** ID da organização */
  organizationId: number;

  /** ID da filial */
  branchId: number;
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Output da análise de contrato.
 */
export interface AnalyzeContractOutput {
  /** Análise completa do contrato */
  analysis: ContractAnalysisResult;

  /** Resumo executivo */
  summary: {
    contractType: string;
    partiesCount: number;
    clausesCount: number;
    hasPaymentTerms: boolean;
    hasPricing: boolean;
    hasInsurance: boolean;
    riskLevel: ParsedRiskLevel;
    confidence: string;
  };
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de análise de contratos.
 */
export interface IAnalyzeContractUseCase {
  /**
   * Executa a análise do contrato.
   *
   * @param input - Dados de entrada (arquivo ou conteúdo textual)
   * @returns Análise estruturada e resumo executivo, ou erro
   */
  execute(
    input: AnalyzeContractInput
  ): Promise<Result<AnalyzeContractOutput, string>>;
}
