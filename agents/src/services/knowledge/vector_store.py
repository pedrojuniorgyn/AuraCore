# agents/src/services/knowledge/vector_store.py
"""
Vector Store para armazenamento e busca de embeddings.

Usa ChromaDB como backend.
"""

import os
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import structlog

from src.config import get_settings

logger = structlog.get_logger()

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    chromadb = None  # type: ignore
    ChromaSettings = None  # type: ignore
    logger.warning("ChromaDB não instalado: pip install chromadb")


@dataclass
class VectorStoreConfig:
    """Configuração do vector store."""
    collection_name: str = "auracore_knowledge"
    host: str = "localhost"
    port: int = 8000
    persist_directory: Optional[str] = None  # Para modo local


@dataclass
class SearchResult:
    """Resultado de busca."""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float  # Similarity score (0-1, maior = mais similar)


class VectorStore:
    """
    Vector Store usando ChromaDB.
    
    Uso:
        store = VectorStore()
        
        # Adicionar documentos
        await store.add_documents(
            ids=["doc1", "doc2"],
            contents=["texto 1", "texto 2"],
            embeddings=[[0.1, 0.2, ...], [0.3, 0.4, ...]],
            metadatas=[{"type": "law"}, {"type": "manual"}]
        )
        
        # Buscar
        results = await store.search(
            query_embedding=[0.1, 0.2, ...],
            top_k=5
        )
    """
    
    def __init__(self, config: Optional[VectorStoreConfig] = None):
        self.config = config or VectorStoreConfig()
        self._client: Optional[Any] = None
        self._collection: Optional[Any] = None
        
        # Usar configuração do settings se disponível
        settings = get_settings()
        if not config:
            self.config.host = settings.chroma_host
            self.config.port = settings.chroma_port
            self.config.collection_name = settings.chroma_collection
        
        logger.info(
            "vector_store_initialized",
            collection=self.config.collection_name,
            available=CHROMA_AVAILABLE
        )
    
    def _get_client(self) -> Any:
        """Retorna cliente ChromaDB."""
        if not CHROMA_AVAILABLE:
            raise RuntimeError("ChromaDB não instalado")
        
        if self._client is None:
            # Tentar conectar ao servidor
            chroma_host = os.getenv("CHROMA_HOST", self.config.host)
            chroma_port = int(os.getenv("CHROMA_PORT", str(self.config.port)))
            
            try:
                self._client = chromadb.HttpClient(
                    host=chroma_host,
                    port=chroma_port
                )
                # Testar conexão
                self._client.heartbeat()
                logger.info("chroma_connected", host=chroma_host, port=chroma_port)
            except Exception as e:
                logger.warning(
                    "chroma_server_unavailable",
                    error=str(e),
                    fallback="persistent_local"
                )
                # Fallback para modo persistente local
                persist_dir = self.config.persist_directory or "/app/data/chroma"
                os.makedirs(persist_dir, exist_ok=True)
                self._client = chromadb.PersistentClient(path=persist_dir)
        
        return self._client
    
    def _get_collection(self) -> Any:
        """Retorna collection."""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.config.collection_name,
                metadata={"hnsw:space": "cosine"}  # Usar distância cosine
            )
        return self._collection
    
    async def add_documents(
        self,
        ids: List[str],
        contents: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """
        Adiciona documentos ao vector store.
        
        Args:
            ids: IDs únicos dos documentos
            contents: Conteúdos textuais
            embeddings: Vetores de embedding
            metadatas: Metadados opcionais
        """
        if not ids:
            return
        
        logger.info("adding_documents", count=len(ids))
        
        collection = self._get_collection()
        
        # ChromaDB espera metadatas não-nulos
        if metadatas is None:
            metadatas = [{} for _ in ids]
        
        # Filtrar valores None dos metadatas (ChromaDB não aceita None)
        cleaned_metadatas = []
        for meta in metadatas:
            cleaned = {k: v for k, v in meta.items() if v is not None}
            cleaned_metadatas.append(cleaned)
        
        collection.upsert(
            ids=ids,
            documents=contents,
            embeddings=embeddings,
            metadatas=cleaned_metadatas
        )
        
        logger.info("documents_added", count=len(ids))
    
    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """
        Busca documentos similares.
        
        Args:
            query_embedding: Vetor de embedding da query
            top_k: Número de resultados
            filter_metadata: Filtro opcional de metadados
            
        Returns:
            Lista de SearchResult ordenados por similaridade
        """
        collection = self._get_collection()
        
        # Construir filtro
        where = filter_metadata if filter_metadata else None
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"]
        )
        
        # Converter para SearchResult
        search_results: List[SearchResult] = []
        
        if results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                # ChromaDB retorna distância, converter para similaridade
                distance = results["distances"][0][i] if results["distances"] else 0
                similarity = 1 - distance  # Cosine distance para similarity
                
                search_results.append(SearchResult(
                    id=doc_id,
                    content=results["documents"][0][i] if results["documents"] else "",
                    metadata=results["metadatas"][0][i] if results["metadatas"] else {},
                    score=max(0, min(1, similarity))  # Clamp entre 0 e 1
                ))
        
        return search_results
    
    async def delete_documents(self, ids: List[str]) -> None:
        """Remove documentos pelo ID."""
        if not ids:
            return
        
        collection = self._get_collection()
        collection.delete(ids=ids)
        
        logger.info("documents_deleted", count=len(ids))
    
    async def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do collection."""
        collection = self._get_collection()
        
        return {
            "name": collection.name,
            "count": collection.count(),
            "metadata": collection.metadata
        }
    
    def is_available(self) -> bool:
        """Verifica se o store está disponível."""
        if not CHROMA_AVAILABLE:
            return False
        try:
            self._get_client()
            return True
        except Exception:
            return False


# Singleton
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """Retorna instância singleton."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
