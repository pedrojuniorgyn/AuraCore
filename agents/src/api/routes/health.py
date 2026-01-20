"""Health check endpoints."""

from datetime import datetime

from fastapi import APIRouter, HTTPException
import httpx

from src.config import get_settings
from src.core.health import get_full_health_status

router = APIRouter()


@router.get("")
async def health_check():
    """
    Health check básico.
    
    Retorna status simplificado para probes rápidos.
    """
    return {
        "status": "ok",
        "service": "auracore-agents",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/full")
async def full_health_check():
    """
    Health check completo com verificação de dependências.
    
    Verifica:
    - API (sempre OK se chegou aqui)
    - ChromaDB (vector store)
    - LLM Provider (Anthropic)
    - AuraCore API (backend)
    - Memory Store (SQLite)
    """
    return await get_full_health_status()


@router.get("/ready")
async def readiness_check():
    """
    Readiness check para Kubernetes/Coolify.
    
    Retorna 200 apenas se todos os serviços críticos estão OK.
    Retorna 503 se o serviço não está pronto para receber tráfego.
    """
    health = await get_full_health_status()
    
    if health["status"] == "unhealthy":
        raise HTTPException(status_code=503, detail=health)
    
    return health


@router.get("/live")
async def liveness_check():
    """
    Liveness check para Kubernetes/Coolify.
    
    Apenas verifica se o processo está respondendo.
    """
    return {"live": True, "timestamp": datetime.utcnow().isoformat()}
