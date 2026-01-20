# agents/src/middleware/rate_limit.py
"""
Rate limiting para APIs.
"""

import time
from typing import Optional, Callable, Any
from dataclasses import dataclass
import structlog

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from src.services.cache import get_cache

logger = structlog.get_logger()


@dataclass
class RateLimitConfig:
    """Configuração de rate limit."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_size: int = 10
    enabled: bool = True


class RateLimiter:
    """
    Rate limiter usando Redis.
    
    Algoritmo: Sliding Window Counter (simplificado)
    """
    
    def __init__(self, config: Optional[RateLimitConfig] = None):
        self.config = config or RateLimitConfig()
    
    async def is_allowed(
        self,
        key: str,
        cost: int = 1
    ) -> tuple[bool, dict[str, Any]]:
        """
        Verifica se request é permitido.
        
        Returns:
            (allowed, info)
        """
        if not self.config.enabled:
            return True, {"limit": 0, "remaining": 0, "reset": 0, "window": "disabled"}
        
        cache = get_cache()
        now = time.time()
        minute_key = f"ratelimit:{key}:minute"
        hour_key = f"ratelimit:{key}:hour"
        
        # Verificar limite por minuto
        minute_count = await self._get_window_count(cache, minute_key)
        if minute_count + cost > self.config.requests_per_minute:
            return False, {
                "limit": self.config.requests_per_minute,
                "remaining": max(0, self.config.requests_per_minute - minute_count),
                "reset": int(now + 60),
                "window": "minute"
            }
        
        # Verificar limite por hora
        hour_count = await self._get_window_count(cache, hour_key)
        if hour_count + cost > self.config.requests_per_hour:
            return False, {
                "limit": self.config.requests_per_hour,
                "remaining": max(0, self.config.requests_per_hour - hour_count),
                "reset": int(now + 3600),
                "window": "hour"
            }
        
        # Registrar request
        await self._record_request(cache, minute_key, 60)
        await self._record_request(cache, hour_key, 3600)
        
        return True, {
            "limit": self.config.requests_per_minute,
            "remaining": self.config.requests_per_minute - minute_count - cost,
            "reset": int(now + 60),
            "window": "minute"
        }
    
    async def _get_window_count(
        self,
        cache: Any,
        key: str
    ) -> int:
        """Conta requests na janela."""
        count_str = await cache.get(key)
        return int(count_str) if count_str else 0
    
    async def _record_request(
        self,
        cache: Any,
        key: str,
        window_size: int
    ) -> None:
        """Registra request na janela."""
        count_str = await cache.get(key)
        count = int(count_str) if count_str else 0
        await cache.set(key, str(count + 1), ttl=window_size)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware FastAPI para rate limiting."""
    
    # Paths que não devem ter rate limit
    EXEMPT_PATHS = {
        "/health",
        "/health/live", 
        "/health/ready",
        "/metrics",
        "/observability/metrics",
        "/observability/status",
        "/docs",
        "/openapi.json",
    }
    
    def __init__(
        self,
        app: Any,
        config: Optional[RateLimitConfig] = None,
        key_func: Optional[Callable[[Request], str]] = None
    ):
        super().__init__(app)
        self.limiter = RateLimiter(config)
        self.key_func = key_func or self._default_key
        self.config = config or RateLimitConfig()
    
    def _default_key(self, request: Request) -> str:
        """Chave padrão: IP do cliente."""
        if request.client:
            return request.client.host
        # Fallback para header X-Forwarded-For
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return "unknown"
    
    async def dispatch(
        self, 
        request: Request, 
        call_next: Callable[[Request], Any]
    ) -> Response:
        # Skip para paths isentos
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)
        
        # Skip se desabilitado
        if not self.config.enabled:
            return await call_next(request)
        
        key = self.key_func(request)
        allowed, info = await self.limiter.is_allowed(key)
        
        if not allowed:
            retry_after = info["reset"] - int(time.time())
            logger.warning(
                "rate_limit_exceeded", 
                key=key, 
                path=request.url.path,
                info=info
            )
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": retry_after,
                    "limit": info["limit"],
                    "window": info["window"]
                },
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": str(info["remaining"]),
                    "X-RateLimit-Reset": str(info["reset"]),
                    "Retry-After": str(retry_after)
                }
            )
        
        response = await call_next(request)
        
        # Adicionar headers de rate limit
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(info["reset"])
        
        return response
