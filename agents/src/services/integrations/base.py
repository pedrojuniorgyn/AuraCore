# agents/src/services/integrations/base.py
"""
Base classes para providers de integração.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import structlog

logger = structlog.get_logger()


class IntegrationType(str, Enum):
    """Tipos de integração suportados."""
    SLACK = "slack"
    TEAMS = "teams"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    WEBHOOK = "webhook"


class MessagePriority(str, Enum):
    """Prioridade de mensagens."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class IntegrationConfig:
    """Configuração de uma integração."""
    id: str
    type: IntegrationType
    name: str
    organization_id: int
    branch_id: int
    is_active: bool = True
    credentials: dict = field(default_factory=dict)
    settings: dict = field(default_factory=dict)
    rate_limit_per_minute: int = 60
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Message:
    """Mensagem a ser enviada."""
    id: str
    integration_id: str
    recipient: str  # channel, email, phone, webhook_url
    subject: Optional[str] = None
    content: str = ""
    content_type: str = "text"  # text, html, markdown, json
    priority: MessagePriority = MessagePriority.NORMAL
    metadata: dict = field(default_factory=dict)
    attachments: list = field(default_factory=list)
    template_id: Optional[str] = None
    template_data: dict = field(default_factory=dict)


@dataclass
class SendResult:
    """Resultado do envio."""
    success: bool
    message_id: str
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    response_data: dict = field(default_factory=dict)
    sent_at: datetime = field(default_factory=datetime.utcnow)
    latency_ms: float = 0


class IntegrationProvider(ABC):
    """
    Base class para providers de integração.
    
    Implementar:
    - send(): Envia mensagem
    - validate_config(): Valida configuração
    - test_connection(): Testa conexão
    """
    
    def __init__(self, config: IntegrationConfig):
        self.config = config
        self.logger = structlog.get_logger().bind(
            integration_type=config.type.value,
            integration_id=config.id
        )
    
    @property
    def integration_type(self) -> IntegrationType:
        """Retorna tipo da integração."""
        return self.config.type
    
    @abstractmethod
    async def send(self, message: Message) -> SendResult:
        """Envia mensagem."""
        pass
    
    @abstractmethod
    async def validate_config(self) -> tuple[bool, Optional[str]]:
        """Valida configuração. Retorna (is_valid, error_message)."""
        pass
    
    @abstractmethod
    async def test_connection(self) -> tuple[bool, Optional[str]]:
        """Testa conexão. Retorna (is_connected, error_message)."""
        pass
    
    def _mask_sensitive(self, data: dict, keys: list[str]) -> dict:
        """Mascara dados sensíveis para logs."""
        masked = data.copy()
        for key in keys:
            if key in masked:
                value = str(masked[key])
                if len(value) > 8:
                    masked[key] = value[:4] + "****" + value[-4:]
                else:
                    masked[key] = "****"
        return masked
