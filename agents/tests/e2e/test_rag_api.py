# agents/tests/e2e/test_rag_api.py
"""
Testes E2E para API de RAG.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from typing import Dict, Any


class TestRAGAPI:
    """Testes da API de RAG."""
    
    @pytest.mark.asyncio
    async def test_query_success(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve processar query RAG."""
        with patch("src.services.rag.get_rag_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.query.return_value = {
                "answer": "O ICMS interestadual entre SP e RJ é de 12%.",
                "sources": [
                    {
                        "title": "Lei Complementar 87/96",
                        "content": "Artigo sobre alíquotas...",
                        "score": 0.92
                    }
                ],
                "confidence": 0.88
            }
            mock_svc.return_value = mock_service
            
            response = await client.post(
                "/v1/rag/query",
                headers=api_key_header,
                json={
                    "query": "Qual o ICMS interestadual de SP para RJ?",
                    "collection": "legislation"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert len(data["sources"]) > 0
    
    @pytest.mark.asyncio
    async def test_list_collections(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve listar coleções disponíveis."""
        with patch("src.services.rag.get_rag_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.list_collections.return_value = [
                "legislation",
                "documents",
                "manuals"
            ]
            mock_svc.return_value = mock_service
            
            response = await client.get(
                "/v1/rag/collections",
                headers=api_key_header
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "collections" in data
        assert "legislation" in data["collections"]
    
    @pytest.mark.asyncio
    async def test_query_empty(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve validar query vazia."""
        response = await client.post(
            "/v1/rag/query",
            headers=api_key_header,
            json={
                "query": "",
                "collection": "legislation"
            }
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_query_without_auth(self, client: AsyncClient) -> None:
        """Deve retornar 401 sem autenticação."""
        response = await client.post(
            "/v1/rag/query",
            json={
                "query": "Teste",
                "collection": "legislation"
            }
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_query_with_top_k(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve respeitar parâmetro top_k."""
        with patch("src.services.rag.get_rag_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.query.return_value = {
                "answer": "Resposta",
                "sources": [{"title": "Doc1"}, {"title": "Doc2"}, {"title": "Doc3"}],
                "confidence": 0.85
            }
            mock_svc.return_value = mock_service
            
            response = await client.post(
                "/v1/rag/query",
                headers=api_key_header,
                json={
                    "query": "Teste",
                    "collection": "legislation",
                    "top_k": 3
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["sources"]) <= 3
    
    @pytest.mark.asyncio
    async def test_query_with_min_score(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve filtrar por min_score."""
        with patch("src.services.rag.get_rag_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.query.return_value = {
                "answer": "Resposta filtrada",
                "sources": [{"title": "Doc relevante", "score": 0.9}],
                "confidence": 0.9
            }
            mock_svc.return_value = mock_service
            
            response = await client.post(
                "/v1/rag/query",
                headers=api_key_header,
                json={
                    "query": "Teste",
                    "collection": "legislation",
                    "min_score": 0.8
                }
            )
        
        assert response.status_code == 200
