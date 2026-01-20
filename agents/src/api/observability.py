# agents/src/api/observability.py
"""
API endpoints de observabilidade.

Endpoints:
- GET /observability/metrics - Métricas Prometheus
- GET /observability/status - Status do sistema
- GET /observability/services - Status detalhado de serviços
"""

import json
from fastapi import APIRouter, Response
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from prometheus_client import (
    generate_latest,
    CONTENT_TYPE_LATEST,
    REGISTRY
)

from src.core.health import get_health_checker, get_full_health_status
from src.core.observability import get_observability

logger = structlog.get_logger()
router = APIRouter(prefix="/observability", tags=["observability"])


# ===== MODELS =====

class ServiceStatus(BaseModel):
    """Status de um serviço."""
    name: str
    status: str
    latency_ms: Optional[float] = None
    message: Optional[str] = None


class SystemStatusResponse(BaseModel):
    """Status geral do sistema."""
    status: str
    version: str
    environment: str
    uptime_seconds: float
    timestamp: str
    services: List[ServiceStatus]


class MetricsInfoResponse(BaseModel):
    """Informações sobre métricas disponíveis."""
    total_metrics: int
    categories: List[str]
    endpoint: str


# ===== ENDPOINTS =====

@router.get("/metrics")
async def prometheus_metrics() -> Response:
    """
    Expõe métricas no formato Prometheus.
    
    Usado pelo Prometheus scraper para coletar métricas.
    
    Métricas disponíveis:
    - auracore_agent_requests_total
    - auracore_agent_latency_seconds
    - auracore_tool_calls_total
    - auracore_tool_duration_seconds
    - auracore_knowledge_queries_total
    - auracore_rag_queries_total
    - auracore_rag_duration_seconds
    - auracore_voice_operations_total
    - auracore_voice_duration_seconds
    - auracore_document_imports_total
    - auracore_document_chunks_total
    """
    try:
        metrics_data = generate_latest(REGISTRY)
        
        return Response(
            content=metrics_data,
            media_type=CONTENT_TYPE_LATEST
        )
    except Exception as e:
        logger.error("metrics_export_error", error=str(e))
        return PlainTextResponse(
            content=f"# Error generating metrics: {str(e)}",
            status_code=500
        )


@router.get("/metrics/info", response_model=MetricsInfoResponse)
async def metrics_info() -> MetricsInfoResponse:
    """
    Retorna informações sobre métricas disponíveis.
    """
    return MetricsInfoResponse(
        total_metrics=12,
        categories=[
            "agent",
            "tool",
            "knowledge",
            "rag",
            "voice",
            "document"
        ],
        endpoint="/observability/metrics"
    )


@router.get("/status")
async def system_status() -> Dict[str, Any]:
    """
    Retorna status geral do sistema com todos os serviços.
    
    Inclui:
    - Status de saúde geral
    - Uptime
    - Status de cada serviço
    """
    checker = get_health_checker()
    health = await checker.check_all()
    
    # Formatar serviços
    services = []
    for name, details in health.get("checks", {}).items():
        services.append({
            "name": name,
            "status": details.get("status", "unknown"),
            "latency_ms": details.get("latency_ms"),
            "message": details.get("message") or details.get("error")
        })
    
    return {
        "status": health["status"],
        "version": health.get("version", "1.0.0"),
        "environment": health.get("environment", "development"),
        "uptime_seconds": health.get("uptime_seconds", 0),
        "timestamp": health.get("timestamp", datetime.utcnow().isoformat()),
        "total_services": len(services),
        "healthy_services": sum(1 for s in services if s["status"] == "healthy"),
        "services": services
    }


@router.get("/services")
async def services_status() -> Dict[str, Any]:
    """
    Retorna status detalhado de cada serviço.
    
    Serviços monitorados:
    - api: API FastAPI
    - chromadb: Vector store
    - llm: Anthropic LLM
    - auracore: Backend Next.js
    - memory: SQLite
    - google_speech: Speech-to-Text
    - google_tts: Text-to-Speech
    - openai_embeddings: OpenAI embeddings
    """
    health = await get_full_health_status()
    
    # Categorizar serviços
    critical = []
    optional = []
    voice = []
    
    for name, details in health.get("checks", {}).items():
        service_info = {
            "name": name,
            "status": details.get("status", "unknown"),
            "details": details
        }
        
        if name in ["api", "auracore"]:
            critical.append(service_info)
        elif name in ["google_speech", "google_tts"]:
            voice.append(service_info)
        else:
            optional.append(service_info)
    
    return {
        "overall_status": health["status"],
        "categories": {
            "critical": {
                "count": len(critical),
                "healthy": sum(1 for s in critical if s["status"] == "healthy"),
                "services": critical
            },
            "optional": {
                "count": len(optional),
                "healthy": sum(1 for s in optional if s["status"] == "healthy"),
                "services": optional
            },
            "voice": {
                "count": len(voice),
                "healthy": sum(1 for s in voice if s["status"] == "healthy"),
                "services": voice
            }
        }
    }


@router.get("/dashboard")
async def dashboard_data() -> Dict[str, Any]:
    """
    Retorna dados formatados para dashboard de monitoramento.
    
    Inclui métricas resumidas e status de serviços.
    """
    health = await get_full_health_status()
    obs = get_observability()
    
    # Determinar status visual
    status_emoji = {
        "healthy": "🟢",
        "degraded": "🟡",
        "unhealthy": "🔴"
    }
    
    services_summary = []
    for name, details in health.get("checks", {}).items():
        status = details.get("status", "unknown")
        services_summary.append({
            "name": name,
            "status": status,
            "emoji": status_emoji.get(status, "⚪"),
            "latency": details.get("latency_ms")
        })
    
    return {
        "system": {
            "status": health["status"],
            "emoji": status_emoji.get(health["status"], "⚪"),
            "version": health.get("version", "1.0.0"),
            "environment": health.get("environment", "development"),
            "uptime": health.get("uptime_seconds", 0)
        },
        "services": services_summary,
        "endpoints": {
            "metrics": "/observability/metrics",
            "health": "/health/full",
            "ready": "/health/ready",
            "live": "/health/live"
        }
    }
