"""
Definição de eventos de webhook.
"""

from enum import Enum
from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import uuid


class EventType(str, Enum):
    """Tipos de eventos suportados."""
    
    # Agent Events
    AGENT_MESSAGE_RECEIVED = "agent.message.received"
    AGENT_MESSAGE_PROCESSED = "agent.message.processed"
    AGENT_ERROR = "agent.error"
    
    # Voice Events
    VOICE_TRANSCRIPTION_COMPLETED = "voice.transcription.completed"
    VOICE_SYNTHESIS_COMPLETED = "voice.synthesis.completed"
    VOICE_PROCESSING_COMPLETED = "voice.processing.completed"
    VOICE_ERROR = "voice.error"
    
    # Document Events
    DOCUMENT_IMPORTED = "document.imported"
    DOCUMENT_PROCESSED = "document.processed"
    DOCUMENT_ERROR = "document.error"
    
    # RAG Events
    RAG_QUERY_COMPLETED = "rag.query.completed"
    RAG_DOCUMENT_INDEXED = "rag.document.indexed"
    
    # Fiscal Events
    FISCAL_NFE_VALIDATED = "fiscal.nfe.validated"
    FISCAL_CTE_VALIDATED = "fiscal.cte.validated"
    FISCAL_TAX_CALCULATED = "fiscal.tax.calculated"
    
    # System Events
    SYSTEM_HEALTH_CHANGED = "system.health.changed"
    SYSTEM_ALERT_TRIGGERED = "system.alert.triggered"


@dataclass
class WebhookEvent:
    """
    Evento de webhook.
    
    Estrutura enviada para endpoints registrados.
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: EventType = EventType.AGENT_MESSAGE_PROCESSED
    timestamp: datetime = field(default_factory=datetime.utcnow)
    data: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    
    # Contexto
    organization_id: Optional[int] = None
    branch_id: Optional[int] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    
    def to_dict(self) -> dict[str, Any]:
        """Converte para dicionário."""
        return {
            "id": self.id,
            "type": self.type.value,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
            "metadata": self.metadata,
            "context": {
                "organization_id": self.organization_id,
                "branch_id": self.branch_id,
                "user_id": self.user_id,
                "session_id": self.session_id,
            }
        }
    
    def to_json(self) -> str:
        """Converte para JSON."""
        import json
        return json.dumps(self.to_dict(), default=str)
