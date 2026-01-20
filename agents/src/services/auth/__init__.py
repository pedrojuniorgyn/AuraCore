# agents/src/services/auth/__init__.py
"""Sistema de autenticação e autorização."""

from .api_key import APIKeyManager, APIKey, get_api_key_manager
from .jwt_service import JWTService, TokenPayload, get_jwt_service
from .password import PasswordHasher, get_password_hasher
from .permissions import Permission, Role, has_permission
from .audit import AuditLogger, AuditEvent, get_audit_logger

__all__ = [
    "APIKeyManager",
    "APIKey",
    "get_api_key_manager",
    "JWTService",
    "TokenPayload",
    "get_jwt_service",
    "PasswordHasher",
    "get_password_hasher",
    "Permission",
    "Role",
    "has_permission",
    "AuditLogger",
    "AuditEvent",
    "get_audit_logger"
]
