# agents/src/api/audit.py
"""
API endpoints para audit logs.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from src.services.audit import (
    get_audit_service,
    AuditAction,
    AuditResource,
    LGPDCompliance
)
from src.services.audit.audit_events import AuditSeverity
from src.services.audit.compliance import SPEDCompliance
from src.services.auth import Permission
from src.middleware.auth import require_permission

router = APIRouter(prefix="/audit", tags=["audit"])


# ===== SCHEMAS =====

class AuditEventResponse(BaseModel):
    """Response de evento de auditoria."""
    id: str
    timestamp: datetime
    action: str
    resource: str
    resource_id: Optional[str]
    actor_id: Optional[str]
    actor_type: str
    severity: str
    success: bool
    error_message: Optional[str]
    metadata: dict


class AuditQueryResponse(BaseModel):
    """Response de query de auditoria."""
    events: list[AuditEventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class IntegrityCheckResponse(BaseModel):
    """Response de verificação de integridade."""
    is_valid: bool
    errors: list[str]
    checked_period_start: datetime
    checked_period_end: datetime


class ComplianceReportResponse(BaseModel):
    """Response de relatório de compliance."""
    check_type: str
    check_date: datetime
    is_compliant: bool
    issues: list[str]
    recommendations: list[str]
    audit_chain_valid: bool


# ===== ENDPOINTS =====

@router.get("/events", response_model=AuditQueryResponse)
async def query_audit_events(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    resource_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    severity: Optional[str] = None,
    success: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
) -> AuditQueryResponse:
    """
    Busca eventos de auditoria.
    
    Filtros disponíveis:
    - start_date/end_date: Período
    - action: Ação (ex: data.create, fiscal.nfe_emitted)
    - resource: Recurso (ex: nfe, user, payment)
    - resource_id: ID específico do recurso
    - actor_id: ID do usuário que executou a ação
    - severity: low, medium, high, critical
    - success: true/false
    """
    service = get_audit_service()
    
    # Converter strings para enums
    action_enum: Optional[AuditAction] = None
    resource_enum: Optional[AuditResource] = None
    severity_enum: Optional[AuditSeverity] = None
    
    if action:
        try:
            action_enum = AuditAction(action)
        except ValueError:
            raise HTTPException(400, f"Invalid action: {action}")
    
    if resource:
        try:
            resource_enum = AuditResource(resource)
        except ValueError:
            raise HTTPException(400, f"Invalid resource: {resource}")
    
    if severity:
        try:
            severity_enum = AuditSeverity(severity)
        except ValueError:
            raise HTTPException(400, f"Invalid severity: {severity}")
    
    events, total = await service.query(
        org_id=auth["organization_id"],
        branch_id=auth["branch_id"],
        start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
        end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
        action=action_enum,
        resource=resource_enum,
        resource_id=resource_id,
        actor_id=actor_id,
        severity=severity_enum,
        success=success,
        page=page,
        page_size=page_size
    )
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return AuditQueryResponse(
        events=[
            AuditEventResponse(
                id=e.id,
                timestamp=e.timestamp,
                action=e.action.value,
                resource=e.resource.value,
                resource_id=e.resource_id,
                actor_id=e.actor_id,
                actor_type=e.actor_type,
                severity=e.severity.value,
                success=e.success,
                error_message=e.error_message,
                metadata=e.metadata
            )
            for e in events
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/events/{event_id}", response_model=AuditEventResponse)
async def get_audit_event(
    event_id: str,
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
) -> AuditEventResponse:
    """Obtém detalhes de um evento de auditoria."""
    service = get_audit_service()
    
    event = await service.get_event(
        event_id, 
        auth["organization_id"], 
        auth["branch_id"]
    )
    
    if not event:
        raise HTTPException(404, "Audit event not found")
    
    return AuditEventResponse(
        id=event.id,
        timestamp=event.timestamp,
        action=event.action.value,
        resource=event.resource.value,
        resource_id=event.resource_id,
        actor_id=event.actor_id,
        actor_type=event.actor_type,
        severity=event.severity.value,
        success=event.success,
        error_message=event.error_message,
        metadata=event.metadata
    )


@router.get("/integrity", response_model=IntegrityCheckResponse)
async def check_integrity(
    start_date: date,
    end_date: date,
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
) -> IntegrityCheckResponse:
    """
    Verifica integridade da chain de audit logs.
    
    Detecta se houve alteração ou remoção de logs.
    """
    service = get_audit_service()
    
    start = datetime.combine(start_date, datetime.min.time())
    end = datetime.combine(end_date, datetime.max.time())
    
    is_valid, errors = await service.verify_integrity(
        auth["organization_id"],
        auth["branch_id"],
        start,
        end
    )
    
    return IntegrityCheckResponse(
        is_valid=is_valid,
        errors=errors,
        checked_period_start=start,
        checked_period_end=end
    )


@router.get("/export")
async def export_audit_logs(
    start_date: date,
    end_date: date,
    format: str = Query("json", pattern="^(json|csv)$"),
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
) -> FileResponse:
    """
    Exporta audit logs para compliance.
    
    Inclui verificação de integridade no arquivo.
    """
    service = get_audit_service()
    
    start = datetime.combine(start_date, datetime.min.time())
    end = datetime.combine(end_date, datetime.max.time())
    
    filename = await service.export(
        auth["organization_id"],
        auth["branch_id"],
        start,
        end,
        format
    )
    
    return FileResponse(
        filename,
        media_type="application/json",
        filename=f"audit_export_{start_date}_{end_date}.json"
    )


@router.get("/compliance/lgpd", response_model=ComplianceReportResponse)
async def check_lgpd_compliance(
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
) -> ComplianceReportResponse:
    """
    Gera relatório de compliance LGPD.
    
    Verifica:
    - Retenção de logs (mínimo 5 anos)
    - Integridade da chain
    - Logging de acesso a dados
    """
    service = get_audit_service()
    checker = LGPDCompliance(service)
    
    report = await checker.generate_report(
        auth["organization_id"],
        auth["branch_id"]
    )
    
    return ComplianceReportResponse(
        check_type=report.check_type,
        check_date=report.check_date,
        is_compliant=report.is_compliant,
        issues=report.issues,
        recommendations=report.recommendations,
        audit_chain_valid=report.audit_chain_valid
    )


@router.get("/compliance/sped", response_model=ComplianceReportResponse)
async def check_sped_compliance(
    auth: dict = Depends(require_permission(Permission.ADMIN_AUDIT))
) -> ComplianceReportResponse:
    """
    Gera relatório de compliance SPED.
    
    Verifica:
    - Integridade da chain (365 dias)
    - Logging de emissão de NFe/CTe
    - Logging de geração de SPED
    """
    service = get_audit_service()
    checker = SPEDCompliance(service)
    
    report = await checker.generate_report(
        auth["organization_id"],
        auth["branch_id"]
    )
    
    return ComplianceReportResponse(
        check_type=report.check_type,
        check_date=report.check_date,
        is_compliant=report.is_compliant,
        issues=report.issues,
        recommendations=report.recommendations,
        audit_chain_valid=report.audit_chain_valid
    )
