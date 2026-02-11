/**
 * IndexDocumentUseCase - Application Command
 * 
 * Use case para indexação de documentos no knowledge base.
 * Divide documento em chunks e salva no vector store.
 * 
 * @module knowledge/application/commands
 * @see Phase D.3 - Integração com EmbeddingService
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DocumentChunker } from '../../../domain/services/DocumentChunker';
import type { IVectorStore } from '../../../domain/ports/output/IVectorStore';
import type { IEmbeddingService } from '../../../domain/ports/output/IEmbeddingService';
import type {
  IIndexDocumentUseCase,
  IndexDocumentInput,
  IndexDocumentOutput,
} from '../../../domain/ports/input';
import type { DocumentMetadata } from '../../../domain/types';

// Re-export input/output for consumers
export type { IndexDocumentInput, IndexDocumentOutput };

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Use Case para indexação de documentos
 *
 * Pode ser usado via DI ou instanciado diretamente:
 * - Via DI: container.resolve(IndexDocumentUseCase)
 * - Direto: new IndexDocumentUseCase(vectorStore, embeddingService?)
 *
 * @implements IIndexDocumentUseCase
 */
@injectable()
export class IndexDocumentUseCase implements IIndexDocumentUseCase {
  constructor(
    @inject(TOKENS.KnowledgeVectorStore) private readonly vectorStore: IVectorStore,
    @inject(TOKENS.KnowledgeEmbeddingService) private readonly embeddingService?: IEmbeddingService
  ) {}

  /**
   * Executa a indexação do documento
   */
  async execute(input: IndexDocumentInput): Promise<Result<IndexDocumentOutput, string>> {
    // 1. Obter conteúdo do documento
    const contentResult = await this.getContent(input);
    if (Result.isFail(contentResult)) {
      return Result.fail(contentResult.error);
    }
    const content = contentResult.value;

    // 2. Normalizar texto
    const normalizedContent = DocumentChunker.normalizeText(content);

    // 3. Gerar ID do documento
    const documentId = this.generateDocumentId(input.title, input.source);

    // 4. Verificar se documento já existe
    const exists = await this.vectorStore.documentExists(documentId);
    if (exists) {
      // Deletar versão anterior
      await this.vectorStore.deleteByDocumentId(documentId);
    }

    // 5. Salvar metadados do documento
    const metadata: DocumentMetadata = {
      id: documentId,
      title: input.title,
      type: input.type,
      legislationType: input.legislationType,
      source: input.source,
      version: input.version,
      effectiveDate: input.effectiveDate,
      tags: input.tags ?? [],
      organizationId: input.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saveResult = await this.vectorStore.saveDocument(metadata);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    // 6. Dividir em chunks
    const chunkResult = DocumentChunker.chunk(
      documentId,
      normalizedContent,
      input.chunkOptions
    );
    if (Result.isFail(chunkResult)) {
      return Result.fail(chunkResult.error);
    }

    const chunks = chunkResult.value;

    // 7. Adicionar metadados aos chunks (para filtros no ChromaDB)
    for (const chunk of chunks) {
      chunk.metadata = {
        ...chunk.metadata,
        title: input.title,
        documentType: input.type,
        legislationType: input.legislationType ?? '',
        source: input.source,
        tags: input.tags?.join(',') ?? '',
        organizationId: input.organizationId ?? 0,
        version: input.version ?? '1.0',
        effectiveDate: input.effectiveDate?.toISOString() ?? '',
        indexedAt: new Date().toISOString(),
      };
    }

    // 8. Gerar embeddings (se serviço disponível)
    if (this.embeddingService && chunks.length > 0) {
      const texts = chunks.map(c => c.content);
      const embeddingsResult = await this.embeddingService.generateEmbeddings(texts);
      
      if (Result.isOk(embeddingsResult)) {
        const embeddings = embeddingsResult.value;
        for (let i = 0; i < chunks.length; i++) {
          if (embeddings[i]) {
            chunks[i] = {
              ...chunks[i],
              embedding: embeddings[i],
            };
          }
        }
      }
      // Se embeddings falharem, continuar sem eles (busca por texto ainda funciona)
    }

    // 9. Salvar chunks no vector store
    const upsertResult = await this.vectorStore.upsert(chunks);
    if (Result.isFail(upsertResult)) {
      return Result.fail(upsertResult.error);
    }

    // 10. Retornar resultado
    return Result.ok({
      documentId,
      chunksCreated: chunks.length,
      totalCharacters: normalizedContent.length,
      estimatedTokens: DocumentChunker.estimateTokens(normalizedContent),
    });
  }

  /**
   * Obtém conteúdo do documento
   */
  private async getContent(input: IndexDocumentInput): Promise<Result<string, string>> {
    // Se conteúdo foi fornecido diretamente
    if (input.content) {
      if (input.content.trim().length === 0) {
        return Result.fail('Conteúdo do documento está vazio');
      }
      return Result.ok(input.content);
    }

    // Se caminho foi fornecido, ler arquivo
    if (input.filePath) {
      try {
        const fs = await import('node:fs/promises');
        const content = await fs.readFile(input.filePath, 'utf-8');
        
        if (content.trim().length === 0) {
          return Result.fail(`Arquivo está vazio: ${input.filePath}`);
        }
        
        return Result.ok(content);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Result.fail(`Erro ao ler arquivo: ${msg}`);
      }
    }

    return Result.fail('Nenhum conteúdo ou caminho de arquivo fornecido');
  }

  /**
   * Gera ID único para o documento
   */
  private generateDocumentId(title: string, source: string): string {
    // Criar slug do título
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);

    // Hash curto da source para unicidade
    const hash = this.simpleHash(source).toString(36).substring(0, 8);
    
    return `${slug}_${hash}`;
  }

  /**
   * Hash simples para strings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
