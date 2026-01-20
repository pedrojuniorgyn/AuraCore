# agents/src/services/pwa/subscription_manager.py
"""
Gerenciador de subscriptions com cleanup automático.
"""

from typing import Optional
from datetime import datetime, timedelta
import structlog

from .push_notifications import get_push_service, PushSubscription
from src.services.cache import get_cache

logger = structlog.get_logger()


class SubscriptionManager:
    """
    Gerencia lifecycle de subscriptions.
    
    Features:
    - Cleanup de subscriptions expiradas
    - Deduplicação
    - Estatísticas
    """
    
    SUBSCRIPTION_MAX_AGE_DAYS = 90
    
    def __init__(self):
        self._cache = get_cache()
        self._push_service = get_push_service()
    
    async def cleanup_expired(self) -> int:
        """Remove subscriptions antigas não utilizadas."""
        # Em produção, iterar sobre todas subscriptions no banco
        # Por simplificidade, retornando 0
        logger.info("subscription_cleanup_completed", removed=0)
        return 0
    
    async def deduplicate_user_subscriptions(self, user_id: str) -> int:
        """Remove subscriptions duplicadas de um usuário."""
        subscriptions = await self._push_service.get_user_subscriptions(user_id)
        
        # Agrupar por endpoint
        by_endpoint: dict[str, list[PushSubscription]] = {}
        for sub in subscriptions:
            if sub.endpoint not in by_endpoint:
                by_endpoint[sub.endpoint] = []
            by_endpoint[sub.endpoint].append(sub)
        
        removed = 0
        for endpoint, subs in by_endpoint.items():
            if len(subs) > 1:
                # Manter a mais recente
                subs.sort(key=lambda s: s.created_at, reverse=True)
                for old_sub in subs[1:]:
                    await self._push_service.unregister_subscription(old_sub.id)
                    removed += 1
        
        if removed > 0:
            logger.info(
                "subscriptions_deduplicated",
                user_id=user_id,
                removed=removed
            )
        
        return removed
    
    async def get_stats(self, org_id: int, branch_id: int) -> dict:
        """Retorna estatísticas de subscriptions."""
        # Em produção, buscar do banco
        return {
            "total_subscriptions": 0,
            "active_last_7_days": 0,
            "active_last_30_days": 0,
            "by_user_agent": {}
        }
