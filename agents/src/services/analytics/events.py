# agents/src/services/analytics/events.py
"""
Definição de eventos de analytics.
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


class EventType(str, Enum):
    """Tipos de eventos rastreáveis."""
    
    # Agent Events
    AGENT_REQUEST = "agent.request"
    AGENT_RESPONSE = "agent.response"
    AGENT_ERROR = "agent.error"
    
    # Tool Events
    TOOL_CALL = "tool.call"
    TOOL_SUCCESS = "tool.success"
    TOOL_ERROR = "tool.error"
    
    # Voice Events
    VOICE_TRANSCRIPTION = "voice.transcription"
    VOICE_SYNTHESIS = "voice.synthesis"
    
    # RAG Events
    RAG_QUERY = "rag.query"
    RAG_INDEX = "rag.index"
    
    # Document Events
    DOCUMENT_IMPORT = "document.import"
    DOCUMENT_PROCESS = "document.process"
    
    # User Events
    USER_SESSION_START = "user.session_start"
    USER_SESSION_END = "user.session_end"
    USER_FEEDBACK = "user.feedback"
    
    # Integration Events
    INTEGRATION_SEND = "integration.send"
    INTEGRATION_RECEIVE = "integration.receive"
    
    # System Events
    SYSTEM_ERROR = "system.error"
    SYSTEM_ALERT = "system.alert"


@dataclass
class AnalyticsEvent:
    """
    Evento de analytics.
    
    Campos obrigatórios para multi-tenancy:
    - organization_id
    - branch_id
    
    Campos opcionais para contexto:
    - user_id
    - session_id
    - agent_name
    - tool_name
    """
    
    # Identificação
    id: str
    type: EventType
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    # Multi-tenancy (OBRIGATÓRIO)
    organization_id: int = 0
    branch_id: int = 0
    
    # Contexto
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    
    # Agent/Tool específico
    agent_name: Optional[str] = None
    tool_name: Optional[str] = None
    
    # Métricas
    duration_ms: Optional[float] = None
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    success: bool = True
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    
    # Metadados (sem PII!)
    metadata: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        """Converte para dicionário."""
        return {
            "id": self.id,
            "type": self.type.value,
            "timestamp": self.timestamp.isoformat(),
            "organization_id": self.organization_id,
            "branch_id": self.branch_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "agent_name": self.agent_name,
            "tool_name": self.tool_name,
            "duration_ms": self.duration_ms,
            "tokens_input": self.tokens_input,
            "tokens_output": self.tokens_output,
            "success": self.success,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "AnalyticsEvent":
        """Cria evento a partir de dicionário."""
        return cls(
            id=data["id"],
            type=EventType(data["type"]),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            organization_id=data.get("organization_id", 0),
            branch_id=data.get("branch_id", 0),
            user_id=data.get("user_id"),
            session_id=data.get("session_id"),
            agent_name=data.get("agent_name"),
            tool_name=data.get("tool_name"),
            duration_ms=data.get("duration_ms"),
            tokens_input=data.get("tokens_input"),
            tokens_output=data.get("tokens_output"),
            success=data.get("success", True),
            error_code=data.get("error_code"),
            error_message=data.get("error_message"),
            metadata=data.get("metadata", {})
        )
