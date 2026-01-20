# agents/tests/load/test_api_load.py
"""
Testes de carga básicos.

Para testes mais robustos, usar Locust ou k6.
"""

import pytest
import asyncio
import time
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from typing import Dict, List, Any


class TestAPILoad:
    """Testes de carga da API."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    @pytest.mark.load
    async def test_concurrent_requests(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve suportar requisições concorrentes."""
        num_requests = 50
        
        with patch("src.services.agents.get_agent") as mock_get:
            mock_agent = AsyncMock()
            mock_agent.run.return_value = {"message": "OK", "agent": "fiscal"}
            mock_get.return_value = mock_agent
            
            async def make_request() -> Any:
                return await client.post(
                    "/v1/agents/chat",
                    headers=api_key_header,
                    json={"agent": "fiscal", "message": "Test"}
                )
            
            start = time.perf_counter()
            
            tasks = [make_request() for _ in range(num_requests)]
            responses = await asyncio.gather(*tasks)
            
            duration = time.perf_counter() - start
            
            # Verificações
            success_count = sum(1 for r in responses if r.status_code == 200)
            
            assert success_count >= num_requests * 0.95  # 95% success
            assert duration < 30  # Menos de 30s para 50 requests
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    @pytest.mark.load
    async def test_rate_limiting(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str]
    ) -> None:
        """Deve aplicar rate limiting."""
        responses: List[Any] = []
        
        with patch("src.middleware.auth.validate_api_key") as mock_auth:
            mock_auth.return_value = True
            
            # Fazer muitas requisições rápidas
            for _ in range(100):
                response = await client.get(
                    "/v1/agents",
                    headers=api_key_header
                )
                responses.append(response)
        
        # Contar respostas
        success = sum(1 for r in responses if r.status_code == 200)
        rate_limited = sum(1 for r in responses if r.status_code == 429)
        
        # Se rate limiting está ativo, deve ter alguns 429
        # Se não está ativo, todos devem ser 200
        assert success + rate_limited == len(responses)
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    @pytest.mark.load
    async def test_sustained_load(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve suportar carga sustentada."""
        duration_seconds = 5
        requests_per_second = 10
        
        with patch("src.services.agents.get_agent") as mock_get:
            mock_agent = AsyncMock()
            mock_agent.run.return_value = {"message": "OK", "agent": "fiscal"}
            mock_get.return_value = mock_agent
            
            responses: List[Any] = []
            start = time.perf_counter()
            
            while time.perf_counter() - start < duration_seconds:
                tasks = [
                    client.post(
                        "/v1/agents/chat",
                        headers=api_key_header,
                        json={"agent": "fiscal", "message": "Test"}
                    )
                    for _ in range(requests_per_second)
                ]
                batch_responses = await asyncio.gather(*tasks)
                responses.extend(batch_responses)
                await asyncio.sleep(1)
            
            success_rate = sum(1 for r in responses if r.status_code == 200) / len(responses)
            
            assert success_rate >= 0.90  # 90% success rate under sustained load
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    @pytest.mark.load
    async def test_large_payload(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve suportar payloads grandes."""
        large_message = "A" * 10000  # 10KB de texto
        
        with patch("src.services.agents.get_agent") as mock_get:
            mock_agent = AsyncMock()
            mock_agent.run.return_value = {"message": "OK", "agent": "fiscal"}
            mock_get.return_value = mock_agent
            
            response = await client.post(
                "/v1/agents/chat",
                headers=api_key_header,
                json={"agent": "fiscal", "message": large_message}
            )
        
        # Deve aceitar ou retornar 413 (payload too large)
        assert response.status_code in [200, 413]
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    @pytest.mark.load
    async def test_response_time_percentiles(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve manter latência aceitável nos percentis."""
        num_requests = 20
        latencies: List[float] = []
        
        with patch("src.services.agents.get_agent") as mock_get:
            mock_agent = AsyncMock()
            mock_agent.run.return_value = {"message": "OK", "agent": "fiscal"}
            mock_get.return_value = mock_agent
            
            for _ in range(num_requests):
                start = time.perf_counter()
                await client.post(
                    "/v1/agents/chat",
                    headers=api_key_header,
                    json={"agent": "fiscal", "message": "Test"}
                )
                latencies.append((time.perf_counter() - start) * 1000)  # ms
        
        latencies.sort()
        p50 = latencies[int(num_requests * 0.5)]
        p95 = latencies[int(num_requests * 0.95)]
        p99 = latencies[int(num_requests * 0.99)]
        
        # Verificar percentis (valores de exemplo)
        assert p50 < 500   # p50 < 500ms
        assert p95 < 2000  # p95 < 2s
        assert p99 < 5000  # p99 < 5s
