# agents/sdk/python/auracore/__init__.py
"""
AuraCore Python SDK

Uso:
    from auracore import AuraCore
    
    client = AuraCore(api_key="ac_live_xxx")
    
    # Chat com agent
    response = await client.agents.chat(
        agent="fiscal",
        message="Calcule o ICMS para SP -> RJ"
    )
    
    # Voice
    text = await client.voice.transcribe(audio_file)
    audio = await client.voice.synthesize("Olá, mundo!")
    
    # RAG
    results = await client.rag.query("legislação ICMS")
"""

from .client import AuraCore
from .exceptions import (
    AuraCoreError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    ServerError
)
from .types import (
    AgentResponse,
    VoiceTranscription,
    VoiceSynthesis,
    RAGResult,
    Document
)

__version__ = "1.0.0"
__all__ = [
    "AuraCore",
    "AuraCoreError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    "ServerError",
    "AgentResponse",
    "VoiceTranscription",
    "VoiceSynthesis",
    "RAGResult",
    "Document"
]
