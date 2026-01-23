/**
 * Input Port: IImportDACTeUseCase
 *
 * Interface para o caso de uso de importação de DACTe PDF.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam interfaces de Input Ports
 * @see E-Agent-Fase-D3
 */

import type { Result } from '@/shared/domain';
import type { DACTeData } from '@/shared/domain';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Opções de importação de DACTe.
 */
export interface ImportDACTeOptions {
  /** Só valida, não importa (dry-run) */
  validateOnly?: boolean;

  /** Pula extração de documentos vinculados (mais rápido) */
  skipDocuments?: boolean;
}

/**
 * Input para importação de DACTe.
 */
export interface ImportDACTeInput {
  /** Caminho do arquivo PDF dentro do volume uploads/ */
  filePath: string;

  /** Opções de importação */
  options?: ImportDACTeOptions;
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Metadados da extração.
 */
export interface DACTeExtractionMetadata {
  /** Tempo de processamento do Docling em ms */
  processingTimeMs: number;

  /** Número de páginas do PDF */
  pageCount: number;

  /** Número de tabelas encontradas */
  tablesFound: number;

  /** Número de documentos vinculados extraídos */
  documentsFound: number;

  /** Confiança da extração (0-1) - para futuras melhorias */
  confidence?: number;
}

/**
 * Output da importação de DACTe.
 */
export interface ImportDACTeOutput {
  /** Dados estruturados do DACTe */
  dacte: DACTeData;

  /** Metadados da extração */
  extractionMetadata: DACTeExtractionMetadata;
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de importação de DACTe.
 */
export interface IImportDACTeUseCase {
  /**
   * Executa a importação de um DACTe PDF.
   *
   * @param input - Dados de entrada
   * @returns Dados estruturados do DACTe ou erro
   */
  execute(input: ImportDACTeInput): Promise<Result<ImportDACTeOutput, string>>;
}
