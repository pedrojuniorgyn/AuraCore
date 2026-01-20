# agents/src/middleware/audit.py
"""
Middleware para capturar contexto de auditoria.
"""

from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from src.services.audit.audit_service import set_audit_context

logger = structlog.get_logger()


class AuditContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware que captura informações para auditoria.
    
    Define:
    - actor_ip: IP do cliente
    - actor_user_agent: User-Agent
    - actor_id: ID do usuário autenticado (obtido depois pelo auth)
    """
    
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Response]
    ) -> Response:
        # Obter IP real (considerar proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else None
        
        # User-Agent
        user_agent = request.headers.get("User-Agent")
        
        # Definir contexto inicial (actor_id será definido após autenticação)
        set_audit_context(
            actor_id=None,
            actor_ip=client_ip,
            actor_user_agent=user_agent
        )
        
        return await call_next(request)
