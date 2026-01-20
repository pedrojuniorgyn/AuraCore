"""
API endpoints para gerenciamento de webhooks.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
import time

from src.services.webhooks import (
    get_webhook_service,
    EventType,
    WebhookEvent
)
from src.services.webhooks.webhook_delivery import WebhookDelivery

router = APIRouter()


# ===== SCHEMAS =====

class WebhookEndpointCreate(BaseModel):
    """Schema para criar endpoint."""
    url: HttpUrl
    events: list[str]
    secret: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.com/webhook",
                "events": ["agent.message.processed", "document.imported"],
                "secret": "meu-secret-opcional"
            }
        }


class WebhookEndpointResponse(BaseModel):
    """Schema de resposta de endpoint."""
    id: str
    url: str
    events: list[str]
    is_active: bool
    created_at: datetime


class WebhookTestRequest(BaseModel):
    """Schema para testar webhook."""
    endpoint_id: str


class WebhookTestResponse(BaseModel):
    """Schema de resposta de teste."""
    success: bool
    status_code: Optional[int]
    response_time_ms: float
    error: Optional[str]


class EventTypeInfo(BaseModel):
    """Informação sobre tipo de evento."""
    type: str
    description: str


class EventTypesResponse(BaseModel):
    """Schema de tipos de eventos."""
    event_types: list[EventTypeInfo]


# ===== DEPENDENCY =====

async def get_org_context(
    x_organization_id: int = Header(..., alias="X-Organization-ID"),
    x_branch_id: int = Header(..., alias="X-Branch-ID")
) -> tuple[int, int]:
    """Extrai contexto de organização dos headers."""
    return x_organization_id, x_branch_id


# ===== ENDPOINTS =====

@router.get("/events", response_model=EventTypesResponse)
async def list_event_types():
    """
    Lista todos os tipos de eventos disponíveis.
    
    Retorna lista de eventos que podem ser assinados via webhook.
    """
    return EventTypesResponse(
        event_types=[
            EventTypeInfo(
                type=event.value,
                description=event.name.replace("_", " ").title()
            )
            for event in EventType
        ]
    )


@router.get("/", response_model=list[WebhookEndpointResponse])
async def list_endpoints(
    context: tuple[int, int] = Depends(get_org_context)
):
    """
    Lista webhooks registrados da organização.
    """
    org_id, branch_id = context
    service = get_webhook_service()
    
    endpoints = await service.list_endpoints(org_id, branch_id)
    
    return [
        WebhookEndpointResponse(
            id=ep.id,
            url=ep.url,
            events=[e.value for e in ep.events],
            is_active=ep.is_active,
            created_at=ep.created_at
        )
        for ep in endpoints
    ]


@router.post("/", response_model=WebhookEndpointResponse, status_code=201)
async def create_endpoint(
    data: WebhookEndpointCreate,
    context: tuple[int, int] = Depends(get_org_context)
):
    """
    Registra novo webhook endpoint.
    
    O endpoint receberá eventos via POST com:
    - Header `X-Webhook-Signature`: HMAC-SHA256 (se secret configurado)
    - Header `X-Webhook-Event`: Tipo do evento
    - Header `X-Webhook-ID`: ID único do evento
    - Body: JSON com dados do evento
    """
    org_id, branch_id = context
    service = get_webhook_service()
    
    # Validar eventos
    try:
        events = [EventType(e) for e in data.events]
    except ValueError as e:
        raise HTTPException(400, f"Evento inválido: {e}")
    
    endpoint = await service.register_endpoint(
        url=str(data.url),
        events=events,
        org_id=org_id,
        branch_id=branch_id,
        secret=data.secret
    )
    
    return WebhookEndpointResponse(
        id=endpoint.id,
        url=endpoint.url,
        events=[e.value for e in endpoint.events],
        is_active=endpoint.is_active,
        created_at=endpoint.created_at
    )


@router.delete("/{endpoint_id}", status_code=204)
async def delete_endpoint(
    endpoint_id: str,
    context: tuple[int, int] = Depends(get_org_context)
):
    """
    Remove webhook endpoint.
    """
    org_id, branch_id = context
    service = get_webhook_service()
    
    endpoint = await service.get_endpoint(endpoint_id)
    if not endpoint:
        raise HTTPException(404, "Endpoint não encontrado")
    
    if endpoint.organization_id != org_id or endpoint.branch_id != branch_id:
        raise HTTPException(403, "Acesso negado")
    
    await service.unregister_endpoint(endpoint_id)


@router.post("/test", response_model=WebhookTestResponse)
async def test_endpoint(
    data: WebhookTestRequest,
    context: tuple[int, int] = Depends(get_org_context)
):
    """
    Testa entrega de webhook.
    
    Envia evento de teste para o endpoint especificado.
    """
    org_id, branch_id = context
    service = get_webhook_service()
    
    endpoint = await service.get_endpoint(data.endpoint_id)
    if not endpoint:
        raise HTTPException(404, "Endpoint não encontrado")
    
    if endpoint.organization_id != org_id:
        raise HTTPException(403, "Acesso negado")
    
    # Criar evento de teste
    test_event = WebhookEvent(
        type=EventType.AGENT_MESSAGE_PROCESSED,
        organization_id=org_id,
        branch_id=branch_id,
        data={
            "test": True,
            "message": "Este é um evento de teste",
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    delivery = WebhookDelivery(
        event=test_event,
        endpoint_url=endpoint.url,
        secret=endpoint.secret,
        max_retries=1
    )
    
    start = time.perf_counter()
    success = await delivery.deliver()
    duration = (time.perf_counter() - start) * 1000
    
    last_attempt = delivery.attempts[-1] if delivery.attempts else None
    
    return WebhookTestResponse(
        success=success,
        status_code=last_attempt.status_code if last_attempt else None,
        response_time_ms=duration,
        error=last_attempt.error if last_attempt else None
    )
