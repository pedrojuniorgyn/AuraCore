# agents/src/services/integrations/__init__.py
"""Hub de integrações externas."""

from .integration_hub import IntegrationHub, get_integration_hub
from .base import (
    IntegrationType,
    IntegrationConfig,
    Message,
    SendResult,
    MessagePriority,
    IntegrationProvider
)
from .providers.slack import SlackProvider
from .providers.teams import TeamsProvider
from .providers.email import EmailProvider
from .providers.webhook import WebhookProvider

__all__ = [
    "IntegrationHub",
    "get_integration_hub",
    "IntegrationType",
    "IntegrationConfig",
    "Message",
    "SendResult",
    "MessagePriority",
    "IntegrationProvider",
    "SlackProvider",
    "TeamsProvider",
    "EmailProvider",
    "WebhookProvider"
]
