# agents/sdk/python/auracore/types.py
"""
Tipos do SDK.
"""

from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime


@dataclass
class AgentResponse:
    """Resposta de um agent."""
    message: str
    agent: str
    tool_calls: List[dict] = field(default_factory=list)
    tokens_input: int = 0
    tokens_output: int = 0
    duration_ms: float = 0
    session_id: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class VoiceTranscription:
    """Resultado de transcrição de voz."""
    text: str
    language: str
    confidence: float
    duration_seconds: float
    segments: List[dict] = field(default_factory=list)


@dataclass
class VoiceSynthesis:
    """Resultado de síntese de voz."""
    audio_base64: str
    format: str
    duration_seconds: float
    sample_rate: int


@dataclass
class RAGResult:
    """Resultado de query RAG."""
    answer: str
    sources: List[dict]
    confidence: float
    query: str


@dataclass
class Document:
    """Documento."""
    id: str
    name: str
    type: str
    size_bytes: int
    created_at: datetime
    metadata: dict = field(default_factory=dict)


@dataclass
class AnalyticsStats:
    """Estatísticas de uso."""
    total_requests: int
    total_tokens: int
    total_errors: int
    error_rate: float
    active_users: int
    period_start: datetime
    period_end: datetime
