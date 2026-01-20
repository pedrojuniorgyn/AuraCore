# agents/tests/e2e/test_audit_api.py
"""
Testes E2E para API de Audit.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass
from enum import Enum


class MockAction(Enum):
    """Mock de ação de auditoria."""
    LOGIN = "auth.login"
    LOGOUT = "auth.logout"


class MockResource(Enum):
    """Mock de recurso de auditoria."""
    USER = "user"


class MockSeverity(Enum):
    """Mock de severidade."""
    MEDIUM = "medium"


@dataclass
class MockAuditEvent:
    """Mock de evento de auditoria."""
    id: str
    timestamp: datetime
    action: MockAction
    resource: MockResource
    resource_id: str
    actor_id: str
    actor_type: str
    severity: MockSeverity
    success: bool
    error_message: str = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class TestAuditAPI:
    """Testes da API de Audit."""
    
    @pytest.mark.asyncio
    async def test_query_audit_events(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        auth_context_admin: Any
    ) -> None:
        """Deve buscar eventos de auditoria."""
        with patch("src.middleware.auth.get_auth_context") as mock_ctx:
            mock_ctx.return_value = auth_context_admin
            
            with patch("src.services.audit.get_audit_service") as mock_svc:
                mock_service = AsyncMock()
                mock_service.query.return_value = (
                    [
                        MockAuditEvent(
                            id="evt_001",
                            timestamp=datetime.utcnow(),
                            action=MockAction.LOGIN,
                            resource=MockResource.USER,
                            resource_id="user_001",
                            actor_id="admin_001",
                            actor_type="user",
                            severity=MockSeverity.MEDIUM,
                            success=True
                        )
                    ],
                    1
                )
                mock_svc.return_value = mock_service
                
                response = await client.get(
                    "/v1/audit/events?action=auth.login",
                    headers=api_key_header
                )
        
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert data["total"] >= 1
    
    @pytest.mark.asyncio
    async def test_check_integrity(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        auth_context_admin: Any
    ) -> None:
        """Deve verificar integridade da chain."""
        with patch("src.middleware.auth.get_auth_context") as mock_ctx:
            mock_ctx.return_value = auth_context_admin
            
            with patch("src.services.audit.get_audit_service") as mock_svc:
                mock_service = AsyncMock()
                mock_service.verify_integrity.return_value = (True, [])
                mock_svc.return_value = mock_service
                
                response = await client.get(
                    "/v1/audit/integrity?start_date=2026-01-01&end_date=2026-01-20",
                    headers=api_key_header
                )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] is True
        assert len(data["errors"]) == 0
    
    @pytest.mark.asyncio
    async def test_export_audit_logs(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        auth_context_admin: Any
    ) -> None:
        """Deve exportar logs de auditoria."""
        with patch("src.middleware.auth.get_auth_context") as mock_ctx:
            mock_ctx.return_value = auth_context_admin
            
            with patch("src.services.audit.get_audit_service") as mock_svc:
                mock_service = AsyncMock()
                mock_service.export.return_value = [
                    {"id": "evt_001", "action": "auth.login", "timestamp": "2026-01-20T10:00:00"}
                ]
                mock_svc.return_value = mock_service
                
                response = await client.get(
                    "/v1/audit/export?start_date=2026-01-01&end_date=2026-01-20",
                    headers=api_key_header
                )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_audit_without_admin(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        auth_context_user: Any
    ) -> None:
        """Deve retornar 403 para não-admin."""
        with patch("src.middleware.auth.get_auth_context") as mock_ctx:
            mock_ctx.return_value = auth_context_user
            
            response = await client.get(
                "/v1/audit/events",
                headers=api_key_header
            )
        
        # Deve verificar permissão ADMIN_AUDIT
        assert response.status_code in [403, 401]
    
    @pytest.mark.asyncio
    async def test_lgpd_compliance_report(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        auth_context_admin: Any
    ) -> None:
        """Deve gerar relatório de compliance LGPD."""
        with patch("src.middleware.auth.get_auth_context") as mock_ctx:
            mock_ctx.return_value = auth_context_admin
            
            with patch("src.services.audit.get_audit_service") as mock_svc:
                mock_service = AsyncMock()
                mock_service.get_lgpd_report.return_value = {
                    "compliant": True,
                    "data_retention_days": 1825,
                    "access_logs_enabled": True,
                    "encryption_enabled": True
                }
                mock_svc.return_value = mock_service
                
                response = await client.get(
                    "/v1/audit/compliance/lgpd",
                    headers=api_key_header
                )
        
        assert response.status_code == 200
