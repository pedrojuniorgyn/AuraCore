# agents/src/services/auth/permissions.py
"""
Sistema de permissões e roles.
"""

from enum import Enum
from typing import Optional
from dataclasses import dataclass


class Permission(str, Enum):
    """Permissões do sistema."""
    
    # Wildcard
    ALL = "*"
    
    # Agents
    AGENT_READ = "agent:read"
    AGENT_WRITE = "agent:write"
    AGENT_ADMIN = "agent:admin"
    
    # Voice
    VOICE_USE = "voice:use"
    VOICE_ADMIN = "voice:admin"
    
    # Documents
    DOCUMENT_READ = "document:read"
    DOCUMENT_WRITE = "document:write"
    DOCUMENT_DELETE = "document:delete"
    
    # RAG/Knowledge
    RAG_QUERY = "rag:query"
    RAG_INDEX = "rag:index"
    RAG_ADMIN = "rag:admin"
    
    # Webhooks
    WEBHOOK_READ = "webhook:read"
    WEBHOOK_WRITE = "webhook:write"
    WEBHOOK_DELETE = "webhook:delete"
    
    # Tasks
    TASK_READ = "task:read"
    TASK_WRITE = "task:write"
    TASK_CANCEL = "task:cancel"
    
    # API Keys
    APIKEY_READ = "apikey:read"
    APIKEY_CREATE = "apikey:create"
    APIKEY_REVOKE = "apikey:revoke"
    
    # Admin
    ADMIN_USERS = "admin:users"
    ADMIN_SETTINGS = "admin:settings"
    ADMIN_AUDIT = "admin:audit"


class Role(str, Enum):
    """Roles pré-definidas."""
    
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    READONLY = "readonly"
    API_CLIENT = "api_client"


# Mapeamento de roles para permissões
ROLE_PERMISSIONS: dict[Role, list[Permission]] = {
    Role.ADMIN: [Permission.ALL],
    
    Role.MANAGER: [
        Permission.AGENT_READ,
        Permission.AGENT_WRITE,
        Permission.VOICE_USE,
        Permission.DOCUMENT_READ,
        Permission.DOCUMENT_WRITE,
        Permission.RAG_QUERY,
        Permission.RAG_INDEX,
        Permission.WEBHOOK_READ,
        Permission.WEBHOOK_WRITE,
        Permission.TASK_READ,
        Permission.TASK_WRITE,
        Permission.APIKEY_READ,
    ],
    
    Role.USER: [
        Permission.AGENT_READ,
        Permission.AGENT_WRITE,
        Permission.VOICE_USE,
        Permission.DOCUMENT_READ,
        Permission.RAG_QUERY,
        Permission.TASK_READ,
    ],
    
    Role.READONLY: [
        Permission.AGENT_READ,
        Permission.DOCUMENT_READ,
        Permission.RAG_QUERY,
        Permission.TASK_READ,
    ],
    
    Role.API_CLIENT: [
        Permission.AGENT_READ,
        Permission.AGENT_WRITE,
        Permission.VOICE_USE,
        Permission.DOCUMENT_READ,
        Permission.DOCUMENT_WRITE,
        Permission.RAG_QUERY,
        Permission.WEBHOOK_READ,
        Permission.TASK_READ,
        Permission.TASK_WRITE,
    ],
}


def get_role_permissions(role: Role) -> list[Permission]:
    """Obtém permissões de uma role."""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(
    user_permissions: list[str],
    required: Permission | str
) -> bool:
    """
    Verifica se usuário tem permissão.
    
    Args:
        user_permissions: Lista de permissões do usuário
        required: Permissão necessária
    
    Returns:
        True se tem permissão
    """
    required_str = required.value if isinstance(required, Permission) else required
    
    # Wildcard permite tudo
    if "*" in user_permissions or Permission.ALL.value in user_permissions:
        return True
    
    # Verificar permissão exata
    if required_str in user_permissions:
        return True
    
    # Verificar permissão de categoria (agent:* permite agent:read)
    category = required_str.split(":")[0]
    if f"{category}:*" in user_permissions:
        return True
    
    return False


def check_permissions(
    user_permissions: list[str],
    required: list[Permission | str]
) -> bool:
    """
    Verifica se usuário tem todas as permissões.
    
    Args:
        user_permissions: Lista de permissões do usuário
        required: Lista de permissões necessárias
    
    Returns:
        True se tem todas as permissões
    """
    return all(has_permission(user_permissions, p) for p in required)
