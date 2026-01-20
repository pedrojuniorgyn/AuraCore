# agents/src/services/cache/redis_cache.py
"""
Cache distribuído com Redis.

Features:
- TTL configurável
- Serialização JSON automática
- Fallback para cache local se Redis indisponível
- Métricas de hit/miss
"""

import json
import time
from typing import Optional, Any
import structlog

logger = structlog.get_logger()

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("redis não instalado, usando cache local")


class LocalCache:
    """Cache local em memória (fallback)."""
    
    def __init__(self, max_size: int = 1000):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._max_size = max_size
    
    async def get(self, key: str) -> Optional[str]:
        if key in self._cache:
            value, expiry = self._cache[key]
            if expiry > time.time():
                return value
            del self._cache[key]
        return None
    
    async def set(self, key: str, value: str, ex: int = 3600) -> bool:
        if len(self._cache) >= self._max_size:
            # Limpar 10% dos itens mais antigos
            sorted_keys = sorted(
                self._cache.keys(), 
                key=lambda k: self._cache[k][1]
            )
            for k in sorted_keys[:int(self._max_size * 0.1)]:
                del self._cache[k]
        self._cache[key] = (value, time.time() + ex)
        return True
    
    async def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    async def exists(self, key: str) -> bool:
        return await self.get(key) is not None
    
    async def flushdb(self) -> bool:
        self._cache.clear()
        return True
    
    async def ping(self) -> bool:
        return True
    
    async def info(self, section: str = "") -> dict[str, Any]:
        return {
            "used_memory_human": f"{len(self._cache)} items",
            "connected_clients": 1
        }


class RedisCache:
    """
    Cache distribuído com Redis.
    
    Uso:
        cache = get_cache()
        
        # String simples
        await cache.set("key", "value", ttl=3600)
        value = await cache.get("key")
        
        # Objetos JSON
        await cache.set_json("user:123", {"name": "John"}, ttl=3600)
        user = await cache.get_json("user:123")
    """
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        prefix: str = "auracore:"
    ):
        self.prefix = prefix
        self._client: Optional[Any] = None
        self._local_cache = LocalCache()
        self._use_local = not REDIS_AVAILABLE
        
        self._config = {
            "host": host,
            "port": port,
            "db": db,
            "password": password,
            "decode_responses": True
        }
        
        # Métricas
        self._hits = 0
        self._misses = 0
        
        logger.info(
            "cache_initialized", 
            use_redis=not self._use_local, 
            prefix=prefix
        )
    
    async def _get_client(self) -> Any:
        """Retorna cliente Redis ou cache local."""
        if self._use_local:
            return self._local_cache
        
        if self._client is None:
            try:
                self._client = redis.Redis(**self._config)
                await self._client.ping()
                logger.info("redis_connected")
            except Exception as e:
                logger.warning("redis_connection_failed", error=str(e))
                self._use_local = True
                return self._local_cache
        
        return self._client
    
    def _make_key(self, key: str) -> str:
        """Adiciona prefixo à chave."""
        return f"{self.prefix}{key}"
    
    # ===== OPERAÇÕES BÁSICAS =====
    
    async def get(self, key: str) -> Optional[str]:
        """Obtém valor do cache."""
        client = await self._get_client()
        full_key = self._make_key(key)
        
        value = await client.get(full_key)
        
        if value is not None:
            self._hits += 1
            logger.debug("cache_hit", key=key)
        else:
            self._misses += 1
            logger.debug("cache_miss", key=key)
        
        return value
    
    async def set(
        self,
        key: str,
        value: str,
        ttl: int = 3600
    ) -> bool:
        """Define valor no cache com TTL."""
        client = await self._get_client()
        full_key = self._make_key(key)
        
        try:
            await client.set(full_key, value, ex=ttl)
            logger.debug("cache_set", key=key, ttl=ttl)
            return True
        except Exception as e:
            logger.error("cache_set_error", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Remove valor do cache."""
        client = await self._get_client()
        full_key = self._make_key(key)
        
        try:
            await client.delete(full_key)
            logger.debug("cache_delete", key=key)
            return True
        except Exception as e:
            logger.error("cache_delete_error", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Verifica se chave existe."""
        client = await self._get_client()
        full_key = self._make_key(key)
        return await client.exists(full_key) > 0
    
    # ===== OPERAÇÕES JSON =====
    
    async def get_json(self, key: str) -> Optional[Any]:
        """Obtém objeto JSON do cache."""
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return None
        return None
    
    async def set_json(
        self,
        key: str,
        value: Any,
        ttl: int = 3600
    ) -> bool:
        """Define objeto JSON no cache."""
        try:
            json_str = json.dumps(value, default=str)
            return await self.set(key, json_str, ttl)
        except Exception as e:
            logger.error("cache_set_json_error", key=key, error=str(e))
            return False
    
    # ===== OPERAÇÕES BATCH =====
    
    async def mget(self, keys: list[str]) -> list[Optional[str]]:
        """Obtém múltiplos valores."""
        client = await self._get_client()
        full_keys = [self._make_key(k) for k in keys]
        
        if self._use_local:
            return [await client.get(k) for k in full_keys]
        
        return await client.mget(full_keys)
    
    async def mset(self, mapping: dict[str, str], ttl: int = 3600) -> bool:
        """Define múltiplos valores."""
        try:
            for key, value in mapping.items():
                await self.set(key, value, ttl)
            return True
        except Exception as e:
            logger.error("cache_mset_error", error=str(e))
            return False
    
    # ===== PATTERN MATCHING =====
    
    async def delete_pattern(self, pattern: str) -> int:
        """Remove todas as chaves que correspondem ao padrão."""
        client = await self._get_client()
        full_pattern = self._make_key(pattern)
        
        if self._use_local:
            # Local cache: delete all matching keys
            count = 0
            keys_to_delete = [
                k for k in self._local_cache._cache.keys() 
                if pattern.replace("*", "") in k
            ]
            for k in keys_to_delete:
                del self._local_cache._cache[k]
                count += 1
            return count
        
        try:
            keys = []
            async for key in client.scan_iter(match=full_pattern):
                keys.append(key)
            
            if keys:
                await client.delete(*keys)
            
            logger.info("cache_delete_pattern", pattern=pattern, count=len(keys))
            return len(keys)
        except Exception as e:
            logger.error("cache_delete_pattern_error", error=str(e))
            return 0
    
    # ===== MÉTRICAS =====
    
    def get_stats(self) -> dict[str, Any]:
        """Retorna estatísticas do cache."""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        
        return {
            "hits": self._hits,
            "misses": self._misses,
            "total": total,
            "hit_rate": f"{hit_rate:.2f}%",
            "using_redis": not self._use_local
        }
    
    async def health_check(self) -> dict[str, Any]:
        """Verifica saúde do cache."""
        client = await self._get_client()
        
        if self._use_local:
            return {
                "status": "degraded",
                "backend": "local",
                "message": "Usando cache local (Redis indisponível)"
            }
        
        try:
            await client.ping()
            info = await client.info("memory")
            
            return {
                "status": "healthy",
                "backend": "redis",
                "used_memory": info.get("used_memory_human", "unknown"),
                "connected_clients": info.get("connected_clients", 0)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "backend": "redis",
                "error": str(e)
            }


# Singleton
_cache: Optional[RedisCache] = None


def get_cache() -> RedisCache:
    """Retorna instância singleton do cache."""
    global _cache
    if _cache is None:
        import os
        _cache = RedisCache(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            password=os.getenv("REDIS_PASSWORD")
        )
    return _cache
