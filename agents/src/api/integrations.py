# agents/src/api/integrations.py
"""
API endpoints para gerenciamento de integrações.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.services.integrations import (
    get_integration_hub,
    IntegrationType,
    MessagePriority
)
from src.services.auth import Permission
from src.middleware.auth import require_auth, require_permission

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ===== SCHEMAS =====

class IntegrationCreate(BaseModel):
    """Request para criar integração."""
    type: str
    name: str
    credentials: dict
    settings: dict = {}
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "slack",
                "name": "Alertas de Vendas",
                "credentials": {
                    "webhook_url": "https://hooks.slack.com/services/..."
                },
                "settings": {
                    "default_recipient": "#vendas"
                }
            }
        }


class IntegrationResponse(BaseModel):
    """Response de integração."""
    id: str
    type: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class IntegrationUpdate(BaseModel):
    """Request para atualizar integração."""
    name: Optional[str] = None
    credentials: Optional[dict] = None
    settings: Optional[dict] = None
    is_active: Optional[bool] = None


class SendMessageRequest(BaseModel):
    """Request para enviar mensagem."""
    recipient: str
    content: str
    subject: Optional[str] = None
    content_type: str = "text"
    priority: str = "normal"
    metadata: dict = {}


class SendResultResponse(BaseModel):
    """Response de envio."""
    success: bool
    message_id: str
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    latency_ms: float


class TestResultResponse(BaseModel):
    """Response de teste de conexão."""
    success: bool
    error: Optional[str] = None


# ===== ENDPOINTS =====

@router.post("", response_model=IntegrationResponse, status_code=201)
async def create_integration(
    data: IntegrationCreate,
    auth: dict = Depends(require_permission(Permission.ADMIN_SETTINGS))
):
    """
    Cria nova integração.
    
    Tipos suportados: slack, teams, email, webhook
    """
    try:
        integration_type = IntegrationType(data.type.lower())
    except ValueError:
        raise HTTPException(400, f"Invalid type: {data.type}")
    
    hub = get_integration_hub()
    
    try:
        config = await hub.create_integration(
            type=integration_type,
            name=data.name,
            org_id=auth["organization_id"],
            branch_id=auth["branch_id"],
            credentials=data.credentials,
            settings=data.settings
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    
    return IntegrationResponse(
        id=config.id,
        type=config.type.value,
        name=config.name,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.get("", response_model=list[IntegrationResponse])
async def list_integrations(
    type: Optional[str] = None,
    auth: dict = Depends(require_permission(Permission.ADMIN_SETTINGS))
):
    """Lista integrações da organização."""
    hub = get_integration_hub()
    
    integration_type = None
    if type:
        try:
            integration_type = IntegrationType(type.lower())
        except ValueError:
            raise HTTPException(400, f"Invalid type: {type}")
    
    integrations = await hub.list_integrations(
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],  # CRÍTICO: Multi-tenancy
        type=integration_type
    )
    
    return [
        IntegrationResponse(
            id=config.id,
            type=config.type.value,
            name=config.name,
            is_active=config.is_active,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
        for config in integrations
    ]


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: str,
    auth: dict = Depends(require_permission(Permission.ADMIN_SETTINGS))
):
    """Obtém detalhes de uma integração."""
    hub = get_integration_hub()
    config = await hub.get_integration(integration_id)
    
    if not config:
        raise HTTPException(404, "Integration not found")
    
    # Verificar ownership
    if config.organization_id != auth["organization_id"]:
        raise HTTPException(403, "Access denied")
    
    return IntegrationResponse(
        id=config.id,
        type=config.type.value,
        name=config.name,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.patch("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: str,
    data: IntegrationUpdate,
    auth: dict = Depends(require_permission(Permission.ADMIN_SETTINGS))
):
    """Atualiza uma integração."""
    hub = get_integration_hub()
    
    config = await hub.get_integration(integration_id)
    if not config:
        raise HTTPException(404, "Integration not found")
    
    if config.organization_id != auth["organization_id"]:
        raise HTTPException(403, "Access denied")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    try:
        updated_config = await hub.update_integration(integration_id, **updates)
    except ValueError as e:
        raise HTTPException(400, str(e))
    
    if not updated_config:
        raise HTTPException(500, "Failed to update integration")
    
    return IntegrationResponse(
        id=updated_config.id,
        type=updated_config.type.value,
        name=updated_config.name,
        is_active=updated_config.is_active,
        created_at=updated_config.created_at,
        updated_at=updated_config.updated_at
    )


@router.delete("/{integration_id}", status_code=204)
async def delete_integration(
    integration_id: str,
    auth: dict = Depends(require_permission(Permission.ADMIN_SETTINGS))
):
    """Remove uma integração."""
    hub = get_integration_hub()
    
    config = await hub.get_integration(integration_id)
    if not config:
        raise HTTPException(404, "Integration not found")
    
    if config.organization_id != auth["organization_id"]:
        raise HTTPException(403, "Access denied")
    
    await hub.delete_integration(integration_id)


@router.post("/{integration_id}/send", response_model=SendResultResponse)
async def send_message(
    integration_id: str,
    data: SendMessageRequest,
    auth: dict = Depends(require_permission(Permission.AGENT_WRITE))
):
    """Envia mensagem via integração."""
    hub = get_integration_hub()
    
    config = await hub.get_integration(integration_id)
    if not config:
        raise HTTPException(404, "Integration not found")
    
    if config.organization_id != auth["organization_id"]:
        raise HTTPException(403, "Access denied")
    
    try:
        priority = MessagePriority(data.priority.lower())
    except ValueError:
        priority = MessagePriority.NORMAL
    
    result = await hub.send_message(
        integration_id=integration_id,
        recipient=data.recipient,
        content=data.content,
        subject=data.subject,
        content_type=data.content_type,
        priority=priority,
        metadata=data.metadata
    )
    
    return SendResultResponse(
        success=result.success,
        message_id=result.message_id,
        provider_message_id=result.provider_message_id,
        error=result.error,
        latency_ms=result.latency_ms
    )


@router.post("/{integration_id}/test", response_model=TestResultResponse)
async def test_integration(
    integration_id: str,
    auth: dict = Depends(require_permission(Permission.ADMIN_SETTINGS))
):
    """Testa conexão da integração."""
    hub = get_integration_hub()
    
    config = await hub.get_integration(integration_id)
    if not config:
        raise HTTPException(404, "Integration not found")
    
    if config.organization_id != auth["organization_id"]:
        raise HTTPException(403, "Access denied")
    
    success, error = await hub.test_integration(integration_id)
    
    return TestResultResponse(success=success, error=error)
