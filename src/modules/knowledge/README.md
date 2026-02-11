# Knowledge Module

## Overview
RAG (Retrieval-Augmented Generation) system for legislation search. Indexes documents into vector store and enables semantic search with AI-generated answers.

## Architecture
```
knowledge/
├── domain/
│   ├── ports/
│   │   ├── input/          # Use case interfaces
│   │   │   ├── IIndexDocumentUseCase.ts
│   │   │   └── ISearchLegislationUseCase.ts
│   │   └── output/         # Gateway interfaces
│   │       ├── IEmbeddingService.ts
│   │       └── IVectorStore.ts
│   ├── services/           # Domain services
│   │   ├── DocumentChunker.ts
│   │   └── LegislationSearchService.ts
│   └── types/
│       └── knowledge.types.ts
├── application/
│   ├── commands/
│   │   └── index-document/
│   └── queries/
│       └── search-legislation/
└── infrastructure/
    ├── di/
    │   ├── KnowledgeModule.ts
    │   └── tokens.ts
    ├── embeddings/         # Embedding service adapters
    │   ├── EmbeddingRouter.ts
    │   ├── GeminiEmbeddingService.ts
    │   └── OpenAIEmbeddingService.ts
    └── vector-store/       # Vector store adapters
        ├── ChromaVectorStore.ts
        └── JsonVectorStore.ts
```

## DDD Patterns
- **Input Ports**: IIndexDocumentUseCase, ISearchLegislationUseCase
- **Output Ports**: IEmbeddingService, IVectorStore
- **Adapters**: Gemini/OpenAI embeddings, Chroma/JSON vector stores
- **Result Pattern**: All use cases return Result<Output, string>

## Dependencies
- ChromaDB (vector storage)
- OpenAI/Gemini (embeddings)
- Claude (answer generation)

## Status: E-Agent-Fase-D1/D2/D3 (Complete)
