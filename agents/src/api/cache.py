# agents/src/api/cache.py
"""
API endpoints para gerenciamento de cache.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
import structlog

from src.services.cache import get_cache

logger = structlog.get_logger()
router = APIRouter(prefix="/cache", tags=["cache"])


# ===== MODELS =====

class CacheStatsResponse(BaseModel):
    """Estatísticas do cache."""
    hits: int
    misses: int
    total: int
    hit_rate: str
    using_redis: bool


class CacheHealthResponse(BaseModel):
    """Saúde do cache."""
    status: str
    backend: str
    used_memory: Optional[str] = None
    connected_clients: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None


class InvalidateResponse(BaseModel):
    """Resposta de invalidação."""
    invalidated: int
    pattern: str


class CacheSetRequest(BaseModel):
    """Request para set de cache."""
    key: str
    value: Any
    ttl: int = 3600


class CacheSetResponse(BaseModel):
    """Resposta de set."""
    success: bool
    key: str
    ttl: int


# ===== ENDPOINTS =====

@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_stats() -> CacheStatsResponse:
    """
    Retorna estatísticas do cache.
    
    Métricas:
    - hits: Cache hits
    - misses: Cache misses
    - hit_rate: Taxa de acerto
    - using_redis: Se está usando Redis ou fallback local
    """
    cache = get_cache()
    stats = cache.get_stats()
    return CacheStatsResponse(**stats)


@router.get("/health", response_model=CacheHealthResponse)
async def get_cache_health() -> CacheHealthResponse:
    """
    Verifica saúde do cache.
    
    Retorna:
    - status: healthy, degraded, unhealthy
    - backend: redis ou local
    - used_memory: Memória usada (se Redis)
    """
    cache = get_cache()
    health = await cache.health_check()
    return CacheHealthResponse(**health)


@router.get("/get/{key}")
async def get_cache_value(key: str) -> dict[str, Any]:
    """
    Obtém valor do cache por chave.
    """
    cache = get_cache()
    value = await cache.get_json(key)
    
    if value is None:
        raise HTTPException(
            status_code=404,
            detail=f"Key '{key}' not found in cache"
        )
    
    return {"key": key, "value": value}


@router.post("/set", response_model=CacheSetResponse)
async def set_cache_value(request: CacheSetRequest) -> CacheSetResponse:
    """
    Define valor no cache.
    """
    cache = get_cache()
    success = await cache.set_json(request.key, request.value, ttl=request.ttl)
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to set cache value"
        )
    
    logger.info("cache_set_via_api", key=request.key, ttl=request.ttl)
    
    return CacheSetResponse(
        success=True,
        key=request.key,
        ttl=request.ttl
    )


@router.delete("/key/{key}")
async def delete_cache_key(key: str) -> dict[str, Any]:
    """
    Remove chave específica do cache.
    """
    cache = get_cache()
    deleted = await cache.delete(key)
    
    logger.info("cache_key_deleted", key=key, deleted=deleted)
    
    return {"key": key, "deleted": deleted}


@router.delete("/invalidate/{pattern}", response_model=InvalidateResponse)
async def invalidate_cache(pattern: str) -> InvalidateResponse:
    """
    Invalida cache por padrão.
    
    Exemplos:
    - /cache/invalidate/user:* - Invalida todas as chaves user:*
    - /cache/invalidate/embedding:* - Invalida embeddings
    - /cache/invalidate/rag:* - Invalida queries RAG
    """
    cache = get_cache()
    count = await cache.delete_pattern(f"*{pattern}*")
    
    logger.info("cache_invalidated_via_api", pattern=pattern, count=count)
    
    return InvalidateResponse(invalidated=count, pattern=pattern)


@router.delete("/flush")
async def flush_cache() -> dict[str, str]:
    """
    Limpa todo o cache.
    
    ⚠️ CUIDADO: Remove TODOS os dados do cache!
    Usar apenas em desenvolvimento ou emergências.
    """
    cache = get_cache()
    client = await cache._get_client()
    await client.flushdb()
    
    logger.warning("cache_flushed_via_api")
    
    return {"status": "flushed", "message": "All cache data has been cleared"}
