/**
 * Input Port: IAnalyzeFreightContractUseCase
 *
 * Interface para caso de uso de análise de contratos de frete.
 *
 * @module contracts/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E-Agent-Fase-D5
 */

import type { Result } from '@/shared/domain';
import type { FreightContractData } from '../../types';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Input para análise de contrato de frete.
 */
export interface AnalyzeFreightContractInput {
  /** Caminho do arquivo PDF */
  filePath: string;

  /** Nome original do arquivo */
  fileName: string;

  /** Opções de análise */
  options?: {
    /** Pular análise de risco */
    skipRiskAnalysis?: boolean;
    /** Incluir texto bruto na resposta */
    includeRawText?: boolean;
  };
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Output da análise de contrato.
 */
export interface AnalyzeFreightContractOutput {
  /** Contrato analisado */
  contract: FreightContractData;
  /** Texto bruto (se solicitado) */
  rawText?: string;
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de análise de contratos.
 */
export interface IAnalyzeFreightContractUseCase {
  /**
   * Analisa um contrato de frete.
   *
   * @param input - Dados de entrada
   * @returns Contrato analisado ou erro
   */
  execute(
    input: AnalyzeFreightContractInput
  ): Promise<Result<AnalyzeFreightContractOutput, string>>;
}
