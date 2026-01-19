import 'reflect-metadata';
import { container, injectable, inject, singleton, autoInjectable, registry, delay } from 'tsyringe';
import { TOKENS } from './tokens';
import { CryptoUuidGenerator } from '../adapters/CryptoUuidGenerator';
import { DoclingClient } from '../docling';
import { ImportDANFeUseCase } from '@/modules/fiscal/application/commands/import-danfe';
import { ImportDACTeUseCase } from '@/modules/fiscal/application/commands/import-dacte';

// RAG Infrastructure (E-Agent-Fase-D4)
import { OpenAIEmbedder } from '@/modules/fiscal/infrastructure/rag/OpenAIEmbedder';
import { ChromaVectorStore } from '@/modules/fiscal/infrastructure/rag/ChromaVectorStore';
import { ClaudeAnswerGenerator } from '@/modules/fiscal/infrastructure/rag/ClaudeAnswerGenerator';
import { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';
import { IndexLegislationUseCase } from '@/modules/fiscal/application/commands/index-legislation';
import { QueryLegislationUseCase } from '@/modules/fiscal/application/queries/query-legislation';

// Strategic Module (E10)
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

// Registros globais
container.registerSingleton(TOKENS.UuidGenerator, CryptoUuidGenerator);

// Docling Integration (E-Agent-Fase-D1/D2/D3)
container.registerSingleton(TOKENS.DoclingClient, DoclingClient);
container.register(TOKENS.ImportDANFeUseCase, { useClass: ImportDANFeUseCase });
container.register(TOKENS.ImportDACTeUseCase, { useClass: ImportDACTeUseCase });

// RAG System (E-Agent-Fase-D4)
container.registerSingleton(TOKENS.Embedder, OpenAIEmbedder);
container.registerSingleton(TOKENS.VectorStore, ChromaVectorStore);
container.registerSingleton(TOKENS.AnswerGenerator, ClaudeAnswerGenerator);
container.register(TOKENS.LegislationRAG, { useClass: LegislationRAG });
container.register(TOKENS.IndexLegislationUseCase, { useClass: IndexLegislationUseCase });
container.register(TOKENS.QueryLegislationUseCase, { useClass: QueryLegislationUseCase });

// Contracts Module (E-Agent-Fase-D5)
import { AnalyzeFreightContractUseCase } from '@/modules/contracts/application/commands/analyze-freight-contract';
container.register(TOKENS.AnalyzeFreightContractUseCase, { useClass: AnalyzeFreightContractUseCase });

// Bank Statement Import (E-Agent-Fase-D6)
import { ImportBankStatementUseCase, type IBankTransactionRepository } from '@/modules/financial/application/commands/import-bank-statement';
import type { BankTransaction } from '@/modules/financial/domain/types';

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

// Strategic Module (E10)
registerStrategicModule();

// Re-exportar tudo do tsyringe após garantir que reflect-metadata foi carregado
export { container, injectable, inject, singleton, autoInjectable, registry, delay };

