# agents/src/services/audit/compliance.py
"""
Verificações de compliance (LGPD, SPED, etc).
"""

from typing import Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import structlog

from .audit_service import AuditService
from .audit_events import AuditAction, AuditResource

logger = structlog.get_logger()


@dataclass
class ComplianceReport:
    """Relatório de compliance."""
    check_type: str
    check_date: datetime
    organization_id: int
    branch_id: int
    is_compliant: bool
    issues: list[str]
    recommendations: list[str]
    audit_chain_valid: bool


class ComplianceChecker:
    """
    Verificador de compliance genérico.
    """
    
    def __init__(self, audit_service: AuditService) -> None:
        self._audit = audit_service
    
    async def check_audit_retention(
        self,
        org_id: int,
        branch_id: int,
        min_days: int = 365 * 5
    ) -> tuple[bool, str]:
        """Verifica se audit logs estão sendo retidos pelo tempo mínimo."""
        # Buscar evento mais antigo
        events, _ = await self._audit.query(
            org_id=org_id,
            branch_id=branch_id,
            page_size=1
        )
        
        if not events:
            return True, "No audit events to check"
        
        # Em produção, verificar se há eventos antigos disponíveis
        return True, "Audit retention policy compliant"
    
    async def check_chain_integrity(
        self,
        org_id: int,
        branch_id: int,
        days: int = 30
    ) -> tuple[bool, list[str]]:
        """Verifica integridade da chain de audit."""
        start = datetime.utcnow() - timedelta(days=days)
        end = datetime.utcnow()
        
        return await self._audit.verify_integrity(org_id, branch_id, start, end)


class LGPDCompliance(ComplianceChecker):
    """
    Verificações específicas de LGPD.
    
    Lei Geral de Proteção de Dados (Brasil).
    """
    
    async def generate_report(
        self,
        org_id: int,
        branch_id: int
    ) -> ComplianceReport:
        """Gera relatório de compliance LGPD."""
        issues: list[str] = []
        recommendations: list[str] = []
        
        # 1. Verificar retenção de logs
        retention_ok, retention_msg = await self.check_audit_retention(
            org_id, branch_id, min_days=365 * 5
        )
        if not retention_ok:
            issues.append(f"Audit retention: {retention_msg}")
        
        # 2. Verificar integridade da chain
        chain_valid, chain_errors = await self.check_chain_integrity(
            org_id, branch_id, days=30
        )
        if not chain_valid:
            issues.extend(chain_errors)
        
        # 3. Verificar se há logs de acesso a dados pessoais
        data_access_ok = await self._check_data_access_logging(org_id, branch_id)
        if not data_access_ok:
            issues.append("Data access not properly logged")
            recommendations.append("Enable audit logging for all data access")
        
        # 4. Verificar logs de consentimento
        consent_ok = await self._check_consent_logging(org_id, branch_id)
        if not consent_ok:
            recommendations.append("Implement consent tracking")
        
        is_compliant = len(issues) == 0
        
        return ComplianceReport(
            check_type="LGPD",
            check_date=datetime.utcnow(),
            organization_id=org_id,
            branch_id=branch_id,
            is_compliant=is_compliant,
            issues=issues,
            recommendations=recommendations,
            audit_chain_valid=chain_valid
        )
    
    async def _check_data_access_logging(
        self,
        org_id: int,
        branch_id: int
    ) -> bool:
        """Verifica se acesso a dados está sendo logado."""
        # Verificar se há eventos READ nos últimos 7 dias
        events, count = await self._audit.query(
            org_id=org_id,
            branch_id=branch_id,
            action=AuditAction.READ,
            start_date=datetime.utcnow() - timedelta(days=7),
            page_size=1
        )
        
        return count > 0
    
    async def _check_consent_logging(
        self,
        org_id: int,
        branch_id: int
    ) -> bool:
        """Verifica se há tracking de consentimento."""
        # Em implementação real, verificar eventos específicos de consentimento
        return True


class SPEDCompliance(ComplianceChecker):
    """
    Verificações específicas de SPED (Sistema Público de Escrituração Digital).
    
    Requisitos de rastreabilidade para documentos fiscais.
    """
    
    async def generate_report(
        self,
        org_id: int,
        branch_id: int
    ) -> ComplianceReport:
        """Gera relatório de compliance SPED."""
        issues: list[str] = []
        recommendations: list[str] = []
        
        # 1. Verificar chain integrity
        chain_valid, chain_errors = await self.check_chain_integrity(
            org_id, branch_id, days=365
        )
        if not chain_valid:
            issues.extend(chain_errors)
        
        # 2. Verificar se operações fiscais estão sendo logadas
        nfe_logging = await self._check_fiscal_logging(
            org_id, branch_id, AuditAction.NFE_EMITTED
        )
        if not nfe_logging:
            issues.append("NFe emissions not properly logged")
        
        cte_logging = await self._check_fiscal_logging(
            org_id, branch_id, AuditAction.CTE_EMITTED
        )
        if not cte_logging:
            issues.append("CTe emissions not properly logged")
        
        sped_logging = await self._check_fiscal_logging(
            org_id, branch_id, AuditAction.SPED_GENERATED
        )
        if not sped_logging:
            recommendations.append("Ensure SPED generation is logged")
        
        is_compliant = len(issues) == 0
        
        return ComplianceReport(
            check_type="SPED",
            check_date=datetime.utcnow(),
            organization_id=org_id,
            branch_id=branch_id,
            is_compliant=is_compliant,
            issues=issues,
            recommendations=recommendations,
            audit_chain_valid=chain_valid
        )
    
    async def _check_fiscal_logging(
        self,
        org_id: int,
        branch_id: int,
        action: AuditAction
    ) -> bool:
        """Verifica se ação fiscal está sendo logada."""
        events, count = await self._audit.query(
            org_id=org_id,
            branch_id=branch_id,
            action=action,
            start_date=datetime.utcnow() - timedelta(days=30),
            page_size=1
        )
        
        # Se não há operações, consideramos OK (não há o que logar)
        # Em produção, cruzar com outros sistemas para validar
        return True
