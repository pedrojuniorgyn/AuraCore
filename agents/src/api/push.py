# agents/src/api/push.py
"""
API endpoints para Push Notifications.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.services.pwa import get_push_service, PushPayload
from src.services.auth import Permission
from src.middleware.auth import require_auth, require_permission

router = APIRouter(prefix="/push", tags=["Push Notifications"])


# ===== SCHEMAS =====

class SubscriptionRegister(BaseModel):
    """Request para registrar subscription."""
    endpoint: str
    keys: dict  # {p256dh, auth}
    user_agent: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/...",
                "keys": {
                    "p256dh": "BNcRdreALRFX...",
                    "auth": "tBHItJI5svbpez..."
                },
                "user_agent": "Mozilla/5.0..."
            }
        }


class SubscriptionResponse(BaseModel):
    """Response de subscription."""
    id: str
    endpoint: str
    created_at: datetime


class SendNotificationRequest(BaseModel):
    """Request para enviar notificação."""
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    image: Optional[str] = None
    tag: Optional[str] = None
    data: dict = {}
    actions: list = []
    require_interaction: bool = False
    silent: bool = False


class SendNotificationResponse(BaseModel):
    """Response de envio."""
    success: bool
    sent_count: int
    failed_count: int
    errors: list[str] = []


class VapidKeyResponse(BaseModel):
    """Response com VAPID public key."""
    public_key: Optional[str]
    available: bool


# ===== ENDPOINTS =====

@router.get("/vapid-key", response_model=VapidKeyResponse)
async def get_vapid_key():
    """
    Retorna VAPID public key para o cliente.
    
    O cliente usa esta chave para criar subscriptions.
    """
    service = get_push_service()
    
    return VapidKeyResponse(
        public_key=service.public_key,
        available=service.is_available
    )


@router.post("/subscribe", response_model=SubscriptionResponse, status_code=201)
async def register_subscription(
    data: SubscriptionRegister,
    auth: dict = Depends(require_auth)
):
    """
    Registra subscription de push notification.
    
    Chamado pelo Service Worker após obter permissão.
    """
    service = get_push_service()
    
    if not service.is_available:
        raise HTTPException(503, "Push notifications not available")
    
    subscription = await service.register_subscription(
        user_id=auth["user_id"],
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        endpoint=data.endpoint,
        keys=data.keys,
        user_agent=data.user_agent
    )
    
    return SubscriptionResponse(
        id=subscription.id,
        endpoint=subscription.endpoint,
        created_at=subscription.created_at
    )


@router.delete("/subscribe/{subscription_id}", status_code=204)
async def unregister_subscription(
    subscription_id: str,
    auth: dict = Depends(require_auth)
):
    """Remove subscription."""
    service = get_push_service()
    
    subscription = await service.get_subscription(subscription_id)
    
    if not subscription:
        raise HTTPException(404, "Subscription not found")
    
    # Verificar ownership
    if subscription.user_id != auth["user_id"]:
        raise HTTPException(403, "Access denied")
    
    await service.unregister_subscription(subscription_id)


@router.get("/subscriptions", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    auth: dict = Depends(require_auth)
):
    """Lista subscriptions do usuário atual."""
    service = get_push_service()
    
    subscriptions = await service.get_user_subscriptions(auth["user_id"])
    
    return [
        SubscriptionResponse(
            id=s.id,
            endpoint=s.endpoint,
            created_at=s.created_at
        )
        for s in subscriptions
    ]


@router.post("/send/user/{user_id}", response_model=SendNotificationResponse)
async def send_to_user(
    user_id: str,
    data: SendNotificationRequest,
    auth: dict = Depends(require_permission(Permission.ADMIN_USERS))
):
    """
    Envia notificação para todos dispositivos de um usuário.
    
    Requer permissão admin:users.
    """
    service = get_push_service()
    
    if not service.is_available:
        raise HTTPException(503, "Push notifications not available")
    
    payload = PushPayload(
        title=data.title,
        body=data.body,
        icon=data.icon,
        badge=data.badge,
        image=data.image,
        tag=data.tag,
        data=data.data,
        actions=data.actions,
        require_interaction=data.require_interaction,
        silent=data.silent
    )
    
    results = await service.broadcast_to_user(user_id, payload)
    
    success_count = sum(1 for r in results if r.success)
    errors = [r.error for r in results if not r.success and r.error]
    
    return SendNotificationResponse(
        success=success_count > 0,
        sent_count=success_count,
        failed_count=len(results) - success_count,
        errors=errors[:5]  # Limitar erros retornados
    )


@router.post("/send/me", response_model=SendNotificationResponse)
async def send_to_self(
    data: SendNotificationRequest,
    auth: dict = Depends(require_auth)
):
    """
    Envia notificação de teste para os próprios dispositivos.
    
    Útil para testar configuração de push.
    """
    service = get_push_service()
    
    if not service.is_available:
        raise HTTPException(503, "Push notifications not available")
    
    payload = PushPayload(
        title=data.title,
        body=data.body,
        icon=data.icon,
        tag=data.tag or "test",
        data=data.data
    )
    
    results = await service.broadcast_to_user(auth["user_id"], payload)
    
    success_count = sum(1 for r in results if r.success)
    
    return SendNotificationResponse(
        success=success_count > 0,
        sent_count=success_count,
        failed_count=len(results) - success_count
    )
