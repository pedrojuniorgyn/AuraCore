# agents/src/services/audit/audit_storage.py
"""
Storage para audit logs.

Características:
- Append-only (imutável)
- Hash chain para integridade
- Retenção configurável
- Export para compliance
"""

from typing import Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import structlog

from .audit_events import AuditEvent, AuditAction, AuditResource, AuditSeverity
from src.services.cache import get_cache

logger = structlog.get_logger()


@dataclass
class AuditQuery:
    """Query para buscar audit logs."""
    organization_id: int
    branch_id: int
    
    # Filtros opcionais
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    action: Optional[AuditAction] = None
    resource: Optional[AuditResource] = None
    resource_id: Optional[str] = None
    actor_id: Optional[str] = None
    severity: Optional[AuditSeverity] = None
    success: Optional[bool] = None
    
    # Paginação
    page: int = 1
    page_size: int = 50
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class AuditStorage:
    """
    Storage para audit logs com hash chain.
    
    Em produção, usar banco de dados append-only ou
    serviço especializado (ex: AWS CloudTrail, Azure Log Analytics).
    """
    
    RETENTION_DAYS = 365 * 5  # 5 anos (requisito fiscal BR)
    
    def __init__(self) -> None:
        self._cache = get_cache()
        self._last_hash: dict[tuple[int, int], str] = {}  # (org_id, branch_id) -> last_hash
    
    async def append(self, event: AuditEvent) -> AuditEvent:
        """
        Adiciona evento ao log (append-only).
        
        O evento recebe o hash do evento anterior para formar a chain.
        """
        # Obter último hash da chain
        chain_key = (event.organization_id, event.branch_id)
        
        if chain_key not in self._last_hash:
            # Buscar último hash do storage
            last_event = await self._get_last_event(
                event.organization_id,
                event.branch_id
            )
            if last_event:
                self._last_hash[chain_key] = last_event.hash or ""
        
        # Atribuir previous_hash
        event.previous_hash = self._last_hash.get(chain_key)
        
        # Recalcular hash com previous_hash
        event.hash = event._calculate_hash()
        
        # Persistir
        await self._persist_event(event)
        
        # Atualizar último hash
        if event.hash:
            self._last_hash[chain_key] = event.hash
        
        logger.info(
            "audit_event_stored",
            event_id=event.id,
            action=event.action.value,
            resource=event.resource.value
        )
        
        return event
    
    async def query(self, query: AuditQuery) -> tuple[list[AuditEvent], int]:
        """
        Busca eventos com filtros.
        
        Returns:
            (events, total_count)
        """
        # Buscar todos eventos do período
        all_events = await self._get_events_by_date_range(
            query.organization_id,
            query.branch_id,
            query.start_date or datetime.utcnow() - timedelta(days=30),
            query.end_date or datetime.utcnow()
        )
        
        # Aplicar filtros
        filtered = []
        for event in all_events:
            if query.action and event.action != query.action:
                continue
            if query.resource and event.resource != query.resource:
                continue
            if query.resource_id and event.resource_id != query.resource_id:
                continue
            if query.actor_id and event.actor_id != query.actor_id:
                continue
            if query.severity and event.severity != query.severity:
                continue
            if query.success is not None and event.success != query.success:
                continue
            filtered.append(event)
        
        total = len(filtered)
        
        # Ordenar por timestamp desc
        filtered.sort(key=lambda e: e.timestamp, reverse=True)
        
        # Paginar
        start = query.offset
        end = start + query.page_size
        page_events = filtered[start:end]
        
        return page_events, total
    
    async def get_by_id(
        self,
        event_id: str,
        org_id: int,
        branch_id: int
    ) -> Optional[AuditEvent]:
        """Obtém evento por ID."""
        data = await self._cache.get_json(f"audit:event:{event_id}")
        
        if not data:
            return None
        
        event = AuditEvent.from_dict(data)
        
        # Verificar multi-tenancy
        if event.organization_id != org_id or event.branch_id != branch_id:
            return None
        
        return event
    
    async def verify_chain_integrity(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> tuple[bool, list[str]]:
        """
        Verifica integridade da chain de audit logs.
        
        Returns:
            (is_valid, list of error messages)
        """
        events, _ = await self.query(AuditQuery(
            organization_id=org_id,
            branch_id=branch_id,
            start_date=start_date,
            end_date=end_date,
            page_size=10000
        ))
        
        # Ordenar por timestamp asc
        events.sort(key=lambda e: e.timestamp)
        
        errors: list[str] = []
        previous_hash: Optional[str] = None
        
        for event in events:
            # Verificar hash próprio
            if not event.verify_integrity():
                errors.append(f"Event {event.id}: Hash mismatch")
            
            # Verificar chain
            if previous_hash and event.previous_hash != previous_hash:
                errors.append(f"Event {event.id}: Chain broken")
            
            previous_hash = event.hash
        
        return len(errors) == 0, errors
    
    async def export_for_compliance(
        self,
        org_id: int,
        branch_id: int,
        start_date: datetime,
        end_date: datetime,
        export_format: str = "json"
    ) -> str:
        """
        Exporta logs para compliance (LGPD, auditoria).
        
        Returns:
            Path do arquivo exportado
        """
        import json
        import uuid
        
        events, _ = await self.query(AuditQuery(
            organization_id=org_id,
            branch_id=branch_id,
            start_date=start_date,
            end_date=end_date,
            page_size=100000
        ))
        
        # Verificar integridade antes de exportar
        is_valid, errors = await self.verify_chain_integrity(
            org_id, branch_id, start_date, end_date
        )
        
        export_data = {
            "export_id": str(uuid.uuid4()),
            "export_timestamp": datetime.utcnow().isoformat(),
            "organization_id": org_id,
            "branch_id": branch_id,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "total_events": len(events),
            "chain_integrity": {
                "valid": is_valid,
                "errors": errors
            },
            "events": [e.to_dict() for e in events]
        }
        
        # Salvar arquivo
        filename = f"/tmp/audit_export_{org_id}_{branch_id}_{uuid.uuid4().hex[:8]}.json"
        
        with open(filename, "w") as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(
            "audit_exported",
            org_id=org_id,
            branch_id=branch_id,
            events_count=len(events),
            filename=filename
        )
        
        return filename
    
    # ===== HELPERS =====
    
    async def _persist_event(self, event: AuditEvent) -> None:
        """Persiste evento no storage."""
        # Por ID
        await self._cache.set_json(
            f"audit:event:{event.id}",
            event.to_dict(),
            ttl=self.RETENTION_DAYS * 86400
        )
        
        # Por data (índice)
        day = event.timestamp.strftime("%Y-%m-%d")
        day_key = f"audit:day:{event.organization_id}:{event.branch_id}:{day}"
        
        day_events = await self._cache.get_json(day_key) or []
        day_events.append(event.id)
        await self._cache.set_json(day_key, day_events, ttl=self.RETENTION_DAYS * 86400)
    
    async def _get_last_event(
        self,
        org_id: int,
        branch_id: int
    ) -> Optional[AuditEvent]:
        """Obtém último evento da chain."""
        # Buscar do dia atual
        today = datetime.utcnow().strftime("%Y-%m-%d")
        day_key = f"audit:day:{org_id}:{branch_id}:{today}"
        
        event_ids = await self._cache.get_json(day_key) or []
        
        if event_ids:
            return await self.get_by_id(event_ids[-1], org_id, branch_id)
        
        return None
    
    async def _get_events_by_date_range(
        self,
        org_id: int,
        branch_id: int,
        start: datetime,
        end: datetime
    ) -> list[AuditEvent]:
        """Obtém eventos por range de data."""
        events: list[AuditEvent] = []
        current = start
        
        while current <= end:
            day = current.strftime("%Y-%m-%d")
            day_key = f"audit:day:{org_id}:{branch_id}:{day}"
            
            event_ids = await self._cache.get_json(day_key) or []
            
            for event_id in event_ids:
                event = await self.get_by_id(event_id, org_id, branch_id)
                if event:
                    events.append(event)
            
            current += timedelta(days=1)
        
        return events
