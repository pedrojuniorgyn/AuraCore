/**
 * Módulo DI Knowledge
 * Registra dependencies do módulo de gestão de conhecimento (RAG)
 * 
 * @module knowledge/infrastructure/di
 */
import { container } from 'tsyringe';
import { KNOWLEDGE_TOKENS } from './tokens';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Result } from '@/shared/domain';

// Infrastructure - Embeddings
import {
  GeminiEmbeddingService,
  OpenAIEmbeddingService,
  EmbeddingRouter,
} from '../embeddings';

// Infrastructure - Vector Store
import { ChromaVectorStore, JsonVectorStore } from '../vector-store';

// Application - Use Cases
import { IndexDocumentUseCase } from '../../application/commands/index-document';
import { SearchLegislationUseCase } from '../../application/queries/search-legislation';

// Domain - Ports
import type { IEmbeddingService } from '../../domain/ports/output/IEmbeddingService';
import type { IVectorStore } from '../../domain/ports/output/IVectorStore';

export function registerKnowledgeModule(): void {
  // ============================================================================
  // EMBEDDING SERVICE (Gemini + OpenAI Fallback)
  // ============================================================================
  
  const embeddingFactory = (): IEmbeddingService => {
    const geminiKey = process.env.GOOGLE_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const enableFallback = process.env.EMBEDDING_FALLBACK_ENABLED === 'true';

    // Nenhuma key configurada
    if (!geminiKey && !openaiKey) {
      console.warn('[Knowledge DI] Nenhuma API key de embedding configurada.');
      return {
        generateEmbeddings: async () => Result.fail('Nenhuma API key de embedding configurada'),
        generateEmbedding: async () => Result.fail('Nenhuma API key de embedding configurada'),
        getDimension: () => 768,
        getModelName: () => 'not-configured',
      } as IEmbeddingService;
    }

    // Criar services disponíveis
    const gemini = geminiKey
      ? new GeminiEmbeddingService({
          apiKey: geminiKey,
          model: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
          maxBatchSize: parseInt(process.env.GEMINI_BATCH_SIZE ?? '100', 10),
          cacheTTL: parseInt(process.env.GEMINI_CACHE_TTL ?? '3600', 10),
        })
      : null;

    const openai = openaiKey
      ? new OpenAIEmbeddingService({
          apiKey: openaiKey,
          model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
          maxBatchSize: parseInt(process.env.OPENAI_EMBEDDING_BATCH_SIZE ?? '100', 10),
        })
      : null;

    // Usar Gemini como primary (se disponível), OpenAI como fallback
    const primary = gemini ?? openai!;
    const fallback = gemini && openai && enableFallback ? openai : undefined;

    // Se fallback habilitado, usar router
    if (fallback) {
      console.log('[Knowledge DI] EmbeddingRouter: Gemini (primary) + OpenAI (fallback)');
      return new EmbeddingRouter({
        primary,
        fallback,
        maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES ?? '2', 10),
        retryDelayMs: parseInt(process.env.EMBEDDING_RETRY_DELAY_MS ?? '1000', 10),
      });
    }

    console.log(`[Knowledge DI] EmbeddingService: ${primary.getModelName()}`);
    return primary;
  };

  // Registrar com token local e global (compatibilidade)
  container.register<IEmbeddingService>(KNOWLEDGE_TOKENS.EmbeddingService, {
    useFactory: embeddingFactory,
  });
  container.register<IEmbeddingService>(TOKENS.KnowledgeEmbeddingService, {
    useFactory: embeddingFactory,
  });

  // ============================================================================
  // VECTOR STORE (ChromaDB ou JSON fallback)
  // ============================================================================
  
  const vectorStoreFactory = (): IVectorStore => {
    const useChroma = process.env.VECTOR_STORE_TYPE !== 'json';
    
    if (useChroma) {
      return new ChromaVectorStore({
        host: process.env.CHROMA_HOST ?? 'localhost',
        port: parseInt(process.env.CHROMA_PORT ?? '8001', 10),
        authToken: process.env.CHROMA_AUTH_TOKEN,
        collectionName: process.env.CHROMA_COLLECTION ?? 'auracore_knowledge',
      });
    }
    
    // Fallback para JSON (desenvolvimento sem Docker)
    return new JsonVectorStore(
      process.env.JSON_VECTOR_STORE_PATH ?? 'data/knowledge/vectors.json'
    );
  };

  // Registrar com token local e global (compatibilidade)
  container.register<IVectorStore>(KNOWLEDGE_TOKENS.VectorStore, {
    useFactory: vectorStoreFactory,
  });
  container.register<IVectorStore>(TOKENS.KnowledgeVectorStore, {
    useFactory: vectorStoreFactory,
  });

  // ============================================================================
  // USE CASES
  // ============================================================================
  
  // Commands
  container.register(KNOWLEDGE_TOKENS.IndexDocumentUseCase, {
    useClass: IndexDocumentUseCase,
  });
  container.register(TOKENS.IndexDocumentUseCase, {
    useClass: IndexDocumentUseCase,
  });

  // Queries
  container.register(KNOWLEDGE_TOKENS.SearchLegislationUseCase, {
    useClass: SearchLegislationUseCase,
  });
  container.register(TOKENS.SearchLegislationUseCase, {
    useClass: SearchLegislationUseCase,
  });

  console.log('[Knowledge Module] DI registrado: 2 services + 2 use cases');
}
