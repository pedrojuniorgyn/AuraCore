# agents/src/api/analytics.py
"""
API endpoints para analytics.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

from src.services.analytics import get_analytics_service
from src.services.auth import Permission
from src.middleware.auth import require_permission

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ===== SCHEMAS =====

class UsageStatsResponse(BaseModel):
    """Response de estatísticas de uso."""
    period_start: datetime
    period_end: datetime
    total_requests: int
    total_tokens: int
    total_errors: int
    error_rate: float
    active_users: int
    requests_by_agent: dict[str, int]
    latency_by_agent: dict[str, float]


class CostEstimateResponse(BaseModel):
    """Response de estimativa de custo."""
    period_start: datetime
    period_end: datetime
    tokens_input: int
    tokens_output: int
    cost_input_usd: float
    cost_output_usd: float
    total_cost_usd: float


class TopAgentResponse(BaseModel):
    """Response de top agent."""
    agent: str
    requests: int
    errors: int
    avg_latency_ms: float


class TopToolResponse(BaseModel):
    """Response de top tool."""
    tool: str
    calls: int
    errors: int


# ===== ENDPOINTS =====

@router.get("/usage", response_model=UsageStatsResponse)
async def get_usage_stats(
    period: str = Query("day", pattern="^(day|week|month)$"),
    reference_date: Optional[date] = None,
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
):
    """
    Obtém estatísticas de uso.
    
    - **period**: day, week, month
    - **reference_date**: Data de referência (default: hoje)
    """
    service = get_analytics_service()
    
    stats = await service.get_usage_report(
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        period=period,
        reference_date=reference_date
    )
    
    return UsageStatsResponse(
        period_start=stats.period_start,
        period_end=stats.period_end,
        total_requests=stats.total_requests,
        total_tokens=stats.total_tokens,
        total_errors=stats.total_errors,
        error_rate=stats.error_rate,
        active_users=stats.active_users,
        requests_by_agent=stats.requests_by_agent,
        latency_by_agent=stats.latency_by_agent
    )


@router.get("/cost", response_model=CostEstimateResponse)
async def get_cost_estimate(
    period: str = Query("month", pattern="^(day|week|month)$"),
    reference_date: Optional[date] = None,
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
):
    """
    Obtém estimativa de custo.
    
    Baseado em pricing do Claude (ajustar conforme modelo).
    """
    service = get_analytics_service()
    
    cost = await service.get_cost_report(
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        period=period,
        reference_date=reference_date
    )
    
    return CostEstimateResponse(
        period_start=cost.period_start,
        period_end=cost.period_end,
        tokens_input=cost.tokens_input,
        tokens_output=cost.tokens_output,
        cost_input_usd=cost.cost_input,
        cost_output_usd=cost.cost_output,
        total_cost_usd=cost.total_cost
    )


@router.get("/top-agents", response_model=list[TopAgentResponse])
async def get_top_agents(
    period: str = Query("month", pattern="^(day|week|month)$"),
    limit: int = Query(10, ge=1, le=50),
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
):
    """
    Obtém agents mais utilizados.
    """
    service = get_analytics_service()
    
    agents = await service.get_top_agents(
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        period=period,
        limit=limit
    )
    
    return [TopAgentResponse(**a) for a in agents]


@router.get("/top-tools", response_model=list[TopToolResponse])
async def get_top_tools(
    period: str = Query("month", pattern="^(day|week|month)$"),
    limit: int = Query(10, ge=1, le=50),
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
):
    """
    Obtém tools mais utilizadas.
    """
    service = get_analytics_service()
    
    tools = await service.get_top_tools(
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        period=period,
        limit=limit
    )
    
    return [TopToolResponse(**t) for t in tools]
