/**
 * Input Port: IIndexLegislationUseCase
 *
 * Interface para caso de uso de indexação de legislação.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E-Agent-Fase-D4
 */

import type { Result } from '@/shared/domain';
import type { LegislationCategory, IndexedDocument } from '../../services/rag/types';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Input para indexação de legislação.
 */
export interface IndexLegislationInput {
  /** Caminho do arquivo PDF */
  filePath: string;

  /** Título do documento (se não fornecido, usa nome do arquivo) */
  title?: string;

  /** Categoria da legislação (se não fornecida, tenta detectar) */
  category?: LegislationCategory;

  /** Opções de chunking */
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  };
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Output da indexação de legislação.
 */
export interface IndexLegislationOutput {
  /** Documento indexado */
  document: IndexedDocument;

  /** Estatísticas de processamento */
  stats: {
    /** Total de chunks gerados */
    totalChunks: number;
    /** Tempo de extração (Docling) em ms */
    extractionTimeMs: number;
    /** Tempo de chunking em ms */
    chunkingTimeMs: number;
    /** Tempo de embedding em ms */
    embeddingTimeMs: number;
    /** Tempo de indexação em ms */
    indexingTimeMs: number;
    /** Tempo total em ms */
    totalTimeMs: number;
  };
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de indexação de legislação.
 */
export interface IIndexLegislationUseCase {
  /**
   * Indexa um documento de legislação.
   *
   * @param input - Dados de entrada
   * @returns Documento indexado com estatísticas ou erro
   */
  execute(input: IndexLegislationInput): Promise<Result<IndexLegislationOutput, string>>;
}
