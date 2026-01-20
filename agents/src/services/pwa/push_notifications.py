# agents/src/services/pwa/push_notifications.py
"""
Serviço de Push Notifications (Web Push).

Features:
- VAPID keys
- Subscription management
- Send notifications
- Batch sending
"""

import os
import json
import uuid
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime
import structlog

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    WebPushException = Exception  # Fallback type

from src.services.cache import get_cache

logger = structlog.get_logger()


@dataclass
class PushSubscription:
    """Subscription de um dispositivo."""
    id: str
    user_id: str
    organization_id: int
    branch_id: int
    endpoint: str
    keys: dict  # {p256dh, auth}
    user_agent: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None


@dataclass
class PushPayload:
    """Payload de uma notificação."""
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    image: Optional[str] = None
    tag: Optional[str] = None
    data: dict = field(default_factory=dict)
    actions: list = field(default_factory=list)
    require_interaction: bool = False
    silent: bool = False


@dataclass
class SendResult:
    """Resultado do envio."""
    success: bool
    subscription_id: str
    error: Optional[str] = None
    status_code: Optional[int] = None


class PushNotificationService:
    """
    Serviço de Push Notifications.
    
    Uso:
        service = get_push_service()
        
        # Registrar subscription
        sub = await service.register_subscription(
            user_id="user123",
            org_id=1,
            branch_id=1,
            endpoint="https://...",
            keys={"p256dh": "...", "auth": "..."}
        )
        
        # Enviar notificação
        result = await service.send_notification(
            subscription_id=sub.id,
            payload=PushPayload(
                title="Nova mensagem",
                body="Você tem uma nova mensagem"
            )
        )
        
        # Broadcast para usuário
        results = await service.broadcast_to_user(
            user_id="user123",
            payload=PushPayload(title="Alerta", body="...")
        )
    """
    
    def __init__(
        self,
        vapid_private_key: Optional[str] = None,
        vapid_public_key: Optional[str] = None,
        vapid_claims_email: Optional[str] = None
    ):
        self._private_key = vapid_private_key or os.getenv("VAPID_PRIVATE_KEY")
        self._public_key = vapid_public_key or os.getenv("VAPID_PUBLIC_KEY")
        self._claims_email = vapid_claims_email or os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@auracore.com")
        
        self._cache = get_cache()
        
        if not WEBPUSH_AVAILABLE:
            logger.warning("pywebpush not installed, push notifications disabled")
        elif not self._private_key:
            logger.warning("VAPID_PRIVATE_KEY not set, push notifications disabled")
        else:
            logger.info("push_notification_service_initialized")
    
    @property
    def public_key(self) -> Optional[str]:
        """Retorna VAPID public key para o cliente."""
        return self._public_key
    
    @property
    def is_available(self) -> bool:
        """Verifica se serviço está disponível."""
        return WEBPUSH_AVAILABLE and bool(self._private_key)
    
    # ===== SUBSCRIPTION MANAGEMENT =====
    
    async def register_subscription(
        self,
        user_id: str,
        org_id: int,
        branch_id: int,
        endpoint: str,
        keys: dict,
        user_agent: Optional[str] = None
    ) -> PushSubscription:
        """Registra nova subscription."""
        subscription = PushSubscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            organization_id=org_id,
            branch_id=branch_id,
            endpoint=endpoint,
            keys=keys,
            user_agent=user_agent
        )
        
        # Salvar no cache
        await self._save_subscription(subscription)
        
        # Adicionar ao índice do usuário
        await self._add_to_user_index(user_id, subscription.id)
        
        logger.info(
            "push_subscription_registered",
            subscription_id=subscription.id,
            user_id=user_id
        )
        
        return subscription
    
    async def get_subscription(self, subscription_id: str) -> Optional[PushSubscription]:
        """Obtém subscription por ID."""
        data = await self._cache.get_json(f"push:sub:{subscription_id}")
        
        if not data:
            return None
        
        return PushSubscription(
            id=data["id"],
            user_id=data["user_id"],
            organization_id=data["organization_id"],
            branch_id=data["branch_id"],
            endpoint=data["endpoint"],
            keys=data["keys"],
            user_agent=data.get("user_agent"),
            created_at=datetime.fromisoformat(data["created_at"]),
            last_used_at=datetime.fromisoformat(data["last_used_at"]) if data.get("last_used_at") else None
        )
    
    async def get_user_subscriptions(self, user_id: str) -> list[PushSubscription]:
        """Obtém todas subscriptions de um usuário."""
        index = await self._cache.get_json(f"push:user:{user_id}")
        
        if not index:
            return []
        
        subscriptions = []
        for sub_id in index.get("subscription_ids", []):
            sub = await self.get_subscription(sub_id)
            if sub:
                subscriptions.append(sub)
        
        return subscriptions
    
    async def unregister_subscription(self, subscription_id: str) -> bool:
        """Remove subscription."""
        subscription = await self.get_subscription(subscription_id)
        
        if not subscription:
            return False
        
        # Remover do cache
        await self._cache.delete(f"push:sub:{subscription_id}")
        
        # Remover do índice do usuário
        await self._remove_from_user_index(subscription.user_id, subscription_id)
        
        logger.info("push_subscription_unregistered", subscription_id=subscription_id)
        
        return True
    
    # ===== SEND NOTIFICATIONS =====
    
    async def send_notification(
        self,
        subscription_id: str,
        payload: PushPayload
    ) -> SendResult:
        """Envia notificação para uma subscription."""
        if not self.is_available:
            return SendResult(
                success=False,
                subscription_id=subscription_id,
                error="Push notifications not available"
            )
        
        subscription = await self.get_subscription(subscription_id)
        
        if not subscription:
            return SendResult(
                success=False,
                subscription_id=subscription_id,
                error="Subscription not found"
            )
        
        return await self._send_to_subscription(subscription, payload)
    
    async def broadcast_to_user(
        self,
        user_id: str,
        payload: PushPayload
    ) -> list[SendResult]:
        """Envia notificação para todos dispositivos de um usuário."""
        subscriptions = await self.get_user_subscriptions(user_id)
        
        results = []
        for subscription in subscriptions:
            result = await self._send_to_subscription(subscription, payload)
            results.append(result)
            
            # Remover subscriptions inválidas
            if not result.success and result.status_code in [404, 410]:
                await self.unregister_subscription(subscription.id)
        
        return results
    
    async def broadcast_to_organization(
        self,
        org_id: int,
        branch_id: int,
        payload: PushPayload
    ) -> list[SendResult]:
        """Envia notificação para todos usuários de uma filial."""
        # Em produção, buscar do banco de dados
        # Por simplificidade, retornando lista vazia
        return []
    
    async def _send_to_subscription(
        self,
        subscription: PushSubscription,
        payload: PushPayload
    ) -> SendResult:
        """Envia para uma subscription específica."""
        if not WEBPUSH_AVAILABLE:
            return SendResult(
                success=False,
                subscription_id=subscription.id,
                error="pywebpush not installed"
            )
        
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": subscription.keys
        }
        
        payload_json = json.dumps({
            "title": payload.title,
            "body": payload.body,
            "icon": payload.icon or "/icons/icon-192x192.png",
            "badge": payload.badge or "/icons/badge-72x72.png",
            "image": payload.image,
            "tag": payload.tag,
            "data": payload.data,
            "actions": payload.actions,
            "requireInteraction": payload.require_interaction,
            "silent": payload.silent
        })
        
        try:
            response = webpush(
                subscription_info=subscription_info,
                data=payload_json,
                vapid_private_key=self._private_key,
                vapid_claims={"sub": self._claims_email}
            )
            
            # Atualizar last_used
            subscription.last_used_at = datetime.utcnow()
            await self._save_subscription(subscription)
            
            logger.info(
                "push_notification_sent",
                subscription_id=subscription.id,
                user_id=subscription.user_id
            )
            
            return SendResult(
                success=True,
                subscription_id=subscription.id,
                status_code=response.status_code
            )
            
        except WebPushException as e:
            logger.error(
                "push_notification_failed",
                subscription_id=subscription.id,
                error=str(e),
                status_code=e.response.status_code if hasattr(e, 'response') and e.response else None
            )
            
            return SendResult(
                success=False,
                subscription_id=subscription.id,
                error=str(e),
                status_code=e.response.status_code if hasattr(e, 'response') and e.response else None
            )
        except Exception as e:
            logger.error(
                "push_notification_error",
                subscription_id=subscription.id,
                error=str(e)
            )
            
            return SendResult(
                success=False,
                subscription_id=subscription.id,
                error=str(e)
            )
    
    # ===== HELPERS =====
    
    async def _save_subscription(self, subscription: PushSubscription):
        """Salva subscription no cache."""
        await self._cache.set_json(
            f"push:sub:{subscription.id}",
            {
                "id": subscription.id,
                "user_id": subscription.user_id,
                "organization_id": subscription.organization_id,
                "branch_id": subscription.branch_id,
                "endpoint": subscription.endpoint,
                "keys": subscription.keys,
                "user_agent": subscription.user_agent,
                "created_at": subscription.created_at.isoformat(),
                "last_used_at": subscription.last_used_at.isoformat() if subscription.last_used_at else None
            },
            ttl=2592000  # 30 dias
        )
    
    async def _add_to_user_index(self, user_id: str, subscription_id: str):
        """Adiciona subscription ao índice do usuário."""
        index = await self._cache.get_json(f"push:user:{user_id}")
        
        if not index:
            index = {"subscription_ids": []}
        
        if subscription_id not in index["subscription_ids"]:
            index["subscription_ids"].append(subscription_id)
        
        await self._cache.set_json(f"push:user:{user_id}", index, ttl=2592000)
    
    async def _remove_from_user_index(self, user_id: str, subscription_id: str):
        """Remove subscription do índice do usuário."""
        index = await self._cache.get_json(f"push:user:{user_id}")
        
        if index and subscription_id in index.get("subscription_ids", []):
            index["subscription_ids"].remove(subscription_id)
            await self._cache.set_json(f"push:user:{user_id}", index, ttl=2592000)


# Singleton
_push_service: Optional[PushNotificationService] = None


def get_push_service() -> PushNotificationService:
    """Retorna instância singleton."""
    global _push_service
    if _push_service is None:
        _push_service = PushNotificationService()
    return _push_service
