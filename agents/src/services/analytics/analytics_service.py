# agents/src/services/analytics/analytics_service.py
"""
Serviço principal de analytics.
"""

from typing import Optional
from datetime import datetime, date, timedelta
import structlog

from .event_tracker import EventTracker, get_event_tracker
from .usage_aggregator import UsageAggregator, UsageStats, CostEstimate
from .events import EventType, AnalyticsEvent

logger = structlog.get_logger()


class AnalyticsService:
    """
    Serviço unificado de analytics.
    
    Uso:
        service = get_analytics_service()
        
        # Tracking
        await service.track_agent_call(...)
        
        # Reports
        stats = await service.get_usage_report(org_id, branch_id, period="month")
        
        # Cost
        cost = await service.get_cost_report(org_id, branch_id, period="month")
    """
    
    def __init__(self):
        self._tracker = get_event_tracker()
        self._aggregator = UsageAggregator()
        logger.info("analytics_service_initialized")
    
    @property
    def tracker(self) -> EventTracker:
        """Acesso ao tracker."""
        return self._tracker
    
    async def start(self):
        """Inicia serviço."""
        await self._tracker.start()
    
    async def stop(self):
        """Para serviço."""
        await self._tracker.stop()
    
    # ===== TRACKING SHORTCUTS =====
    
    async def track_agent_call(
        self,
        org_id: int,
        branch_id: int,
        agent_name: str,
        duration_ms: float,
        tokens_input: int,
        tokens_output: int,
        success: bool = True,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        """Registra chamada de agent."""
        await self._tracker.track_agent_response(
            org_id=org_id,
            branch_id=branch_id,
            agent_name=agent_name,
            duration_ms=duration_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            success=success,
            user_id=user_id,
            session_id=session_id,
            error_message=error_message
        )
    
    async def track_tool_call(
        self,
        org_id: int,
        branch_id: int,
        agent_name: str,
        tool_name: str,
        duration_ms: float,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        """Registra chamada de tool."""
        await self._tracker.track_tool_call(
            org_id=org_id,
            branch_id=branch_id,
            agent_name=agent_name,
            tool_name=tool_name,
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=metadata
        )
    
    # ===== REPORTS =====
    
    async def get_usage_report(
        self,
        org_id: int,
        branch_id: int,
        period: str = "day",  # day, week, month
        reference_date: Optional[date] = None
    ) -> UsageStats:
        """Obtém relatório de uso."""
        ref = reference_date or date.today()
        
        if period == "day":
            start = datetime.combine(ref, datetime.min.time())
            end = datetime.combine(ref, datetime.max.time())
        elif period == "week":
            start = datetime.combine(ref - timedelta(days=ref.weekday()), datetime.min.time())
            end = datetime.combine(start.date() + timedelta(days=6), datetime.max.time())
        elif period == "month":
            start = datetime.combine(ref.replace(day=1), datetime.min.time())
            # Último dia do mês
            if ref.month == 12:
                end = datetime.combine(ref.replace(year=ref.year+1, month=1, day=1) - timedelta(days=1), datetime.max.time())
            else:
                end = datetime.combine(ref.replace(month=ref.month+1, day=1) - timedelta(days=1), datetime.max.time())
        else:
            raise ValueError(f"Invalid period: {period}")
        
        return await self._aggregator.get_period_stats(org_id, branch_id, start, end)
    
    async def get_cost_report(
        self,
        org_id: int,
        branch_id: int,
        period: str = "month",
        reference_date: Optional[date] = None
    ) -> CostEstimate:
        """Obtém relatório de custo."""
        ref = reference_date or date.today()
        
        if period == "day":
            start = datetime.combine(ref, datetime.min.time())
            end = datetime.combine(ref, datetime.max.time())
        elif period == "week":
            start = datetime.combine(ref - timedelta(days=ref.weekday()), datetime.min.time())
            end = datetime.combine(start.date() + timedelta(days=6), datetime.max.time())
        elif period == "month":
            start = datetime.combine(ref.replace(day=1), datetime.min.time())
            if ref.month == 12:
                end = datetime.combine(ref.replace(year=ref.year+1, month=1, day=1) - timedelta(days=1), datetime.max.time())
            else:
                end = datetime.combine(ref.replace(month=ref.month+1, day=1) - timedelta(days=1), datetime.max.time())
        else:
            raise ValueError(f"Invalid period: {period}")
        
        return await self._aggregator.estimate_cost(org_id, branch_id, start, end)
    
    async def get_top_agents(
        self,
        org_id: int,
        branch_id: int,
        period: str = "month",
        limit: int = 10
    ) -> list[dict]:
        """Obtém agents mais usados."""
        ref = date.today()
        
        if period == "day":
            start = datetime.combine(ref, datetime.min.time())
            end = datetime.combine(ref, datetime.max.time())
        elif period == "week":
            start = datetime.combine(ref - timedelta(days=ref.weekday()), datetime.min.time())
            end = datetime.combine(start.date() + timedelta(days=6), datetime.max.time())
        else:  # month
            start = datetime.combine(ref.replace(day=1), datetime.min.time())
            end = datetime.combine(ref, datetime.max.time())
        
        return await self._aggregator.get_top_agents(org_id, branch_id, start, end, limit)
    
    async def get_top_tools(
        self,
        org_id: int,
        branch_id: int,
        period: str = "month",
        limit: int = 10
    ) -> list[dict]:
        """Obtém tools mais usadas."""
        ref = date.today()
        
        if period == "day":
            start = datetime.combine(ref, datetime.min.time())
            end = datetime.combine(ref, datetime.max.time())
        elif period == "week":
            start = datetime.combine(ref - timedelta(days=ref.weekday()), datetime.min.time())
            end = datetime.combine(start.date() + timedelta(days=6), datetime.max.time())
        else:  # month
            start = datetime.combine(ref.replace(day=1), datetime.min.time())
            end = datetime.combine(ref, datetime.max.time())
        
        return await self._aggregator.get_top_tools(org_id, branch_id, start, end, limit)


# Singleton
_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    """Retorna instância singleton."""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service
