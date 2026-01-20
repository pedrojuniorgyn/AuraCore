# agents/tests/fixtures/auth.py
"""
Fixtures de autenticação.
"""

import pytest
from unittest.mock import patch
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum


class Role(str, Enum):
    """Roles de usuário."""
    ADMIN = "admin"
    OPERATOR = "operator"
    API_CLIENT = "api_client"


class Permission(str, Enum):
    """Permissões do sistema."""
    AGENTS_READ = "agents:read"
    AGENTS_WRITE = "agents:write"
    VOICE_READ = "voice:read"
    VOICE_WRITE = "voice:write"
    RAG_READ = "rag:read"
    RAG_WRITE = "rag:write"
    ADMIN_AUDIT = "admin:audit"
    ADMIN_ANALYTICS = "admin:analytics"


@dataclass
class AuthContext:
    """Contexto de autenticação."""
    user_id: str
    organization_id: int
    branch_id: int
    roles: List[Role]
    permissions: List[Permission]
    is_authenticated: bool = True
    token_type: str = "jwt"
    session_id: Optional[str] = None
    api_key_id: Optional[str] = None


@pytest.fixture
def auth_context_admin() -> AuthContext:
    """Contexto de autenticação admin."""
    return AuthContext(
        user_id="test_admin_001",
        organization_id=1,
        branch_id=1,
        roles=[Role.ADMIN],
        permissions=list(Permission),
        is_authenticated=True,
        token_type="jwt",
        session_id="session_001"
    )


@pytest.fixture
def auth_context_user() -> AuthContext:
    """Contexto de autenticação usuário comum."""
    return AuthContext(
        user_id="test_user_001",
        organization_id=1,
        branch_id=1,
        roles=[Role.OPERATOR],
        permissions=[
            Permission.AGENTS_READ,
            Permission.AGENTS_WRITE,
            Permission.VOICE_READ,
            Permission.VOICE_WRITE,
            Permission.RAG_READ
        ],
        is_authenticated=True,
        token_type="jwt",
        session_id="session_002"
    )


@pytest.fixture
def auth_context_api_key() -> AuthContext:
    """Contexto de autenticação via API Key."""
    return AuthContext(
        user_id="api_client_001",
        organization_id=1,
        branch_id=1,
        roles=[Role.API_CLIENT],
        permissions=[
            Permission.AGENTS_READ,
            Permission.AGENTS_WRITE
        ],
        is_authenticated=True,
        token_type="api_key",
        api_key_id="key_001"
    )


@pytest.fixture
def api_key_header() -> dict:
    """Header com API Key para testes."""
    return {"X-API-Key": "ac_test_xxxxxxxxxxxxxxxxxxxx"}


@pytest.fixture
def jwt_header() -> dict:
    """Header com JWT para testes."""
    return {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"}


@pytest.fixture
def mock_auth_middleware(auth_context_admin):
    """Mock do middleware de autenticação."""
    with patch("src.middleware.auth.get_auth_context") as mock:
        mock.return_value = auth_context_admin
        yield mock
