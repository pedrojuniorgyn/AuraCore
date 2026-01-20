# agents/src/api/auth.py
"""
API endpoints de autenticação.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.services.auth import (
    get_api_key_manager,
    get_jwt_service,
    get_audit_logger,
    Permission,
    AuditAction
)
from src.middleware.auth import require_auth, require_permission

router = APIRouter(prefix="/auth", tags=["Auth"])


# ===== SCHEMAS =====

class APIKeyCreateRequest(BaseModel):
    """Request para criar API Key."""
    name: str
    expires_in_days: Optional[int] = 365
    permissions: list[str] = ["*"]
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000


class APIKeyResponse(BaseModel):
    """Response de API Key (sem a key raw)."""
    id: str
    name: str
    status: str
    permissions: list[str]
    rate_limit_per_minute: int
    rate_limit_per_hour: int
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]


class APIKeyCreatedResponse(BaseModel):
    """Response ao criar API Key (inclui key raw)."""
    api_key: APIKeyResponse
    raw_key: str
    warning: str = "Esta é a única vez que a chave será exibida. Guarde-a em local seguro."


class TokenRequest(BaseModel):
    """Request para criar token JWT."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Response com tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """Request para refresh de token."""
    refresh_token: str


# ===== API KEY ENDPOINTS =====

@router.post(
    "/api-keys",
    response_model=APIKeyCreatedResponse,
    dependencies=[Depends(require_permission(Permission.APIKEY_CREATE))]
)
async def create_api_key(
    data: APIKeyCreateRequest,
    request: Request,
    auth: dict = Depends(require_auth)
):
    """
    Cria uma nova API Key.
    
    ⚠️ A raw_key só é retornada uma vez! Guarde-a em local seguro.
    """
    manager = get_api_key_manager()
    audit = get_audit_logger()
    
    api_key, raw_key = await manager.create_key(
        name=data.name,
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        created_by=auth["user_id"],
        permissions=data.permissions,
        expires_in_days=data.expires_in_days,
        rate_limit_per_minute=data.rate_limit_per_minute,
        rate_limit_per_hour=data.rate_limit_per_hour
    )
    
    # Audit log
    await audit.log(
        action=AuditAction.APIKEY_CREATED,
        user_id=auth["user_id"],
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        ip_address=request.client.host if request.client else None,
        resource_type="api_key",
        resource_id=api_key.id,
        details={"name": data.name}
    )
    
    return APIKeyCreatedResponse(
        api_key=APIKeyResponse(
            id=api_key.id,
            name=api_key.name,
            status=api_key.status.value,
            permissions=api_key.permissions,
            rate_limit_per_minute=api_key.rate_limit_per_minute,
            rate_limit_per_hour=api_key.rate_limit_per_hour,
            created_at=api_key.created_at,
            expires_at=api_key.expires_at,
            last_used_at=api_key.last_used_at
        ),
        raw_key=raw_key
    )


@router.get(
    "/api-keys",
    response_model=list[APIKeyResponse],
    dependencies=[Depends(require_permission(Permission.APIKEY_READ))]
)
async def list_api_keys(auth: dict = Depends(require_auth)):
    """Lista API Keys da organização."""
    manager = get_api_key_manager()
    keys = await manager.list_keys(auth["organization_id"])
    
    return [
        APIKeyResponse(
            id=key.id,
            name=key.name,
            status=key.status.value,
            permissions=key.permissions,
            rate_limit_per_minute=key.rate_limit_per_minute,
            rate_limit_per_hour=key.rate_limit_per_hour,
            created_at=key.created_at,
            expires_at=key.expires_at,
            last_used_at=key.last_used_at
        )
        for key in keys
    ]


@router.delete(
    "/api-keys/{key_id}",
    status_code=204,
    dependencies=[Depends(require_permission(Permission.APIKEY_REVOKE))]
)
async def revoke_api_key(
    key_id: str,
    request: Request,
    auth: dict = Depends(require_auth)
):
    """Revoga uma API Key."""
    manager = get_api_key_manager()
    audit = get_audit_logger()
    
    # Verificar se key pertence à organização
    key = await manager.get_key_by_id(key_id)
    if not key or key.organization_id != auth["organization_id"]:
        raise HTTPException(404, "API Key não encontrada")
    
    success = await manager.revoke_key(key_id)
    if not success:
        raise HTTPException(400, "Não foi possível revogar a API Key")
    
    # Audit log
    await audit.log(
        action=AuditAction.APIKEY_REVOKED,
        user_id=auth["user_id"],
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        ip_address=request.client.host if request.client else None,
        resource_type="api_key",
        resource_id=key_id
    )


@router.post(
    "/api-keys/{key_id}/rotate",
    response_model=APIKeyCreatedResponse,
    dependencies=[Depends(require_permission(Permission.APIKEY_CREATE))]
)
async def rotate_api_key(
    key_id: str,
    request: Request,
    auth: dict = Depends(require_auth)
):
    """
    Rotaciona uma API Key (cria nova, revoga antiga).
    
    ⚠️ A nova raw_key só é retornada uma vez!
    """
    manager = get_api_key_manager()
    audit = get_audit_logger()
    
    # Verificar se key pertence à organização
    old_key = await manager.get_key_by_id(key_id)
    if not old_key or old_key.organization_id != auth["organization_id"]:
        raise HTTPException(404, "API Key não encontrada")
    
    result = await manager.rotate_key(key_id)
    new_key, raw_key = result
    if not new_key or not raw_key:
        raise HTTPException(400, "Não foi possível rotacionar a API Key")
    
    # Audit log
    await audit.log(
        action=AuditAction.APIKEY_ROTATED,
        user_id=auth["user_id"],
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        ip_address=request.client.host if request.client else None,
        resource_type="api_key",
        resource_id=new_key.id,
        details={"old_key_id": key_id}
    )
    
    return APIKeyCreatedResponse(
        api_key=APIKeyResponse(
            id=new_key.id,
            name=new_key.name,
            status=new_key.status.value,
            permissions=new_key.permissions,
            rate_limit_per_minute=new_key.rate_limit_per_minute,
            rate_limit_per_hour=new_key.rate_limit_per_hour,
            created_at=new_key.created_at,
            expires_at=new_key.expires_at,
            last_used_at=new_key.last_used_at
        ),
        raw_key=raw_key
    )


# ===== JWT ENDPOINTS =====

@router.post("/token", response_model=TokenResponse)
async def login(data: TokenRequest, request: Request):
    """
    Autentica usuário e retorna tokens JWT.
    
    Em produção, validar contra banco de dados.
    """
    audit = get_audit_logger()
    jwt_service = get_jwt_service()
    
    # TODO: Validar credenciais contra banco de dados
    # Por enquanto, aceita qualquer usuário para demo
    if not data.username or not data.password:
        await audit.log(
            action=AuditAction.LOGIN_FAILED,
            user_id=data.username,
            org_id=0,
            branch_id=0,
            ip_address=request.client.host if request.client else None,
            success=False,
            error_message="Invalid credentials"
        )
        raise HTTPException(401, "Invalid credentials")
    
    # Criar tokens
    access_token = jwt_service.create_token(
        user_id=data.username,
        org_id=1,  # TODO: Obter do banco
        branch_id=1,  # TODO: Obter do banco
        permissions=["*"]  # TODO: Obter do banco
    )
    
    refresh_token = jwt_service.create_refresh_token(
        user_id=data.username,
        org_id=1,
        branch_id=1
    )
    
    # Audit log
    await audit.log(
        action=AuditAction.LOGIN,
        user_id=data.username,
        org_id=1,
        branch_id=1,
        ip_address=request.client.host if request.client else None,
        details={"method": "password"}
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest):
    """Atualiza access token usando refresh token."""
    jwt_service = get_jwt_service()
    
    new_access_token = jwt_service.refresh_access_token(data.refresh_token)
    if not new_access_token:
        raise HTTPException(401, "Invalid or expired refresh token")
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=data.refresh_token,
        expires_in=3600
    )


@router.get("/me")
async def get_current_user(auth: dict = Depends(require_auth)):
    """Retorna informações do usuário autenticado."""
    return {
        "user_id": auth["user_id"],
        "organization_id": auth["organization_id"],
        "branch_id": auth["branch_id"],
        "permissions": auth["permissions"],
        "auth_type": auth["type"]
    }
