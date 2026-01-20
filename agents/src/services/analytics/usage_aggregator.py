# agents/src/services/analytics/usage_aggregator.py
"""
Agregador de métricas de uso.
"""

from typing import Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import structlog

from .events import EventType
from src.services.cache import get_cache

logger = structlog.get_logger()


@dataclass
class UsageStats:
    """Estatísticas de uso."""
    period_start: datetime
    period_end: datetime
    
    # Contadores
    total_requests: int = 0
    total_tokens_input: int = 0
    total_tokens_output: int = 0
    total_errors: int = 0
    
    # Por agent
    requests_by_agent: dict[str, int] = field(default_factory=dict)
    errors_by_agent: dict[str, int] = field(default_factory=dict)
    latency_by_agent: dict[str, float] = field(default_factory=dict)  # média ms
    
    # Por tool
    calls_by_tool: dict[str, int] = field(default_factory=dict)
    errors_by_tool: dict[str, int] = field(default_factory=dict)
    
    # Por usuário
    active_users: int = 0
    requests_by_user: dict[str, int] = field(default_factory=dict)
    
    # Métricas derivadas
    @property
    def total_tokens(self) -> int:
        return self.total_tokens_input + self.total_tokens_output
    
    @property
    def error_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.total_errors / self.total_requests
    
    @property
    def avg_tokens_per_request(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.total_tokens / self.total_requests


@dataclass
class CostEstimate:
    """Estimativa de custo."""
    period_start: datetime
    period_end: datetime
    
    tokens_input: int = 0
    tokens_output: int = 0
    
    # Custos em USD (baseado em Claude pricing)
    cost_input: float = 0.0
    cost_output: float = 0.0
    
    @property
    def total_cost(self) -> float:
        return self.cost_input + self.cost_output


class UsageAggregator:
    """
    Agrega métricas de uso para reporting.
    
    Uso:
        aggregator = UsageAggregator()
        
        # Stats do dia
        stats = await aggregator.get_daily_stats(
            org_id=1,
            branch_id=1,
            date=date.today()
        )
        
        # Stats do período
        stats = await aggregator.get_period_stats(
            org_id=1,
            branch_id=1,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31)
        )
        
        # Estimativa de custo
        cost = await aggregator.estimate_cost(
            org_id=1,
            branch_id=1,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31)
        )
    """
    
    # Pricing Claude (USD per 1M tokens) - ajustar conforme modelo
    PRICE_INPUT_PER_1M = 3.00   # Claude Sonnet
    PRICE_OUTPUT_PER_1M = 15.00
    
    def __init__(self):
        self._cache = get_cache()
    
    async def get_daily_stats(
        self,
        org_id: int,
        branch_id: int,
        date: datetime
    ) -> UsageStats:
        """Obtém estatísticas de um dia."""
        day_str = date.strftime("%Y-%m-%d")
        key = f"analytics:{org_id}:{day_str}"
        
        events = await self._cache.get_json(key) or []
        
        # Filtrar por branch
        events = [e for e in events if e.get("branch_id") == branch_id]
        
        return self._aggregate_events(
            events,
            period_start=datetime.combine(date, datetime.min.time()),
            period_end=datetime.combine(date, datetime.max.time())
        )
    
    async def get_period_stats(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> UsageStats:
        """Obtém estatísticas de um período."""
        all_events = []
        
        current = start_date
        while current <= end_date:
            day_str = current.strftime("%Y-%m-%d")
            key = f"analytics:{org_id}:{day_str}"
            
            events = await self._cache.get_json(key) or []
            events = [e for e in events if e.get("branch_id") == branch_id]
            all_events.extend(events)
            
            current += timedelta(days=1)
        
        return self._aggregate_events(
            all_events,
            period_start=start_date,
            period_end=end_date
        )
    
    async def estimate_cost(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> CostEstimate:
        """Estima custo do período."""
        stats = await self.get_period_stats(org_id, branch_id, start_date, end_date)
        
        cost_input = (stats.total_tokens_input / 1_000_000) * self.PRICE_INPUT_PER_1M
        cost_output = (stats.total_tokens_output / 1_000_000) * self.PRICE_OUTPUT_PER_1M
        
        return CostEstimate(
            period_start=start_date,
            period_end=end_date,
            tokens_input=stats.total_tokens_input,
            tokens_output=stats.total_tokens_output,
            cost_input=cost_input,
            cost_output=cost_output
        )
    
    async def get_top_agents(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10
    ) -> list[dict]:
        """Retorna agents mais usados."""
        stats = await self.get_period_stats(org_id, branch_id, start_date, end_date)
        
        sorted_agents = sorted(
            stats.requests_by_agent.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {
                "agent": name,
                "requests": count,
                "errors": stats.errors_by_agent.get(name, 0),
                "avg_latency_ms": stats.latency_by_agent.get(name, 0)
            }
            for name, count in sorted_agents[:limit]
        ]
    
    async def get_top_tools(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10
    ) -> list[dict]:
        """Retorna tools mais usadas."""
        stats = await self.get_period_stats(org_id, branch_id, start_date, end_date)
        
        sorted_tools = sorted(
            stats.calls_by_tool.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {
                "tool": name,
                "calls": count,
                "errors": stats.errors_by_tool.get(name, 0)
            }
            for name, count in sorted_tools[:limit]
        ]
    
    def _aggregate_events(
        self,
        events: list[dict],
        period_start: datetime,
        period_end: datetime
    ) -> UsageStats:
        """Agrega lista de eventos em stats."""
        stats = UsageStats(
            period_start=period_start,
            period_end=period_end
        )
        
        users: set[str] = set()
        latency_sums: dict[str, list[float]] = {}
        
        for event in events:
            event_type = event.get("type", "")
            
            # Agent events
            if event_type in [EventType.AGENT_REQUEST.value, EventType.AGENT_RESPONSE.value]:
                stats.total_requests += 1
                
                agent = event.get("agent_name", "unknown")
                stats.requests_by_agent[agent] = stats.requests_by_agent.get(agent, 0) + 1
                
                if event.get("tokens_input"):
                    stats.total_tokens_input += event["tokens_input"]
                if event.get("tokens_output"):
                    stats.total_tokens_output += event["tokens_output"]
                
                if event.get("duration_ms"):
                    if agent not in latency_sums:
                        latency_sums[agent] = []
                    latency_sums[agent].append(event["duration_ms"])
            
            # Errors
            if event_type in [EventType.AGENT_ERROR.value, EventType.TOOL_ERROR.value]:
                stats.total_errors += 1
                
                agent = event.get("agent_name")
                if agent:
                    stats.errors_by_agent[agent] = stats.errors_by_agent.get(agent, 0) + 1
                
                tool = event.get("tool_name")
                if tool:
                    stats.errors_by_tool[tool] = stats.errors_by_tool.get(tool, 0) + 1
            
            # Tool events
            if event_type in [EventType.TOOL_CALL.value, EventType.TOOL_SUCCESS.value, EventType.TOOL_ERROR.value]:
                tool = event.get("tool_name", "unknown")
                stats.calls_by_tool[tool] = stats.calls_by_tool.get(tool, 0) + 1
            
            # Users
            user_id = event.get("user_id")
            if user_id:
                users.add(user_id)
                stats.requests_by_user[user_id] = stats.requests_by_user.get(user_id, 0) + 1
        
        # Calcular médias de latência
        for agent, latencies in latency_sums.items():
            if latencies:
                stats.latency_by_agent[agent] = sum(latencies) / len(latencies)
        
        stats.active_users = len(users)
        
        return stats
