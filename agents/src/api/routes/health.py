"""Health check endpoints."""

from fastapi import APIRouter
import httpx

from src.config import get_settings

router = APIRouter()


@router.get("")
async def health_check():
    """
    Verifica saúde do serviço de agentes.
    
    Retorna status dos componentes:
    - agents: Serviço de agentes
    - knowledge_base: ChromaDB
    - auracore_api: API do AuraCore
    """
    
    settings = get_settings()
    
    checks = {
        "status": "healthy",
        "service": "auracore-agents",
        "version": "1.0.0",
        "components": {
            "agents": "ok",
            "knowledge_base": "unknown",
            "auracore_api": "unknown",
        },
    }
    
    # Verificar ChromaDB
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.chroma_url}/api/v1/heartbeat",
            )
            checks["components"]["knowledge_base"] = (
                "ok" if response.status_code == 200 else "error"
            )
    except Exception as e:
        checks["components"]["knowledge_base"] = f"error: {str(e)[:50]}"
    
    # Verificar AuraCore API
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.auracore_api_url}/api/health",
            )
            checks["components"]["auracore_api"] = (
                "ok" if response.status_code == 200 else "error"
            )
    except Exception as e:
        checks["components"]["auracore_api"] = f"error: {str(e)[:50]}"
    
    # Determinar status geral
    component_statuses = list(checks["components"].values())
    if all(s == "ok" for s in component_statuses):
        checks["status"] = "healthy"
    elif checks["components"]["agents"] == "ok":
        checks["status"] = "degraded"
    else:
        checks["status"] = "unhealthy"
    
    return checks


@router.get("/ready")
async def readiness_check():
    """Verifica se o serviço está pronto para receber requisições."""
    return {"ready": True}


@router.get("/live")
async def liveness_check():
    """Verifica se o serviço está vivo."""
    return {"live": True}
