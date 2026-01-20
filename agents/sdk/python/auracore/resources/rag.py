# agents/sdk/python/auracore/resources/rag.py
"""
Resource de RAG.
"""

from typing import List, TYPE_CHECKING
from ..types import RAGResult
from ..exceptions import raise_for_status

if TYPE_CHECKING:
    from ..client import AuraCore


class RAGResource:
    """
    Resource para RAG (Retrieval-Augmented Generation).
    
    Uso:
        # Query
        result = await client.rag.query("legislação ICMS")
        print(result.answer)
        for source in result.sources:
            print(f"- {source['title']}")
    """
    
    def __init__(self, client: "AuraCore"):
        self._client = client
    
    async def query(
        self,
        query: str,
        collection: str = "legislation",
        top_k: int = 5,
        min_score: float = 0.7
    ) -> RAGResult:
        """
        Faz query RAG.
        
        Args:
            query: Pergunta ou termo de busca
            collection: Coleção a buscar (legislation, documents)
            top_k: Número de resultados
            min_score: Score mínimo de relevância
        
        Returns:
            RAGResult com resposta e fontes
        """
        response = await self._client.async_client.post(
            "/v1/rag/query",
            json={
                "query": query,
                "collection": collection,
                "top_k": top_k,
                "min_score": min_score
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return RAGResult(
            answer=data["answer"],
            sources=data.get("sources", []),
            confidence=data.get("confidence", 0),
            query=query
        )
    
    def query_sync(
        self,
        query: str,
        collection: str = "legislation",
        top_k: int = 5,
        min_score: float = 0.7
    ) -> RAGResult:
        """Versão síncrona de query()."""
        response = self._client.sync_client.post(
            "/v1/rag/query",
            json={
                "query": query,
                "collection": collection,
                "top_k": top_k,
                "min_score": min_score
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return RAGResult(
            answer=data["answer"],
            sources=data.get("sources", []),
            confidence=data.get("confidence", 0),
            query=query
        )
    
    async def list_collections(self) -> List[str]:
        """Lista coleções disponíveis."""
        response = await self._client.async_client.get("/v1/rag/collections")
        raise_for_status(response)
        return response.json().get("collections", [])
    
    def list_collections_sync(self) -> List[str]:
        """Versão síncrona de list_collections()."""
        response = self._client.sync_client.get("/v1/rag/collections")
        raise_for_status(response)
        return response.json().get("collections", [])
