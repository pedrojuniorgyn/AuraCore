import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from './tokens';
import { CryptoUuidGenerator } from '../adapters/CryptoUuidGenerator';
import { PinoLogger } from '../logging/PinoLogger';
import { DoclingClient } from '../docling';
import { DrizzleUnitOfWork } from '../persistence/DrizzleUnitOfWork';
import { InMemoryEventPublisher } from '../events/InMemoryEventPublisher';
import { DrizzleAuditLogger } from '../audit/DrizzleAuditLogger';
import { DrizzleDepartmentRepository } from '../persistence/repositories/DrizzleDepartmentRepository';
import { DrizzleOutboxRepository } from '../events/outbox/DrizzleOutboxRepository';
import { OutboxProcessor } from '../events/outbox/OutboxProcessor';
import { ImportDANFeUseCase } from '@/modules/fiscal/application/commands/import-danfe';
import { ImportDACTeUseCase } from '@/modules/fiscal/application/commands/import-dacte';

// RAG Infrastructure (E-Agent-Fase-D4) - Legacy
import { OpenAIEmbedder } from '@/modules/fiscal/infrastructure/rag/OpenAIEmbedder';
import { ChromaVectorStore as LegacyChromaVectorStore } from '@/modules/fiscal/infrastructure/rag/ChromaVectorStore';
import { ClaudeAnswerGenerator } from '@/modules/fiscal/infrastructure/rag/ClaudeAnswerGenerator';
import { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';
import { IndexLegislationUseCase } from '@/modules/fiscal/application/commands/index-legislation';
import { QueryLegislationUseCase } from '@/modules/fiscal/application/queries/query-legislation';

// Bank Statement Import (E-Agent-Fase-D6)
import { ImportBankStatementUseCase, type IBankTransactionRepository } from '@/modules/financial/application/commands/import-bank-statement';
import type { BankTransaction } from '@/modules/financial/domain/types';

// Notification Service (FASE7-06)
import { NotificationService } from '@/shared/infrastructure/notifications/NotificationService';

// Cache & In-App Notification Adapters (E15.3 - Legacy → DDD)
import { CacheServiceAdapter } from '@/shared/infrastructure/cache/CacheServiceAdapter';
import { InAppNotificationAdapter } from '@/shared/infrastructure/notifications/InAppNotificationAdapter';

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

export function registerGlobalDependencies() {
  // ============================================================================
  // REGISTROS GLOBAIS
  // ============================================================================

  container.registerSingleton(TOKENS.UuidGenerator, CryptoUuidGenerator);
  container.registerSingleton(TOKENS.Logger, PinoLogger);
  container.registerSingleton(TOKENS.UnitOfWork, DrizzleUnitOfWork);
  container.registerSingleton(TOKENS.EventPublisher, InMemoryEventPublisher);
  container.registerSingleton(TOKENS.AuditLogger, DrizzleAuditLogger);
  container.registerSingleton(TOKENS.DepartmentRepository, DrizzleDepartmentRepository);

  // Transactional Outbox (reliable event publishing)
  container.registerSingleton(TOKENS.OutboxRepository, DrizzleOutboxRepository);
  container.registerSingleton(TOKENS.OutboxProcessor, OutboxProcessor);

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
  // BANK STATEMENT IMPORT (E-Agent-Fase-D6)
  // ============================================================================

  container.register(TOKENS.BankTransactionRepository, { useClass: StubBankTransactionRepository });
  container.register(TOKENS.ImportBankStatementUseCase, { useClass: ImportBankStatementUseCase });

  // ============================================================================
  // NOTIFICATION SYSTEM (FASE7-06)
  // ============================================================================
  
  // IMPORTANTE: NotificationService DEVE ser registrado em global-registrations
  // ANTES de módulos que dependem dele (Strategic, etc).
  // 
  // Ordem de registro (instrumentation.ts):
  // 1. registerGlobalDependencies() ← NotificationService registrado aqui
  // 2. registerStrategicModule()    ← AlertService injeta NotificationService
  //
  // Se registrado dentro do Strategic module, pode causar:
  // - Duplicate registration errors
  // - Timing issues (resolved before registered)
  // - Module isolation problems
  //
  // Solução: Manter como singleton global compartilhado entre módulos
  container.registerSingleton(NotificationService);

  // ============================================================================
  // CACHE & IN-APP NOTIFICATIONS (E15.3 - Legacy Service → DDD Ports+Adapters)
  // ============================================================================

  container.registerSingleton(TOKENS.CacheService, CacheServiceAdapter);
  container.registerSingleton(TOKENS.InAppNotificationService, InAppNotificationAdapter);
}
