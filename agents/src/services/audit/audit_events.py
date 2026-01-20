# agents/src/services/audit/audit_events.py
"""
Definição de eventos de auditoria.
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import hashlib
import json


class AuditAction(str, Enum):
    """Ações auditáveis."""
    
    # Authentication
    LOGIN = "auth.login"
    LOGOUT = "auth.logout"
    LOGIN_FAILED = "auth.login_failed"
    PASSWORD_CHANGE = "auth.password_change"
    MFA_ENABLED = "auth.mfa_enabled"
    MFA_DISABLED = "auth.mfa_disabled"
    
    # Authorization
    PERMISSION_GRANTED = "authz.permission_granted"
    PERMISSION_REVOKED = "authz.permission_revoked"
    ROLE_ASSIGNED = "authz.role_assigned"
    ROLE_REMOVED = "authz.role_removed"
    
    # CRUD Operations
    CREATE = "data.create"
    READ = "data.read"
    UPDATE = "data.update"
    DELETE = "data.delete"
    EXPORT = "data.export"
    IMPORT = "data.import"
    
    # Fiscal Operations (CRÍTICO)
    NFE_EMITTED = "fiscal.nfe_emitted"
    NFE_CANCELLED = "fiscal.nfe_cancelled"
    CTE_EMITTED = "fiscal.cte_emitted"
    CTE_CANCELLED = "fiscal.cte_cancelled"
    SPED_GENERATED = "fiscal.sped_generated"
    TAX_CALCULATED = "fiscal.tax_calculated"
    
    # Financial Operations (CRÍTICO)
    PAYMENT_APPROVED = "financial.payment_approved"
    PAYMENT_REJECTED = "financial.payment_rejected"
    TITLE_CREATED = "financial.title_created"
    TITLE_CANCELLED = "financial.title_cancelled"
    
    # Configuration
    SETTING_CHANGED = "config.setting_changed"
    INTEGRATION_CREATED = "config.integration_created"
    INTEGRATION_DELETED = "config.integration_deleted"
    API_KEY_CREATED = "config.api_key_created"
    API_KEY_REVOKED = "config.api_key_revoked"
    
    # System
    SYSTEM_ERROR = "system.error"
    SECURITY_ALERT = "system.security_alert"
    DATA_BREACH_DETECTED = "system.data_breach"


class AuditResource(str, Enum):
    """Recursos auditáveis."""
    USER = "user"
    ORGANIZATION = "organization"
    BRANCH = "branch"
    ROLE = "role"
    PERMISSION = "permission"
    API_KEY = "api_key"
    
    # Fiscal
    NFE = "nfe"
    CTE = "cte"
    MDFE = "mdfe"
    SPED = "sped"
    
    # Financial
    INVOICE = "invoice"
    PAYMENT = "payment"
    TITLE = "title"
    BANK_ACCOUNT = "bank_account"
    
    # TMS
    SHIPMENT = "shipment"
    ROUTE = "route"
    VEHICLE = "vehicle"
    DRIVER = "driver"
    
    # WMS
    INVENTORY = "inventory"
    WAREHOUSE = "warehouse"
    
    # Integration
    INTEGRATION = "integration"
    WEBHOOK = "webhook"
    
    # System
    SETTING = "setting"
    AGENT = "agent"
    DOCUMENT = "document"


class AuditSeverity(str, Enum):
    """Severidade do evento."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AuditEvent:
    """
    Evento de auditoria imutável.
    
    Uma vez criado, não pode ser alterado.
    O hash garante integridade.
    """
    
    # Identificação
    id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    # Multi-tenancy (OBRIGATÓRIO)
    organization_id: int = 0
    branch_id: int = 0
    
    # Ação
    action: AuditAction = AuditAction.READ
    resource: AuditResource = AuditResource.USER
    resource_id: Optional[str] = None
    
    # Ator
    actor_id: Optional[str] = None  # user_id
    actor_type: str = "user"  # user, system, api_key
    actor_ip: Optional[str] = None
    actor_user_agent: Optional[str] = None
    
    # Contexto
    severity: AuditSeverity = AuditSeverity.LOW
    success: bool = True
    error_message: Optional[str] = None
    
    # Dados (sem PII sensível!)
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    metadata: dict = field(default_factory=dict)
    
    # Integridade
    hash: Optional[str] = field(default=None, init=False)
    previous_hash: Optional[str] = None
    
    def __post_init__(self) -> None:
        """Calcula hash após criação."""
        self.hash = self._calculate_hash()
    
    def _calculate_hash(self) -> str:
        """Calcula hash SHA-256 do evento."""
        data = {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "organization_id": self.organization_id,
            "branch_id": self.branch_id,
            "action": self.action.value,
            "resource": self.resource.value,
            "resource_id": self.resource_id,
            "actor_id": self.actor_id,
            "success": self.success,
            "previous_hash": self.previous_hash
        }
        
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()
    
    def verify_integrity(self) -> bool:
        """Verifica integridade do evento."""
        expected_hash = self._calculate_hash()
        return self.hash == expected_hash
    
    def to_dict(self) -> dict:
        """Converte para dicionário."""
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "organization_id": self.organization_id,
            "branch_id": self.branch_id,
            "action": self.action.value,
            "resource": self.resource.value,
            "resource_id": self.resource_id,
            "actor_id": self.actor_id,
            "actor_type": self.actor_type,
            "actor_ip": self.actor_ip,
            "actor_user_agent": self.actor_user_agent,
            "severity": self.severity.value,
            "success": self.success,
            "error_message": self.error_message,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "metadata": self.metadata,
            "hash": self.hash,
            "previous_hash": self.previous_hash
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "AuditEvent":
        """Cria evento a partir de dicionário."""
        event = cls(
            id=data["id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            organization_id=data.get("organization_id", 0),
            branch_id=data.get("branch_id", 0),
            action=AuditAction(data["action"]),
            resource=AuditResource(data["resource"]),
            resource_id=data.get("resource_id"),
            actor_id=data.get("actor_id"),
            actor_type=data.get("actor_type", "user"),
            actor_ip=data.get("actor_ip"),
            actor_user_agent=data.get("actor_user_agent"),
            severity=AuditSeverity(data.get("severity", "low")),
            success=data.get("success", True),
            error_message=data.get("error_message"),
            old_value=data.get("old_value"),
            new_value=data.get("new_value"),
            metadata=data.get("metadata", {}),
            previous_hash=data.get("previous_hash")
        )
        
        # Restaurar hash original (não recalcular)
        event.hash = data.get("hash")
        
        return event


# Mapeamento de severidade por ação
ACTION_SEVERITY: dict[AuditAction, AuditSeverity] = {
    # Critical
    AuditAction.DATA_BREACH_DETECTED: AuditSeverity.CRITICAL,
    AuditAction.NFE_CANCELLED: AuditSeverity.CRITICAL,
    AuditAction.CTE_CANCELLED: AuditSeverity.CRITICAL,
    AuditAction.PAYMENT_APPROVED: AuditSeverity.CRITICAL,
    AuditAction.API_KEY_CREATED: AuditSeverity.CRITICAL,
    AuditAction.API_KEY_REVOKED: AuditSeverity.CRITICAL,
    
    # High
    AuditAction.LOGIN_FAILED: AuditSeverity.HIGH,
    AuditAction.PASSWORD_CHANGE: AuditSeverity.HIGH,
    AuditAction.PERMISSION_GRANTED: AuditSeverity.HIGH,
    AuditAction.PERMISSION_REVOKED: AuditSeverity.HIGH,
    AuditAction.NFE_EMITTED: AuditSeverity.HIGH,
    AuditAction.CTE_EMITTED: AuditSeverity.HIGH,
    AuditAction.SPED_GENERATED: AuditSeverity.HIGH,
    AuditAction.DELETE: AuditSeverity.HIGH,
    
    # Medium
    AuditAction.LOGIN: AuditSeverity.MEDIUM,
    AuditAction.LOGOUT: AuditSeverity.MEDIUM,
    AuditAction.CREATE: AuditSeverity.MEDIUM,
    AuditAction.UPDATE: AuditSeverity.MEDIUM,
    AuditAction.EXPORT: AuditSeverity.MEDIUM,
    AuditAction.SETTING_CHANGED: AuditSeverity.MEDIUM,
    
    # Low
    AuditAction.READ: AuditSeverity.LOW,
}
