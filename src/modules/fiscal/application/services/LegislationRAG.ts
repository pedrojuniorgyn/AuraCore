/**
 * LegislationRAG - Application Service
 *
 * Orquestrador do sistema RAG para consulta de legislação fiscal.
 *
 * NOTA: Este é um Application Service (não Domain Service) pois possui
 * dependências de infraestrutura via interfaces (ports).
 *
 * @module fiscal/application/services
 * @see E-Agent-Fase-D4
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IEmbedder } from '@/modules/fiscal/domain/ports/output/IEmbedder';
import type { IVectorStore } from '@/modules/fiscal/domain/ports/output/IVectorStore';
import type { IAnswerGenerator } from '@/modules/fiscal/domain/ports/output/IAnswerGenerator';
import type {
  DocumentChunk,
  RAGResponse,
  RAGConfig,
  SearchResult,
} from '@/modules/fiscal/domain/services/rag/types';
import { DEFAULT_RAG_CONFIG } from '@/modules/fiscal/domain/services/rag/types';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// ============================================================================
// APPLICATION SERVICE
// ============================================================================

/**
 * Orquestrador do sistema RAG.
 *
 * Coordena embedder, vector store e answer generator para:
 * 1. Indexar documentos de legislação
 * 2. Responder perguntas com base no conhecimento indexado
 */
@injectable()
export class LegislationRAG {
  private readonly config: RAGConfig;

  constructor(
    @inject(TOKENS.Embedder)
    private readonly embedder: IEmbedder,
    @inject(TOKENS.VectorStore)
    private readonly vectorStore: IVectorStore,
    @inject(TOKENS.AnswerGenerator)
    private readonly answerGenerator: IAnswerGenerator,
    config?: Partial<RAGConfig>
  ) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Indexa chunks de documento no vector store.
   *
   * @param chunks - Chunks a indexar (sem embedding)
   * @returns void ou erro
   */
  async indexChunks(chunks: DocumentChunk[]): Promise<Result<void, string>> {
    if (!chunks || chunks.length === 0) {
      return Result.fail('Nenhum chunk para indexar');
    }

    // 1. Gerar embeddings para cada chunk
    const texts = chunks.map((c) => c.content);
    const embeddingsResult = await this.embedder.embedBatch(texts);

    if (Result.isFail(embeddingsResult)) {
      return Result.fail(`Erro ao gerar embeddings: ${embeddingsResult.error}`);
    }

    // 2. Adicionar embeddings aos chunks
    const chunksWithEmbeddings: DocumentChunk[] = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddingsResult.value[i],
    }));

    // 3. Inserir no vector store
    const upsertResult = await this.vectorStore.upsert(chunksWithEmbeddings);

    if (Result.isFail(upsertResult)) {
      return Result.fail(`Erro ao indexar: ${upsertResult.error}`);
    }

    return Result.ok(undefined);
  }

  /**
   * Consulta a base de legislação.
   *
   * @param question - Pergunta em linguagem natural
   * @returns Resposta com citações ou erro
   */
  async query(question: string): Promise<Result<RAGResponse, string>> {
    const startTime = Date.now();

    // Validar input
    if (!question || question.trim().length === 0) {
      return Result.fail('Pergunta não pode ser vazia');
    }

    const trimmedQuestion = question.trim();

    // 1. Gerar embedding da pergunta
    const queryEmbeddingResult = await this.embedder.embed(trimmedQuestion);

    if (Result.isFail(queryEmbeddingResult)) {
      return Result.fail(`Erro ao processar pergunta: ${queryEmbeddingResult.error}`);
    }

    // 2. Buscar chunks relevantes
    const searchResult = await this.vectorStore.search(queryEmbeddingResult.value, {
      topK: this.config.topK,
      minScore: this.config.minScore,
    });

    if (Result.isFail(searchResult)) {
      return Result.fail(`Erro na busca: ${searchResult.error}`);
    }

    // 3. Se não encontrou resultados relevantes
    if (searchResult.value.length === 0) {
      return Result.ok({
        answer:
          'Não encontrei informações relevantes na base de legislação para responder esta pergunta. Tente reformular ou verificar se o documento relevante foi indexado.',
        citations: [],
        confidence: 0,
        processingTimeMs: Date.now() - startTime,
      });
    }

    // 4. Gerar resposta com contexto
    const chunks = searchResult.value.map((r) => r.chunk);
    const answerResult = await this.answerGenerator.generate(
      trimmedQuestion,
      chunks,
      {
        maxTokens: 2048,
        temperature: 0.3,
        language: 'pt-BR',
      }
    );

    if (Result.isFail(answerResult)) {
      return Result.fail(`Erro ao gerar resposta: ${answerResult.error}`);
    }

    // 5. Adicionar tempo de processamento
    return Result.ok({
      ...answerResult.value,
      processingTimeMs: Date.now() - startTime,
    });
  }

  /**
   * Remove documento do índice.
   *
   * @param documentId - ID do documento a remover
   * @returns void ou erro
   */
  async deleteDocument(documentId: string): Promise<Result<void, string>> {
    if (!documentId) {
      return Result.fail('documentId é obrigatório');
    }

    return this.vectorStore.deleteByDocumentId(documentId);
  }

  /**
   * Lista documentos indexados.
   *
   * @returns Lista de documentos ou erro
   */
  async listDocuments(): Promise<Result<{ id: string; title: string; chunksCount: number }[], string>> {
    const result = await this.vectorStore.listDocuments();

    if (Result.isFail(result)) {
      return result;
    }

    const simplified = result.value.map((doc) => ({
      id: doc.id,
      title: doc.title,
      chunksCount: doc.totalChunks,
    }));

    return Result.ok(simplified);
  }

  /**
   * Verifica saúde de todos os serviços.
   *
   * @returns Status de saúde ou erro
   */
  async healthCheck(): Promise<
    Result<{ embedder: boolean; vectorStore: boolean; answerGenerator: boolean }, string>
  > {
    const [embedderHealth, vectorStoreHealth, answerGeneratorHealth] = await Promise.all([
      this.embedder.healthCheck(),
      this.vectorStore.healthCheck(),
      this.answerGenerator.healthCheck(),
    ]);

    return Result.ok({
      embedder: Result.isOk(embedderHealth) && embedderHealth.value,
      vectorStore: Result.isOk(vectorStoreHealth) && vectorStoreHealth.value,
      answerGenerator: Result.isOk(answerGeneratorHealth) && answerGeneratorHealth.value,
    });
  }

  /**
   * Busca chunks sem gerar resposta (para debug/testing).
   *
   * @param question - Pergunta
   * @returns Chunks encontrados ou erro
   */
  async searchOnly(question: string): Promise<Result<SearchResult[], string>> {
    if (!question || question.trim().length === 0) {
      return Result.fail('Pergunta não pode ser vazia');
    }

    const queryEmbeddingResult = await this.embedder.embed(question.trim());

    if (Result.isFail(queryEmbeddingResult)) {
      return Result.fail(`Erro ao processar pergunta: ${queryEmbeddingResult.error}`);
    }

    return this.vectorStore.search(queryEmbeddingResult.value, {
      topK: this.config.topK,
      minScore: this.config.minScore,
    });
  }
}
