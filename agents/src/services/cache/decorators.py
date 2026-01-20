# agents/src/services/cache/decorators.py
"""
Decorators para cache automático.
"""

import functools
from typing import Callable, Optional, Any, TypeVar
import structlog

from .redis_cache import get_cache
from .cache_keys import CacheKeys

logger = structlog.get_logger()

T = TypeVar('T')


def cached(
    ttl: int = 3600,
    key_prefix: Optional[str] = None,
    key_builder: Optional[Callable[..., str]] = None
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator para cachear resultado de função.
    
    Args:
        ttl: Tempo de vida em segundos (default: 1 hora)
        key_prefix: Prefixo customizado para chave
        key_builder: Função para construir chave customizada
    
    Uso:
        @cached(ttl=300)
        async def get_user(user_id: str):
            return await db.get_user(user_id)
        
        @cached(ttl=600, key_prefix="tax")
        async def calculate_tax(uf_origem: str, uf_destino: str):
            return await tax_service.calculate(uf_origem, uf_destino)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            cache = get_cache()
            
            # Construir chave
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                prefix = key_prefix or func.__name__
                args_hash = CacheKeys.hash_dict({
                    "args": [str(a) for a in args],
                    "kwargs": {k: str(v) for k, v in kwargs.items()}
                })
                cache_key = f"{prefix}:{args_hash}"
            
            # Tentar obter do cache
            cached_value = await cache.get_json(cache_key)
            if cached_value is not None:
                logger.debug(
                    "cache_decorator_hit", 
                    func=func.__name__, 
                    key=cache_key
                )
                return cached_value
            
            # Executar função
            result = await func(*args, **kwargs)
            
            # Salvar no cache
            if result is not None:
                await cache.set_json(cache_key, result, ttl=ttl)
                logger.debug(
                    "cache_decorator_set", 
                    func=func.__name__, 
                    key=cache_key, 
                    ttl=ttl
                )
            
            return result
        
        return wrapper
    return decorator


def cache_aside(
    ttl: int = 3600,
    key_builder: Optional[Callable[..., str]] = None
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator para pattern Cache-Aside.
    
    Diferente de @cached, permite controlar quando invalidar o cache.
    
    Uso:
        @cache_aside(ttl=300, key_builder=lambda user_id: f"user:{user_id}")
        async def get_user(user_id: str):
            return await db.get_user(user_id)
        
        # Para invalidar:
        await get_user.invalidate(user_id="123")
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            cache = get_cache()
            
            # Construir chave
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                args_data = {
                    "args": [str(a) for a in args],
                    "kwargs": {k: str(v) for k, v in kwargs.items()}
                }
                cache_key = f"{func.__name__}:{CacheKeys.hash_dict(args_data)}"
            
            # Tentar obter do cache
            cached_value = await cache.get_json(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Executar função
            result = await func(*args, **kwargs)
            
            # Salvar no cache
            if result is not None:
                await cache.set_json(cache_key, result, ttl=ttl)
            
            return result
        
        # Método para invalidar cache
        async def invalidate(*args: Any, **kwargs: Any) -> bool:
            cache = get_cache()
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                args_data = {
                    "args": [str(a) for a in args],
                    "kwargs": {k: str(v) for k, v in kwargs.items()}
                }
                cache_key = f"{func.__name__}:{CacheKeys.hash_dict(args_data)}"
            return await cache.delete(cache_key)
        
        wrapper.invalidate = invalidate  # type: ignore
        return wrapper
    
    return decorator


def invalidate_on_change(
    patterns: list[str]
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator para invalidar cache quando função modifica dados.
    
    Uso:
        @invalidate_on_change(patterns=["user:*", "profile:*"])
        async def update_user(user_id: str, data: dict):
            await db.update_user(user_id, data)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            # Executar função
            result = await func(*args, **kwargs)
            
            # Invalidar patterns
            cache = get_cache()
            total_invalidated = 0
            for pattern in patterns:
                count = await cache.delete_pattern(pattern)
                total_invalidated += count
            
            logger.info(
                "cache_invalidated", 
                func=func.__name__, 
                patterns=patterns,
                count=total_invalidated
            )
            
            return result
        
        return wrapper
    return decorator
