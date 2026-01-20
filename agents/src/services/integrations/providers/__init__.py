# agents/src/services/integrations/providers/__init__.py
"""Providers de integração."""

from .slack import SlackProvider
from .teams import TeamsProvider
from .email import EmailProvider
from .webhook import WebhookProvider

__all__ = [
    "SlackProvider",
    "TeamsProvider",
    "EmailProvider",
    "WebhookProvider"
]
