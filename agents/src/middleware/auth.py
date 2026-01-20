# agents/src/middleware/auth.py
"""
Middleware de autenticação.
"""

from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
import structlog

from src.services.auth import (
    get_api_key_manager,
    get_jwt_service,
    get_audit_logger,
    APIKey,
    TokenPayload,
    Permission,
    has_permission,
    AuditAction
)

logger = structlog.get_logger()

# Security schemes
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


async def get_api_key(
    api_key: Optional[str] = Depends(api_key_header)
) -> Optional[APIKey]:
    """Extrai e valida API Key do header."""
    if not api_key:
        return None
    
    manager = get_api_key_manager()
    return await manager.validate_key(api_key)


async def get_jwt_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[TokenPayload]:
    """Extrai e valida JWT do header Authorization."""
    if not credentials:
        return None
    
    jwt_service = get_jwt_service()
    return jwt_service.verify_token(credentials.credentials)


async def get_current_auth(
    request: Request,
    api_key: Optional[APIKey] = Depends(get_api_key),
    jwt_payload: Optional[TokenPayload] = Depends(get_jwt_token)
) -> dict:
    """
    Obtém autenticação atual (API Key ou JWT).
    
    Returns:
        Dict com informações de autenticação
    """
    if api_key:
        return {
            "type": "api_key",
            "user_id": api_key.created_by,
            "organization_id": api_key.organization_id,
            "branch_id": api_key.branch_id,
            "permissions": api_key.permissions,
            "api_key": api_key
        }
    
    if jwt_payload:
        return {
            "type": "jwt",
            "user_id": jwt_payload.sub,
            "organization_id": jwt_payload.org_id,
            "branch_id": jwt_payload.branch_id,
            "permissions": jwt_payload.permissions,
            "jwt_payload": jwt_payload
        }
    
    return {
        "type": "anonymous",
        "user_id": None,
        "organization_id": None,
        "branch_id": None,
        "permissions": []
    }


def require_auth(
    request: Request,
    auth: dict = Depends(get_current_auth)
) -> dict:
    """Dependency que requer autenticação."""
    if auth["type"] == "anonymous":
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer, ApiKey"}
        )
    return auth


def require_permission(permission: Permission | str):
    """
    Factory para dependency que requer permissão específica.
    
    Uso:
        @router.get("/admin", dependencies=[Depends(require_permission(Permission.ADMIN_SETTINGS))])
        async def admin_endpoint():
            ...
    """
    async def dependency(
        request: Request,
        auth: dict = Depends(require_auth)
    ) -> dict:
        if not has_permission(auth["permissions"], permission):
            # Log tentativa de acesso negado
            audit = get_audit_logger()
            await audit.log(
                action=AuditAction.AGENT_ERROR,
                user_id=auth["user_id"],
                org_id=auth["organization_id"],
                branch_id=auth["branch_id"],
                ip_address=request.client.host if request.client else None,
                details={"required_permission": str(permission)},
                success=False,
                error_message="Permission denied"
            )
            
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission}"
            )
        
        return auth
    
    return dependency


def require_permissions(*permissions: Permission | str):
    """Factory para dependency que requer múltiplas permissões."""
    async def dependency(
        request: Request,
        auth: dict = Depends(require_auth)
    ) -> dict:
        for permission in permissions:
            if not has_permission(auth["permissions"], permission):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied: {permission}"
                )
        return auth
    
    return dependency
