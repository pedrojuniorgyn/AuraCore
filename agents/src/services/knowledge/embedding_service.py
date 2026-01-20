# agents/src/services/knowledge/embedding_service.py
"""
Serviço de geração de embeddings.

Suporta:
- OpenAI Embeddings (text-embedding-3-small)
- Google Vertex AI Embeddings
- Sentence Transformers (local)
"""

import os
from typing import List, Optional, Literal
from dataclasses import dataclass
import structlog

logger = structlog.get_logger()

# Tentar importar providers
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None  # type: ignore

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None  # type: ignore


@dataclass
class EmbeddingConfig:
    """Configuração do serviço de embeddings."""
    provider: Literal["openai", "vertex", "local"] = "openai"
    model: str = "text-embedding-3-small"
    dimensions: int = 1536
    batch_size: int = 100
    
    # Para provider local
    local_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class EmbeddingService:
    """
    Serviço de geração de embeddings para textos.
    
    Uso:
        service = EmbeddingService()
        embeddings = await service.embed_texts(["texto 1", "texto 2"])
        
        # Embedding único
        embedding = await service.embed_text("texto")
    """
    
    def __init__(self, config: Optional[EmbeddingConfig] = None):
        self.config = config or EmbeddingConfig()
        self._client: Optional[OpenAI] = None
        self._local_model: Optional[SentenceTransformer] = None
        
        logger.info(
            "embedding_service_initialized",
            provider=self.config.provider,
            model=self.config.model
        )
    
    def _get_openai_client(self) -> "OpenAI":
        """Retorna cliente OpenAI."""
        if not OPENAI_AVAILABLE:
            raise RuntimeError("OpenAI não instalado: pip install openai")
        
        if self._client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("OPENAI_API_KEY não configurada")
            self._client = OpenAI(api_key=api_key)
        
        return self._client
    
    def _get_local_model(self) -> "SentenceTransformer":
        """Retorna modelo local."""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise RuntimeError("sentence-transformers não instalado")
        
        if self._local_model is None:
            self._local_model = SentenceTransformer(self.config.local_model)
        
        return self._local_model
    
    async def embed_text(self, text: str) -> List[float]:
        """
        Gera embedding para um texto.
        
        Args:
            text: Texto para gerar embedding
            
        Returns:
            Lista de floats (vetor de embedding)
        """
        embeddings = await self.embed_texts([text])
        return embeddings[0]
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Gera embeddings para múltiplos textos.
        
        Args:
            texts: Lista de textos
            
        Returns:
            Lista de vetores de embedding
        """
        if not texts:
            return []
        
        logger.info("generating_embeddings", count=len(texts))
        
        if self.config.provider == "openai":
            return await self._embed_openai(texts)
        elif self.config.provider == "local":
            return await self._embed_local(texts)
        else:
            raise ValueError(f"Provider não suportado: {self.config.provider}")
    
    async def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """Gera embeddings com OpenAI."""
        client = self._get_openai_client()
        
        all_embeddings: List[List[float]] = []
        
        # Processar em batches
        for i in range(0, len(texts), self.config.batch_size):
            batch = texts[i:i + self.config.batch_size]
            
            response = client.embeddings.create(
                model=self.config.model,
                input=batch,
                dimensions=self.config.dimensions
            )
            
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    async def _embed_local(self, texts: List[str]) -> List[List[float]]:
        """Gera embeddings com modelo local."""
        model = self._get_local_model()
        
        # Sentence Transformers é síncrono
        embeddings = model.encode(texts, convert_to_numpy=True)
        
        return embeddings.tolist()
    
    def is_available(self) -> bool:
        """Verifica se o serviço está disponível."""
        if self.config.provider == "openai":
            return OPENAI_AVAILABLE and bool(os.getenv("OPENAI_API_KEY"))
        elif self.config.provider == "local":
            return SENTENCE_TRANSFORMERS_AVAILABLE
        return False


# Singleton
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Retorna instância singleton."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
