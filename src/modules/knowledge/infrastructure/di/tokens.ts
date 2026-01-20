/**
 * Knowledge Module DI Tokens
 * Tokens locais para injeção de dependências do módulo Knowledge
 * 
 * @module knowledge/infrastructure/di
 */

export const KNOWLEDGE_TOKENS = {
  // Ports (Output)
  EmbeddingService: Symbol('Knowledge.EmbeddingService'),
  VectorStore: Symbol('Knowledge.VectorStore'),

  // Use Cases - Commands
  IndexDocumentUseCase: Symbol('Knowledge.IndexDocumentUseCase'),

  // Use Cases - Queries
  SearchLegislationUseCase: Symbol('Knowledge.SearchLegislationUseCase'),
} as const;
