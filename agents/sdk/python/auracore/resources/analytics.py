# agents/sdk/python/auracore/resources/analytics.py
"""
Resource de Analytics.
"""

from typing import TYPE_CHECKING
from datetime import datetime
from ..types import AnalyticsStats
from ..exceptions import raise_for_status

if TYPE_CHECKING:
    from ..client import AuraCore


class AnalyticsResource:
    """
    Resource para analytics e métricas.
    
    Uso:
        stats = await client.analytics.usage(period="month")
        print(f"Total requests: {stats.total_requests}")
    """
    
    def __init__(self, client: "AuraCore"):
        self._client = client
    
    async def usage(
        self,
        period: str = "day"
    ) -> AnalyticsStats:
        """
        Obtém estatísticas de uso.
        
        Args:
            period: Período (day, week, month)
        
        Returns:
            AnalyticsStats
        """
        response = await self._client.async_client.get(
            "/v1/analytics/usage",
            params={"period": period}
        )
        
        raise_for_status(response)
        data = response.json()
        
        return AnalyticsStats(
            total_requests=data["total_requests"],
            total_tokens=data["total_tokens"],
            total_errors=data["total_errors"],
            error_rate=data["error_rate"],
            active_users=data["active_users"],
            period_start=datetime.fromisoformat(data["period_start"]),
            period_end=datetime.fromisoformat(data["period_end"])
        )
    
    def usage_sync(self, period: str = "day") -> AnalyticsStats:
        """Versão síncrona de usage()."""
        response = self._client.sync_client.get(
            "/v1/analytics/usage",
            params={"period": period}
        )
        
        raise_for_status(response)
        data = response.json()
        
        return AnalyticsStats(
            total_requests=data["total_requests"],
            total_tokens=data["total_tokens"],
            total_errors=data["total_errors"],
            error_rate=data["error_rate"],
            active_users=data["active_users"],
            period_start=datetime.fromisoformat(data["period_start"]),
            period_end=datetime.fromisoformat(data["period_end"])
        )
