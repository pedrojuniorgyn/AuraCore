/**
 * IndexLegislationUseCase - Application Command
 *
 * Caso de uso para indexação de documentos de legislação no sistema RAG.
 *
 * @module fiscal/application/commands/index-legislation
 * @see USE-CASE-001 a USE-CASE-015
 * @see E-Agent-Fase-D4
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IIndexLegislationUseCase,
  IndexLegislationInput,
  IndexLegislationOutput,
} from '@/modules/fiscal/domain/ports/input/IIndexLegislationUseCase';
import { DocumentChunker } from '@/modules/fiscal/domain/services/rag/DocumentChunker';
import type { IndexedDocument } from '@/modules/fiscal/domain/services/rag/types';
import type { DoclingClient } from '@/shared/infrastructure/docling';
import type { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para indexação de legislação.
 *
 * Fluxo:
 * 1. Processar PDF com Docling
 * 2. Dividir em chunks com DocumentChunker
 * 3. Indexar no vector store com LegislationRAG
 */
@injectable()
export class IndexLegislationUseCase implements IIndexLegislationUseCase {
  constructor(
    @inject(TOKENS.DoclingClient)
    private readonly doclingClient: DoclingClient,
    @inject(TOKENS.LegislationRAG)
    private readonly legislationRAG: LegislationRAG
  ) {}

  /**
   * Executa a indexação de um documento de legislação.
   */
  async execute(
    input: IndexLegislationInput
  ): Promise<Result<IndexLegislationOutput, string>> {
    const startTime = Date.now();

    // 1. Validar input
    const validationResult = this.validateInput(input);
    if (Result.isFail(validationResult)) {
      return validationResult;
    }

    // 2. Processar PDF com Docling
    const extractionStart = Date.now();
    const extractionResult = await this.doclingClient.processDocument(input.filePath);

    if (Result.isFail(extractionResult)) {
      return Result.fail(`Erro ao processar PDF: ${extractionResult.error}`);
    }

    const extraction = extractionResult.value;
    const extractionTimeMs = Date.now() - extractionStart;

    // 3. Determinar título e categoria
    const title = input.title ?? this.extractTitleFromPath(input.filePath);
    const category =
      input.category ?? DocumentChunker.detectCategory(extraction.text);

    // 4. Gerar ID único do documento
    const documentId = this.generateDocumentId(title);

    // 5. Dividir em chunks
    const chunkingStart = Date.now();
    const chunkResult = DocumentChunker.chunkDocument(
      extraction,
      documentId,
      title,
      category,
      {
        chunkSize: input.options?.chunkSize,
        chunkOverlap: input.options?.chunkOverlap,
      }
    );

    if (Result.isFail(chunkResult)) {
      return Result.fail(`Erro no chunking: ${chunkResult.error}`);
    }

    const chunks = chunkResult.value;
    const chunkingTimeMs = Date.now() - chunkingStart;

    // 6. Indexar no vector store (embedding + upsert)
    const indexingStart = Date.now();
    const indexResult = await this.legislationRAG.indexChunks(chunks);

    if (Result.isFail(indexResult)) {
      return Result.fail(`Erro na indexação: ${indexResult.error}`);
    }

    const indexingTimeMs = Date.now() - indexingStart;

    // 7. Construir documento indexado
    const document: IndexedDocument = {
      id: documentId,
      title,
      fileName: input.filePath,
      category,
      totalChunks: chunks.length,
      indexedAt: new Date(),
      metadata: {
        pageCount: extraction.metadata.pageCount,
        fileSize: extraction.metadata.fileSize,
        processingTimeMs: extraction.processingTimeMs,
      },
    };

    // 8. Retornar resultado
    return Result.ok({
      document,
      stats: {
        totalChunks: chunks.length,
        extractionTimeMs,
        chunkingTimeMs,
        embeddingTimeMs: Math.floor(indexingTimeMs * 0.7), // Estimativa
        indexingTimeMs: Math.floor(indexingTimeMs * 0.3), // Estimativa
        totalTimeMs: Date.now() - startTime,
      },
    });
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Valida input do caso de uso.
   */
  private validateInput(
    input: IndexLegislationInput
  ): Result<void, string> {
    if (!input) {
      return Result.fail('Input é obrigatório');
    }

    if (!input.filePath) {
      return Result.fail('filePath é obrigatório');
    }

    if (!input.filePath.toLowerCase().endsWith('.pdf')) {
      return Result.fail('Arquivo deve ser um PDF');
    }

    // Prevenir path traversal
    if (input.filePath.includes('..') || input.filePath.startsWith('/')) {
      return Result.fail('Caminho do arquivo inválido');
    }

    return Result.ok(undefined);
  }

  /**
   * Extrai título do nome do arquivo.
   */
  private extractTitleFromPath(filePath: string): string {
    // Pegar nome do arquivo
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];

    // Remover extensão
    const name = fileName.replace(/\.pdf$/i, '');

    // Limpar underscores e hifens
    return name.replace(/[-_]+/g, ' ').trim();
  }

  /**
   * Gera ID único para o documento.
   */
  private generateDocumentId(title: string): string {
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const timestamp = Date.now().toString(36);
    return `${slug}-${timestamp}`;
  }
}
