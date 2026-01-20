# agents/src/services/auth/audit.py
"""
Logging de auditoria para ações sensíveis.
"""

from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import structlog

from src.services.cache import get_cache

logger = structlog.get_logger()


class AuditAction(str, Enum):
    """Ações auditáveis."""
    
    # Auth
    LOGIN = "auth.login"
    LOGOUT = "auth.logout"
    LOGIN_FAILED = "auth.login_failed"
    PASSWORD_CHANGED = "auth.password_changed"
    
    # API Keys
    APIKEY_CREATED = "apikey.created"
    APIKEY_REVOKED = "apikey.revoked"
    APIKEY_ROTATED = "apikey.rotated"
    
    # Data
    DATA_EXPORTED = "data.exported"
    DATA_DELETED = "data.deleted"
    
    # Documents
    DOCUMENT_IMPORTED = "document.imported"
    DOCUMENT_DELETED = "document.deleted"
    
    # Settings
    SETTINGS_CHANGED = "settings.changed"
    
    # Agents
    AGENT_CALLED = "agent.called"
    AGENT_ERROR = "agent.error"
    
    # Webhooks
    WEBHOOK_CREATED = "webhook.created"
    WEBHOOK_DELETED = "webhook.deleted"
    
    # Admin
    USER_CREATED = "admin.user_created"
    USER_DELETED = "admin.user_deleted"
    PERMISSION_CHANGED = "admin.permission_changed"


@dataclass
class AuditEvent:
    """Evento de auditoria."""
    
    id: str
    action: AuditAction
    timestamp: datetime
    user_id: str
    organization_id: int
    branch_id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: dict[str, Any] = field(default_factory=dict)
    success: bool = True
    error_message: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "action": self.action.value,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "organization_id": self.organization_id,
            "branch_id": self.branch_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "success": self.success,
            "error_message": self.error_message
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "AuditEvent":
        return cls(
            id=data["id"],
            action=AuditAction(data["action"]),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            user_id=data["user_id"],
            organization_id=data["organization_id"],
            branch_id=data["branch_id"],
            ip_address=data.get("ip_address"),
            user_agent=data.get("user_agent"),
            resource_type=data.get("resource_type"),
            resource_id=data.get("resource_id"),
            details=data.get("details", {}),
            success=data.get("success", True),
            error_message=data.get("error_message")
        )


class AuditLogger:
    """
    Logger de auditoria.
    
    Uso:
        audit = get_audit_logger()
        
        await audit.log(
            action=AuditAction.LOGIN,
            user_id="user123",
            org_id=1,
            branch_id=1,
            ip_address="192.168.1.1",
            details={"method": "password"}
        )
    """
    
    def __init__(self):
        self._cache = get_cache()
        logger.info("audit_logger_initialized")
    
    async def log(
        self,
        action: AuditAction,
        user_id: str,
        org_id: int,
        branch_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> AuditEvent:
        """Registra evento de auditoria."""
        import uuid
        
        event = AuditEvent(
            id=str(uuid.uuid4()),
            action=action,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            organization_id=org_id,
            branch_id=branch_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            success=success,
            error_message=error_message
        )
        
        # Salvar no cache (90 dias de retenção)
        await self._cache.set_json(
            f"audit:{event.id}",
            event.to_dict(),
            ttl=86400 * 90
        )
        
        # Índice por organização + data
        date_key = event.timestamp.strftime("%Y-%m-%d")
        index_key = f"audit:index:{org_id}:{date_key}"
        
        index = await self._cache.get_json(index_key) or []
        index.append(event.id)
        await self._cache.set_json(index_key, index, ttl=86400 * 90)
        
        # Log estruturado
        logger.info(
            "audit_event",
            action=action.value,
            user_id=user_id,
            org_id=org_id,
            resource_type=resource_type,
            resource_id=resource_id,
            success=success
        )
        
        return event
    
    async def get_events(
        self,
        org_id: int,
        start_date: datetime,
        end_date: Optional[datetime] = None,
        action: Optional[AuditAction] = None,
        user_id: Optional[str] = None,
        limit: int = 100
    ) -> list[AuditEvent]:
        """Busca eventos de auditoria."""
        end_date = end_date or datetime.utcnow()
        events = []
        
        # Iterar por dias
        current = start_date
        while current <= end_date and len(events) < limit:
            date_key = current.strftime("%Y-%m-%d")
            index_key = f"audit:index:{org_id}:{date_key}"
            
            event_ids = await self._cache.get_json(index_key) or []
            
            for event_id in event_ids:
                if len(events) >= limit:
                    break
                
                data = await self._cache.get_json(f"audit:{event_id}")
                if not data:
                    continue
                
                event = AuditEvent.from_dict(data)
                
                # Filtros
                if action and event.action != action:
                    continue
                if user_id and event.user_id != user_id:
                    continue
                
                events.append(event)
            
            current = datetime(current.year, current.month, current.day) + timedelta(days=1)
        
        # Ordenar por timestamp desc
        events.sort(key=lambda e: e.timestamp, reverse=True)
        
        return events[:limit]


# Singleton
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Retorna instância singleton."""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger
