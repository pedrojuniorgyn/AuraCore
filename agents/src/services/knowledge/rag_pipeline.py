# agents/src/services/knowledge/rag_pipeline.py
"""
RAG Pipeline para consulta de conhecimento.

Fluxo:
1. Query → Embedding
2. Embedding → Vector Search
3. Resultados → Contexto para LLM
4. LLM → Resposta aumentada
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import structlog

from .embedding_service import EmbeddingService, get_embedding_service
from .vector_store import VectorStore, SearchResult, get_vector_store
from src.core.observability import get_observability

logger = structlog.get_logger()
obs = get_observability()


@dataclass
class RAGConfig:
    """Configuração do RAG Pipeline."""
    top_k: int = 5
    min_score: float = 0.3  # Score mínimo para incluir resultado
    max_context_length: int = 4000  # Máximo de caracteres de contexto
    include_metadata: bool = True


@dataclass
class RAGResult:
    """Resultado do RAG."""
    query: str
    context: str
    sources: List[Dict[str, Any]] = field(default_factory=list)
    total_results: int = 0
    
    def format_for_prompt(self) -> str:
        """Formata contexto para prompt do LLM."""
        if not self.context:
            return "Nenhuma informação relevante encontrada na base de conhecimento."
        
        sources_text = "\n".join([
            f"- {s.get('title', 'Documento')} ({s.get('type', 'unknown')})" 
            for s in self.sources[:5]
        ])
        
        return f"""CONTEXTO DA BASE DE CONHECIMENTO:

{self.context}

FONTES CONSULTADAS:
{sources_text}
"""


class RAGPipeline:
    """
    Pipeline RAG para consulta de legislação fiscal.
    
    Uso:
        pipeline = RAGPipeline()
        
        # Buscar contexto
        result = await pipeline.retrieve("Qual a alíquota de ICMS para SP?")
        
        # Usar contexto em prompt
        context = result.format_for_prompt()
    """
    
    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store: Optional[VectorStore] = None,
        config: Optional[RAGConfig] = None
    ):
        self.embeddings = embedding_service or get_embedding_service()
        self.vector_store = vector_store or get_vector_store()
        self.config = config or RAGConfig()
        
        logger.info("rag_pipeline_initialized")
    
    async def retrieve(
        self,
        query: str,
        filter_type: Optional[str] = None,
        top_k: Optional[int] = None
    ) -> RAGResult:
        """
        Recupera contexto relevante para uma query.
        
        Args:
            query: Pergunta ou consulta
            filter_type: Filtrar por tipo (law, manual, regulation)
            top_k: Override do número de resultados
            
        Returns:
            RAGResult com contexto e fontes
        """
        logger.info("rag_retrieve", query=query[:50])
        
        with obs.measure_rag_duration():
            # 1. Gerar embedding da query
            query_embedding = await self.embeddings.embed_text(query)
            
            # 2. Buscar no vector store
            filter_metadata: Optional[Dict[str, Any]] = None
            if filter_type:
                filter_metadata = {"type": filter_type}
            
            results = await self.vector_store.search(
                query_embedding=query_embedding,
                top_k=top_k or self.config.top_k,
                filter_metadata=filter_metadata
            )
            
            # 3. Filtrar por score mínimo
            filtered_results = [
                r for r in results 
                if r.score >= self.config.min_score
            ]
            
            # 4. Construir contexto
            context_parts: List[str] = []
            sources: List[Dict[str, Any]] = []
            total_length = 0
            
            for result in filtered_results:
                # Verificar limite de tamanho
                if total_length + len(result.content) > self.config.max_context_length:
                    break
                
                context_parts.append(result.content)
                total_length += len(result.content)
                
                # Adicionar fonte
                sources.append({
                    "id": result.id,
                    "title": result.metadata.get("title", "Documento"),
                    "type": result.metadata.get("type", "unknown"),
                    "score": result.score,
                    "article": result.metadata.get("article"),
                    "law": result.metadata.get("law_number")
                })
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Registrar métricas
        if context:
            obs.record_rag_query(filter_type or "all", "success")
        else:
            obs.record_rag_query(filter_type or "all", "empty")
        
        logger.info(
            "rag_retrieve_complete",
            results_found=len(filtered_results),
            context_length=len(context)
        )
        
        return RAGResult(
            query=query,
            context=context,
            sources=sources,
            total_results=len(results)
        )
    
    async def query_with_context(
        self,
        query: str,
        filter_type: Optional[str] = None
    ) -> str:
        """
        Retorna contexto formatado para usar em prompt de LLM.
        
        Args:
            query: Pergunta
            filter_type: Filtro opcional
            
        Returns:
            Contexto formatado como string
        """
        result = await self.retrieve(query, filter_type)
        return result.format_for_prompt()
    
    def is_available(self) -> bool:
        """Verifica se o pipeline está disponível."""
        return (
            self.embeddings.is_available() and 
            self.vector_store.is_available()
        )


# Singleton
_rag_pipeline: Optional[RAGPipeline] = None


def get_rag_pipeline() -> RAGPipeline:
    """Retorna instância singleton."""
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline
