"""
Serviço central de webhooks.
"""

import asyncio
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime
import uuid
import structlog

from .webhook_events import WebhookEvent, EventType
from .webhook_delivery import WebhookDelivery
from src.services.cache import get_cache

logger = structlog.get_logger()


@dataclass
class WebhookEndpoint:
    """Endpoint registrado para webhooks."""
    id: str
    url: str
    secret: Optional[str]
    events: list[EventType]
    organization_id: int
    branch_id: int
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def subscribes_to(self, event_type: EventType) -> bool:
        """Verifica se endpoint está inscrito no evento."""
        return event_type in self.events or EventType.AGENT_MESSAGE_PROCESSED in self.events


class WebhookService:
    """
    Serviço de gerenciamento e disparo de webhooks.
    
    Uso:
        service = get_webhook_service()
        
        # Registrar endpoint
        await service.register_endpoint(
            url="https://example.com/webhook",
            events=[EventType.AGENT_MESSAGE_PROCESSED],
            secret="meu-secret",
            org_id=1,
            branch_id=1
        )
        
        # Disparar evento
        await service.emit(WebhookEvent(
            type=EventType.AGENT_MESSAGE_PROCESSED,
            data={"message": "Hello", "response": "World"}
        ))
    """
    
    def __init__(self):
        self._endpoints: dict[str, WebhookEndpoint] = {}
        self._delivery_queue: asyncio.Queue[WebhookDelivery] = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._cache = get_cache()
        
        logger.info("webhook_service_initialized")
    
    async def start(self):
        """Inicia worker de entrega."""
        if self._worker_task is None:
            self._worker_task = asyncio.create_task(self._delivery_worker())
            logger.info("webhook_delivery_worker_started")
    
    async def stop(self):
        """Para worker de entrega."""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
            logger.info("webhook_delivery_worker_stopped")
    
    async def _delivery_worker(self):
        """Worker que processa entregas da fila."""
        while True:
            try:
                delivery = await self._delivery_queue.get()
                await delivery.deliver()
                self._delivery_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("webhook_worker_error", error=str(e))
    
    # ===== CRUD DE ENDPOINTS =====
    
    async def register_endpoint(
        self,
        url: str,
        events: list[EventType],
        org_id: int,
        branch_id: int,
        secret: Optional[str] = None
    ) -> WebhookEndpoint:
        """Registra novo endpoint."""
        endpoint = WebhookEndpoint(
            id=str(uuid.uuid4()),
            url=url,
            secret=secret,
            events=events,
            organization_id=org_id,
            branch_id=branch_id
        )
        
        self._endpoints[endpoint.id] = endpoint
        
        # Persistir no cache (1 semana)
        await self._cache.set_json(
            f"webhook:endpoint:{endpoint.id}",
            {
                "id": endpoint.id,
                "url": endpoint.url,
                "events": [e.value for e in endpoint.events],
                "organization_id": endpoint.organization_id,
                "branch_id": endpoint.branch_id,
                "is_active": endpoint.is_active,
                "created_at": endpoint.created_at.isoformat()
            },
            ttl=604800
        )
        
        logger.info(
            "webhook_endpoint_registered",
            endpoint_id=endpoint.id,
            url=url,
            events=[e.value for e in events]
        )
        
        return endpoint
    
    async def unregister_endpoint(self, endpoint_id: str) -> bool:
        """Remove endpoint."""
        if endpoint_id in self._endpoints:
            del self._endpoints[endpoint_id]
            await self._cache.delete(f"webhook:endpoint:{endpoint_id}")
            logger.info("webhook_endpoint_unregistered", endpoint_id=endpoint_id)
            return True
        return False
    
    async def list_endpoints(
        self,
        org_id: int,
        branch_id: int
    ) -> list[WebhookEndpoint]:
        """Lista endpoints de uma organização."""
        return [
            ep for ep in self._endpoints.values()
            if ep.organization_id == org_id and ep.branch_id == branch_id
        ]
    
    async def get_endpoint(self, endpoint_id: str) -> Optional[WebhookEndpoint]:
        """Obtém endpoint por ID."""
        return self._endpoints.get(endpoint_id)
    
    # ===== EMISSÃO DE EVENTOS =====
    
    async def emit(
        self,
        event: WebhookEvent,
        sync: bool = False
    ) -> int:
        """
        Emite evento para todos os endpoints inscritos.
        
        Args:
            event: Evento a emitir
            sync: Se True, aguarda entrega (default: async)
        
        Returns:
            Número de endpoints notificados
        """
        # Encontrar endpoints inscritos
        endpoints = [
            ep for ep in self._endpoints.values()
            if ep.is_active and ep.subscribes_to(event.type)
            and (event.organization_id is None or ep.organization_id == event.organization_id)
        ]
        
        if not endpoints:
            logger.debug("webhook_no_subscribers", event_type=event.type.value)
            return 0
        
        # Criar entregas
        deliveries = [
            WebhookDelivery(
                event=event,
                endpoint_url=ep.url,
                secret=ep.secret
            )
            for ep in endpoints
        ]
        
        if sync:
            # Entregar sincronamente
            results = await asyncio.gather(
                *[d.deliver() for d in deliveries],
                return_exceptions=True
            )
            return sum(1 for r in results if r is True)
        else:
            # Enfileirar para entrega assíncrona
            for delivery in deliveries:
                await self._delivery_queue.put(delivery)
            
            logger.info(
                "webhook_events_queued",
                event_type=event.type.value,
                count=len(deliveries)
            )
            
            return len(deliveries)
    
    # ===== HELPERS =====
    
    async def emit_agent_processed(
        self,
        agent_type: str,
        message: str,
        response: str,
        org_id: int,
        branch_id: int,
        user_id: str,
        session_id: str,
        latency_ms: float
    ):
        """Helper para emitir evento de agente processado."""
        event = WebhookEvent(
            type=EventType.AGENT_MESSAGE_PROCESSED,
            organization_id=org_id,
            branch_id=branch_id,
            user_id=user_id,
            session_id=session_id,
            data={
                "agent_type": agent_type,
                "message": message,
                "response": response,
                "latency_ms": latency_ms
            }
        )
        await self.emit(event)
    
    async def emit_document_imported(
        self,
        doc_type: str,
        doc_id: str,
        confidence: float,
        org_id: int,
        branch_id: int
    ):
        """Helper para emitir evento de documento importado."""
        event = WebhookEvent(
            type=EventType.DOCUMENT_IMPORTED,
            organization_id=org_id,
            branch_id=branch_id,
            data={
                "doc_type": doc_type,
                "doc_id": doc_id,
                "confidence": confidence
            }
        )
        await self.emit(event)


# Singleton
_webhook_service: Optional[WebhookService] = None


def get_webhook_service() -> WebhookService:
    """Retorna instância singleton."""
    global _webhook_service
    if _webhook_service is None:
        _webhook_service = WebhookService()
    return _webhook_service
