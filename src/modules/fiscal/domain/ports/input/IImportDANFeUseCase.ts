/**
 * Input Port: IImportDANFeUseCase
 *
 * Interface para o caso de uso de importação de DANFe PDF.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam interfaces de Input Ports
 * @see E-Agent-Fase-D2
 */

import type { Result } from '@/shared/domain';
import type { DANFeData } from '@/shared/infrastructure/docling';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Opções de importação de DANFe.
 */
export interface ImportDANFeOptions {
  /** Só valida, não importa (dry-run) */
  validateOnly?: boolean;

  /** Pula extração de produtos (mais rápido para validação de chave) */
  skipProducts?: boolean;
}

/**
 * Input para importação de DANFe.
 */
export interface ImportDANFeInput {
  /** Caminho do arquivo PDF dentro do volume uploads/ */
  filePath: string;

  /** Opções de importação */
  options?: ImportDANFeOptions;
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Metadados da extração.
 */
export interface ExtractionMetadata {
  /** Tempo de processamento do Docling em ms */
  processingTimeMs: number;

  /** Número de páginas do PDF */
  pageCount: number;

  /** Número de tabelas encontradas */
  tablesFound: number;

  /** Confiança da extração (0-1) - para futuras melhorias */
  confidence?: number;
}

/**
 * Output da importação de DANFe.
 */
export interface ImportDANFeOutput {
  /** Dados estruturados do DANFe */
  danfe: DANFeData;

  /** Metadados da extração */
  extractionMetadata: ExtractionMetadata;
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de importação de DANFe.
 */
export interface IImportDANFeUseCase {
  /**
   * Executa a importação de um DANFe PDF.
   *
   * @param input - Dados de entrada
   * @returns Dados estruturados do DANFe ou erro
   */
  execute(input: ImportDANFeInput): Promise<Result<ImportDANFeOutput, string>>;
}
