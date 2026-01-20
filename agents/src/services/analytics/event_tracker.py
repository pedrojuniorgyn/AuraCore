# agents/src/services/analytics/event_tracker.py
"""
Tracker de eventos com buffer e batch insert.
"""

import asyncio
import time
import uuid
from typing import Optional, Callable, Awaitable
from datetime import datetime
from collections import deque
import structlog

from .events import AnalyticsEvent, EventType
from src.services.cache import get_cache

logger = structlog.get_logger()


class EventTracker:
    """
    Rastreia eventos de analytics com batching.
    
    Uso:
        tracker = get_event_tracker()
        
        # Rastrear evento
        await tracker.track(
            event_type=EventType.AGENT_REQUEST,
            org_id=1,
            branch_id=1,
            user_id="user123",
            agent_name="fiscal",
            metadata={"query_type": "tax_calculation"}
        )
        
        # Contexto manager para timing
        async with tracker.track_duration(
            EventType.TOOL_CALL,
            org_id=1,
            branch_id=1,
            tool_name="calculate_icms"
        ) as event:
            # Executar operação
            result = await some_operation()
            event.metadata["result_count"] = len(result)
    """
    
    BATCH_SIZE = 100
    FLUSH_INTERVAL = 10  # segundos
    
    def __init__(self):
        self._cache = get_cache()
        self._buffer: deque[AnalyticsEvent] = deque(maxlen=1000)
        self._flush_task: Optional[asyncio.Task] = None
        self._running = False
        self._callbacks: list[Callable[[AnalyticsEvent], Awaitable[None]]] = []
        
        logger.info("event_tracker_initialized")
    
    async def start(self):
        """Inicia flush periódico."""
        if self._running:
            return
        
        self._running = True
        self._flush_task = asyncio.create_task(self._periodic_flush())
        logger.info("event_tracker_started")
    
    async def stop(self):
        """Para tracker e flush final."""
        self._running = False
        
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
        
        # Flush final
        await self._flush()
        logger.info("event_tracker_stopped")
    
    def add_callback(self, callback: Callable[[AnalyticsEvent], Awaitable[None]]):
        """Adiciona callback para eventos (ex: webhook, stream)."""
        self._callbacks.append(callback)
    
    # ===== TRACKING =====
    
    async def track(
        self,
        event_type: EventType,
        org_id: int,
        branch_id: int,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        agent_name: Optional[str] = None,
        tool_name: Optional[str] = None,
        duration_ms: Optional[float] = None,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        success: bool = True,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> AnalyticsEvent:
        """Registra evento de analytics."""
        event = AnalyticsEvent(
            id=str(uuid.uuid4()),
            type=event_type,
            organization_id=org_id,
            branch_id=branch_id,
            user_id=user_id,
            session_id=session_id,
            agent_name=agent_name,
            tool_name=tool_name,
            duration_ms=duration_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            success=success,
            error_code=error_code,
            error_message=error_message,
            metadata=metadata or {}
        )
        
        # Adicionar ao buffer
        self._buffer.append(event)
        
        # Callbacks (async)
        for callback in self._callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error("event_callback_error", error=str(e))
        
        # Flush se buffer cheio
        if len(self._buffer) >= self.BATCH_SIZE:
            asyncio.create_task(self._flush())
        
        return event
    
    def track_duration(
        self,
        event_type: EventType,
        org_id: int,
        branch_id: int,
        **kwargs
    ) -> "DurationTracker":
        """Context manager para tracking com timing automático."""
        return DurationTracker(self, event_type, org_id, branch_id, **kwargs)
    
    # ===== SHORTCUTS =====
    
    async def track_agent_request(
        self,
        org_id: int,
        branch_id: int,
        agent_name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> AnalyticsEvent:
        """Shortcut para agent request."""
        return await self.track(
            event_type=EventType.AGENT_REQUEST,
            org_id=org_id,
            branch_id=branch_id,
            agent_name=agent_name,
            user_id=user_id,
            session_id=session_id,
            metadata=metadata
        )
    
    async def track_agent_response(
        self,
        org_id: int,
        branch_id: int,
        agent_name: str,
        duration_ms: float,
        tokens_input: int,
        tokens_output: int,
        success: bool = True,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> AnalyticsEvent:
        """Shortcut para agent response."""
        return await self.track(
            event_type=EventType.AGENT_RESPONSE if success else EventType.AGENT_ERROR,
            org_id=org_id,
            branch_id=branch_id,
            agent_name=agent_name,
            duration_ms=duration_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            success=success,
            user_id=user_id,
            session_id=session_id,
            error_message=error_message
        )
    
    async def track_tool_call(
        self,
        org_id: int,
        branch_id: int,
        agent_name: str,
        tool_name: str,
        duration_ms: float,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> AnalyticsEvent:
        """Shortcut para tool call."""
        return await self.track(
            event_type=EventType.TOOL_SUCCESS if success else EventType.TOOL_ERROR,
            org_id=org_id,
            branch_id=branch_id,
            agent_name=agent_name,
            tool_name=tool_name,
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=metadata
        )
    
    # ===== FLUSH =====
    
    async def _periodic_flush(self):
        """Flush periódico do buffer."""
        while self._running:
            await asyncio.sleep(self.FLUSH_INTERVAL)
            await self._flush()
    
    async def _flush(self):
        """Persiste eventos do buffer."""
        if not self._buffer:
            return
        
        # Coletar eventos do buffer
        events = []
        while self._buffer:
            events.append(self._buffer.popleft())
        
        if not events:
            return
        
        # Persistir no cache (por organização/dia)
        by_org_day: dict[str, list[dict]] = {}
        
        for event in events:
            day = event.timestamp.strftime("%Y-%m-%d")
            key = f"analytics:{event.organization_id}:{day}"
            
            if key not in by_org_day:
                by_org_day[key] = []
            by_org_day[key].append(event.to_dict())
        
        # Salvar batches
        for key, event_dicts in by_org_day.items():
            try:
                existing = await self._cache.get_json(key) or []
                existing.extend(event_dicts)
                await self._cache.set_json(key, existing, ttl=604800)  # 7 dias
            except Exception as e:
                logger.error("analytics_flush_error", key=key, error=str(e))
        
        logger.debug("analytics_flushed", count=len(events))


class DurationTracker:
    """Context manager para tracking com duração."""
    
    def __init__(
        self,
        tracker: EventTracker,
        event_type: EventType,
        org_id: int,
        branch_id: int,
        **kwargs
    ):
        self._tracker = tracker
        self._event_type = event_type
        self._org_id = org_id
        self._branch_id = branch_id
        self._kwargs = kwargs
        self._start_time: Optional[float] = None
        self.event: Optional[AnalyticsEvent] = None
        self.metadata: dict = kwargs.get("metadata", {})
    
    async def __aenter__(self) -> "DurationTracker":
        self._start_time = time.perf_counter()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.perf_counter() - self._start_time) * 1000
        
        success = exc_type is None
        error_message = str(exc_val) if exc_val else None
        
        self.event = await self._tracker.track(
            event_type=self._event_type,
            org_id=self._org_id,
            branch_id=self._branch_id,
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=self.metadata,
            **{k: v for k, v in self._kwargs.items() if k != "metadata"}
        )
        
        # Não suprimir exceção
        return False


# Singleton
_event_tracker: Optional[EventTracker] = None


def get_event_tracker() -> EventTracker:
    """Retorna instância singleton."""
    global _event_tracker
    if _event_tracker is None:
        _event_tracker = EventTracker()
    return _event_tracker
