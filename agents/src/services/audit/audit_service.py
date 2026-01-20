# agents/src/services/audit/audit_service.py
"""
Serviço principal de auditoria.
"""

import uuid
from typing import Optional
from datetime import datetime
from contextvars import ContextVar
import structlog

from .audit_events import (
    AuditEvent,
    AuditAction,
    AuditResource,
    AuditSeverity,
    ACTION_SEVERITY
)
from .audit_storage import AuditStorage, AuditQuery

logger = structlog.get_logger()

# Context var para informações do request
_audit_context: ContextVar[dict] = ContextVar("audit_context", default={})


def set_audit_context(
    actor_id: Optional[str] = None,
    actor_ip: Optional[str] = None,
    actor_user_agent: Optional[str] = None,
    session_id: Optional[str] = None
) -> None:
    """Define contexto de auditoria para o request atual."""
    _audit_context.set({
        "actor_id": actor_id,
        "actor_ip": actor_ip,
        "actor_user_agent": actor_user_agent,
        "session_id": session_id
    })


def get_audit_context() -> dict:
    """Obtém contexto de auditoria."""
    return _audit_context.get()


class AuditService:
    """
    Serviço de auditoria.
    
    Uso:
        service = get_audit_service()
        
        # Registrar evento
        await service.log(
            action=AuditAction.CREATE,
            resource=AuditResource.NFE,
            resource_id="123",
            org_id=1,
            branch_id=1,
            new_value={"chave": "...", "valor": 1000}
        )
        
        # Buscar eventos
        events, total = await service.query(
            org_id=1,
            branch_id=1,
            action=AuditAction.NFE_EMITTED,
            start_date=datetime(2026, 1, 1)
        )
    """
    
    def __init__(self) -> None:
        self._storage = AuditStorage()
        logger.info("audit_service_initialized")
    
    async def log(
        self,
        action: AuditAction,
        resource: AuditResource,
        org_id: int,
        branch_id: int,
        resource_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        actor_type: str = "user",
        success: bool = True,
        error_message: Optional[str] = None,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        metadata: Optional[dict] = None
    ) -> AuditEvent:
        """
        Registra evento de auditoria.
        
        Se actor_id não for fornecido, usa o contexto do request.
        """
        # Obter contexto
        ctx = get_audit_context()
        
        # Determinar severidade
        severity = ACTION_SEVERITY.get(action, AuditSeverity.LOW)
        
        # Se falha, aumentar severidade
        if not success and severity == AuditSeverity.LOW:
            severity = AuditSeverity.MEDIUM
        
        # Sanitizar valores (remover PII se necessário)
        sanitized_old = self._sanitize_value(old_value) if old_value else None
        sanitized_new = self._sanitize_value(new_value) if new_value else None
        
        event = AuditEvent(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            branch_id=branch_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            actor_id=actor_id or ctx.get("actor_id"),
            actor_type=actor_type,
            actor_ip=ctx.get("actor_ip"),
            actor_user_agent=ctx.get("actor_user_agent"),
            severity=severity,
            success=success,
            error_message=error_message,
            old_value=sanitized_old,
            new_value=sanitized_new,
            metadata=metadata or {}
        )
        
        # Persistir
        event = await self._storage.append(event)
        
        # Log estruturado
        logger.info(
            "audit_event",
            event_id=event.id,
            action=action.value,
            resource=resource.value,
            resource_id=resource_id,
            actor_id=event.actor_id,
            success=success,
            severity=severity.value
        )
        
        return event
    
    async def query(
        self,
        org_id: int,
        branch_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action: Optional[AuditAction] = None,
        resource: Optional[AuditResource] = None,
        resource_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        severity: Optional[AuditSeverity] = None,
        success: Optional[bool] = None,
        page: int = 1,
        page_size: int = 50
    ) -> tuple[list[AuditEvent], int]:
        """Busca eventos com filtros."""
        query = AuditQuery(
            organization_id=org_id,
            branch_id=branch_id,
            start_date=start_date,
            end_date=end_date,
            action=action,
            resource=resource,
            resource_id=resource_id,
            actor_id=actor_id,
            severity=severity,
            success=success,
            page=page,
            page_size=page_size
        )
        
        return await self._storage.query(query)
    
    async def get_event(
        self,
        event_id: str,
        org_id: int,
        branch_id: int
    ) -> Optional[AuditEvent]:
        """Obtém evento por ID."""
        return await self._storage.get_by_id(event_id, org_id, branch_id)
    
    async def verify_integrity(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> tuple[bool, list[str]]:
        """Verifica integridade da chain."""
        return await self._storage.verify_chain_integrity(
            org_id, branch_id, start_date, end_date
        )
    
    async def export(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime,
        export_format: str = "json"
    ) -> str:
        """Exporta logs para compliance."""
        return await self._storage.export_for_compliance(
            org_id, branch_id, start_date, end_date, export_format
        )
    
    # ===== SHORTCUTS =====
    
    async def log_login(
        self,
        org_id: int,
        branch_id: int,
        user_id: str,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> AuditEvent:
        """Registra login."""
        return await self.log(
            action=AuditAction.LOGIN if success else AuditAction.LOGIN_FAILED,
            resource=AuditResource.USER,
            resource_id=user_id,
            org_id=org_id,
            branch_id=branch_id,
            actor_id=user_id,
            success=success,
            error_message=error_message
        )
    
    async def log_fiscal_operation(
        self,
        action: AuditAction,
        resource: AuditResource,
        resource_id: str,
        org_id: int,
        branch_id: int,
        actor_id: str,
        document_data: dict
    ) -> AuditEvent:
        """Registra operação fiscal."""
        # Sanitizar dados fiscais
        safe_data = {
            "chave": document_data.get("chave"),
            "numero": document_data.get("numero"),
            "serie": document_data.get("serie"),
            "valor_total": document_data.get("valor_total"),
            "data_emissao": document_data.get("data_emissao")
        }
        
        return await self.log(
            action=action,
            resource=resource,
            resource_id=resource_id,
            org_id=org_id,
            branch_id=branch_id,
            actor_id=actor_id,
            new_value=safe_data
        )
    
    def _sanitize_value(self, value: dict) -> dict:
        """Remove PII sensível dos valores."""
        if not value:
            return value
        
        sensitive_keys = [
            "password", "senha", "secret", "token",
            "cpf", "cnpj", "rg", "credit_card",
            "account_number", "routing_number"
        ]
        
        sanitized: dict = {}
        for key, val in value.items():
            key_lower = key.lower()
            
            if any(s in key_lower for s in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            elif isinstance(val, dict):
                sanitized[key] = self._sanitize_value(val)
            else:
                sanitized[key] = val
        
        return sanitized


# Singleton
_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """Retorna instância singleton."""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service
