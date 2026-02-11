/**
 * Input Port: IIndexDocumentUseCase
 *
 * Interface para caso de uso de indexação de documentos no knowledge base.
 * Divide documento em chunks e salva no vector store.
 *
 * @module knowledge/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 */

import type { Result } from '@/shared/domain';
import type { DocumentType, LegislationType, ChunkOptions } from '../../types';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Input para indexação de documentos.
 */
export interface IndexDocumentInput {
  /** Caminho do arquivo (opcional se content fornecido) */
  filePath?: string;

  /** Conteúdo do documento (opcional se filePath fornecido) */
  content?: string;

  /** Título do documento */
  title: string;

  /** Tipo de documento */
  type: DocumentType;

  /** Tipo de legislação (se aplicável) */
  legislationType?: LegislationType;

  /** Fonte/origem do documento */
  source: string;

  /** Versão do documento */
  version?: string;

  /** Data de vigência */
  effectiveDate?: Date;

  /** Tags para busca */
  tags?: string[];

  /** ID da organização (null = documento global) */
  organizationId?: number;

  /** Opções de chunking */
  chunkOptions?: ChunkOptions;
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Output da indexação de documentos.
 */
export interface IndexDocumentOutput {
  /** ID do documento indexado */
  documentId: string;

  /** Número de chunks criados */
  chunksCreated: number;

  /** Tamanho total do documento em caracteres */
  totalCharacters: number;

  /** Tokens estimados */
  estimatedTokens: number;
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de indexação de documentos.
 */
export interface IIndexDocumentUseCase {
  /**
   * Indexa um documento no knowledge base.
   *
   * @param input - Dados de entrada
   * @returns Resultado com ID do documento e estatísticas de indexação
   */
  execute(input: IndexDocumentInput): Promise<Result<IndexDocumentOutput, string>>;
}
