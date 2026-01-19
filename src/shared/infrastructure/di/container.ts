import 'reflect-metadata';
import { container, injectable, inject, singleton, autoInjectable, registry, delay } from 'tsyringe';
import { TOKENS } from './tokens';
import { Result } from '@/shared/domain';
import { CryptoUuidGenerator } from '../adapters/CryptoUuidGenerator';
import { DoclingClient } from '../docling';
import { ImportDANFeUseCase } from '@/modules/fiscal/application/commands/import-danfe';
import { ImportDACTeUseCase } from '@/modules/fiscal/application/commands/import-dacte';

// RAG Infrastructure (E-Agent-Fase-D4) - Legacy
import { OpenAIEmbedder } from '@/modules/fiscal/infrastructure/rag/OpenAIEmbedder';
import { ChromaVectorStore as LegacyChromaVectorStore } from '@/modules/fiscal/infrastructure/rag/ChromaVectorStore';
import { ClaudeAnswerGenerator } from '@/modules/fiscal/infrastructure/rag/ClaudeAnswerGenerator';
import { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';
import { IndexLegislationUseCase } from '@/modules/fiscal/application/commands/index-legislation';
import { QueryLegislationUseCase } from '@/modules/fiscal/application/queries/query-legislation';

// Knowledge Module (E-Agent-Fase-D1/D2/D3)
import { GeminiEmbeddingService } from '@/modules/knowledge/infrastructure/embeddings';
import { ChromaVectorStore, JsonVectorStore } from '@/modules/knowledge/infrastructure/vector-store';
import { IndexDocumentUseCase } from '@/modules/knowledge/application/commands/index-document';
import { SearchLegislationUseCase } from '@/modules/knowledge/application/queries/search-legislation';
import type { IEmbeddingService } from '@/modules/knowledge/domain/ports/output/IEmbeddingService';
import type { IVectorStore } from '@/modules/knowledge/domain/ports/output/IVectorStore';

// Strategic Module (E10)
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

// Contracts Module (E-Agent-Fase-D5)
import { AnalyzeFreightContractUseCase } from '@/modules/contracts/application/commands/analyze-freight-contract';

// Bank Statement Import (E-Agent-Fase-D6)
import { ImportBankStatementUseCase, type IBankTransactionRepository } from '@/modules/financial/application/commands/import-bank-statement';
import type { BankTransaction } from '@/modules/financial/domain/types';

// ============================================================================
// REGISTROS GLOBAIS
// ============================================================================

container.registerSingleton(TOKENS.UuidGenerator, CryptoUuidGenerator);

// ============================================================================
// DOCLING INTEGRATION (E-Agent-Fase-D1/D2/D3)
// ============================================================================

container.registerSingleton(TOKENS.DoclingClient, DoclingClient);
container.register(TOKENS.ImportDANFeUseCase, { useClass: ImportDANFeUseCase });
container.register(TOKENS.ImportDACTeUseCase, { useClass: ImportDACTeUseCase });

// ============================================================================
// RAG SYSTEM LEGACY (E-Agent-Fase-D4)
// ============================================================================

container.registerSingleton(TOKENS.Embedder, OpenAIEmbedder);
container.registerSingleton(TOKENS.VectorStore, LegacyChromaVectorStore);
container.registerSingleton(TOKENS.AnswerGenerator, ClaudeAnswerGenerator);
container.register(TOKENS.LegislationRAG, { useClass: LegislationRAG });
container.register(TOKENS.IndexLegislationUseCase, { useClass: IndexLegislationUseCase });
container.register(TOKENS.QueryLegislationUseCase, { useClass: QueryLegislationUseCase });

// ============================================================================
// KNOWLEDGE MODULE (E-Agent-Fase-D1/D2/D3)
// ============================================================================

// Embedding Service (Gemini) - Phase D.1
container.register<IEmbeddingService>(TOKENS.KnowledgeEmbeddingService, {
  useFactory: () => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.warn('[DI] GOOGLE_AI_API_KEY não configurada. Embedding service retornará erro.');
      // Mock que falha graciosamente
      return {
        generateEmbeddings: async () => Result.fail('GOOGLE_AI_API_KEY não configurada'),
        generateEmbedding: async () => Result.fail('GOOGLE_AI_API_KEY não configurada'),
        getDimension: () => 768,
        getModelName: () => 'not-configured',
      } as IEmbeddingService;
    }
    return new GeminiEmbeddingService({
      apiKey,
      model: process.env.GEMINI_EMBEDDING_MODEL ?? 'embedding-004',
      maxBatchSize: parseInt(process.env.GEMINI_BATCH_SIZE ?? '100', 10),
      cacheTTL: parseInt(process.env.GEMINI_CACHE_TTL ?? '3600', 10),
    });
  },
});

// Vector Store (ChromaDB ou JSON fallback) - Phase D.2
container.register<IVectorStore>(TOKENS.KnowledgeVectorStore, {
  useFactory: () => {
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
  },
});

// Use Cases - Phase D.3 (usando @injectable/@inject)
container.register(TOKENS.IndexDocumentUseCase, { useClass: IndexDocumentUseCase });
container.register(TOKENS.SearchLegislationUseCase, { useClass: SearchLegislationUseCase });

// ============================================================================
// CONTRACTS MODULE (E-Agent-Fase-D5)
// ============================================================================

container.register(TOKENS.AnalyzeFreightContractUseCase, { useClass: AnalyzeFreightContractUseCase });

// ============================================================================
// BANK STATEMENT IMPORT (E-Agent-Fase-D6)
// ============================================================================

// Stub Repository for Bank Transactions (to be replaced with real implementation)
class StubBankTransactionRepository implements IBankTransactionRepository {
  async findByFitId(): Promise<BankTransaction | null> {
    return null;
  }
  async findByAccountId(): Promise<BankTransaction[]> {
    return [];
  }
  async save(): Promise<void> {
    // No-op
  }
  async saveBatch(): Promise<{ saved: number; failed: number }> {
    return { saved: 0, failed: 0 };
  }
  async updateCategory(): Promise<void> {
    // No-op
  }
}

container.register(TOKENS.BankTransactionRepository, { useClass: StubBankTransactionRepository });
container.register(TOKENS.ImportBankStatementUseCase, { useClass: ImportBankStatementUseCase });

// ============================================================================
// STRATEGIC MODULE (E10)
// ============================================================================

registerStrategicModule();

// ============================================================================
// EXPORT
// ============================================================================

export { container, injectable, inject, singleton, autoInjectable, registry, delay };
