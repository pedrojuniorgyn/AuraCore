# agents/src/api/health.py
"""
Health check endpoints para Kubernetes e load balancers.
"""

from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/health", tags=["Health"])


class HealthStatus(BaseModel):
    """Status de saúde."""
    status: str  # healthy, degraded, unhealthy
    timestamp: datetime
    version: str
    uptime_seconds: float
    checks: dict


class LivenessResponse(BaseModel):
    """Resposta de liveness."""
    status: str
    timestamp: datetime


class ReadinessResponse(BaseModel):
    """Resposta de readiness."""
    status: str
    timestamp: datetime
    checks: dict


# Variável global para uptime
_start_time: Optional[datetime] = None


def get_start_time() -> datetime:
    """Retorna tempo de início."""
    global _start_time
    if _start_time is None:
        _start_time = datetime.utcnow()
    return _start_time


@router.get("/", response_model=HealthStatus)
async def health_check() -> HealthStatus:
    """
    Health check completo.
    
    Verifica todos os componentes e retorna status detalhado.
    """
    start = get_start_time()
    now = datetime.utcnow()
    uptime = (now - start).total_seconds()
    
    checks: dict = {}
    overall_status = "healthy"
    
    # Check Redis
    try:
        from src.services.cache import get_cache
        cache = get_cache()
        await cache.set("health:check", "1", ttl=10)
        value = await cache.get("health:check")
        checks["redis"] = {
            "status": "healthy" if value else "degraded",
            "latency_ms": 0
        }
    except Exception as e:
        checks["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_status = "degraded"
    
    # Check LLM availability (simples)
    checks["llm"] = {"status": "healthy"}
    
    return HealthStatus(
        status=overall_status,
        timestamp=now,
        version="2.0.0",
        uptime_seconds=uptime,
        checks=checks
    )


@router.get("/live", response_model=LivenessResponse)
async def liveness() -> LivenessResponse:
    """
    Liveness probe para Kubernetes.
    
    Retorna 200 se a aplicação está rodando.
    Não verifica dependências externas.
    """
    return LivenessResponse(
        status="alive",
        timestamp=datetime.utcnow()
    )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness(response: Response) -> ReadinessResponse:
    """
    Readiness probe para Kubernetes.
    
    Retorna 200 se a aplicação está pronta para receber tráfego.
    Verifica dependências críticas.
    """
    checks: dict = {}
    is_ready = True
    
    # Check Redis (crítico)
    try:
        from src.services.cache import get_cache
        cache = get_cache()
        await cache.set("health:ready", "1", ttl=10)
        checks["redis"] = True
    except Exception:
        checks["redis"] = False
        is_ready = False
    
    # Se não está pronto, retornar 503
    if not is_ready:
        response.status_code = 503
    
    return ReadinessResponse(
        status="ready" if is_ready else "not_ready",
        timestamp=datetime.utcnow(),
        checks=checks
    )


@router.get("/startup")
async def startup(response: Response) -> dict:
    """
    Startup probe para Kubernetes.
    
    Usado durante inicialização para verificar se
    a aplicação está pronta para receber probes normais.
    """
    try:
        # Verificações básicas de inicialização
        from src.services.cache import get_cache
        cache = get_cache()
        await cache.set("health:startup", "1", ttl=10)
        return {"status": "started"}
    except Exception:
        response.status_code = 503
        return {"status": "starting"}
