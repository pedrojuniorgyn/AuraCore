# agents/tests/e2e/test_analytics_api.py
"""
Testes E2E para API de Analytics.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass


@dataclass
class MockStats:
    """Mock de estatísticas."""
    period_start: datetime
    period_end: datetime
    total_requests: int
    total_tokens: int
    total_errors: int
    error_rate: float
    active_users: int
    requests_by_agent: Dict[str, int]
    latency_by_agent: Dict[str, int]


class TestAnalyticsAPI:
    """Testes da API de Analytics."""
    
    @pytest.mark.asyncio
    async def test_get_usage_stats(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve retornar estatísticas de uso."""
        with patch("src.services.analytics.get_analytics_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.get_usage_report.return_value = MockStats(
                period_start=datetime.utcnow(),
                period_end=datetime.utcnow(),
                total_requests=1500,
                total_tokens=50000,
                total_errors=25,
                error_rate=0.017,
                active_users=42,
                requests_by_agent={"fiscal": 800, "financial": 400},
                latency_by_agent={"fiscal": 1200, "financial": 800}
            )
            mock_svc.return_value = mock_service
            
            response = await client.get(
                "/v1/analytics/usage?period=day",
                headers=api_key_header
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_requests"] == 1500
        assert data["total_tokens"] == 50000
        assert data["error_rate"] < 0.02
    
    @pytest.mark.asyncio
    async def test_get_top_agents(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve retornar top agents."""
        with patch("src.services.analytics.get_analytics_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.get_top_agents.return_value = [
                {"agent": "fiscal", "requests": 800, "errors": 10, "avg_latency_ms": 1200},
                {"agent": "financial", "requests": 400, "errors": 5, "avg_latency_ms": 800}
            ]
            mock_svc.return_value = mock_service
            
            response = await client.get(
                "/v1/analytics/top-agents?period=month",
                headers=api_key_header
            )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        assert data[0]["agent"] == "fiscal"
    
    @pytest.mark.asyncio
    async def test_get_usage_by_period(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve filtrar por período."""
        periods = ["day", "week", "month"]
        
        for period in periods:
            with patch("src.services.analytics.get_analytics_service") as mock_svc:
                mock_service = AsyncMock()
                mock_service.get_usage_report.return_value = MockStats(
                    period_start=datetime.utcnow(),
                    period_end=datetime.utcnow(),
                    total_requests=100,
                    total_tokens=1000,
                    total_errors=5,
                    error_rate=0.05,
                    active_users=10,
                    requests_by_agent={},
                    latency_by_agent={}
                )
                mock_svc.return_value = mock_service
                
                response = await client.get(
                    f"/v1/analytics/usage?period={period}",
                    headers=api_key_header
                )
            
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_analytics_without_auth(self, client: AsyncClient) -> None:
        """Deve retornar 401 sem autenticação."""
        response = await client.get("/v1/analytics/usage?period=day")
        assert response.status_code == 401
