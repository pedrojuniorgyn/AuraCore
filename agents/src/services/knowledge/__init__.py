# agents/src/services/knowledge/__init__.py
"""
Serviço de knowledge base com RAG.

Módulo para Retrieval-Augmented Generation de legislação fiscal brasileira.

Componentes:
- EmbeddingService: Geração de embeddings (OpenAI/local)
- VectorStore: Armazenamento e busca (ChromaDB)
- RAGPipeline: Pipeline completo query → contexto
- DocumentIndexer: Indexação de documentos
"""

from .embedding_service import EmbeddingService, get_embedding_service, EmbeddingConfig
from .vector_store import VectorStore, get_vector_store, VectorStoreConfig, SearchResult
from .rag_pipeline import RAGPipeline, get_rag_pipeline, RAGConfig, RAGResult
from .document_indexer import (
    DocumentIndexer,
    DocumentMetadata,
    IndexingConfig,
    IndexingResult,
)

__all__ = [
    # Embedding Service
    "EmbeddingService",
    "get_embedding_service",
    "EmbeddingConfig",
    # Vector Store
    "VectorStore",
    "get_vector_store",
    "VectorStoreConfig",
    "SearchResult",
    # RAG Pipeline
    "RAGPipeline",
    "get_rag_pipeline",
    "RAGConfig",
    "RAGResult",
    # Document Indexer
    "DocumentIndexer",
    "DocumentMetadata",
    "IndexingConfig",
    "IndexingResult",
]
