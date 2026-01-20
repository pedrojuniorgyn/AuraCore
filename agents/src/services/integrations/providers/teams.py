# agents/src/services/integrations/providers/teams.py
"""
Provider de integração com Microsoft Teams.

Features:
- Incoming Webhooks
- Adaptive Cards
- Mention users
"""

import time
from typing import Optional
import structlog

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

from ..base import (
    IntegrationProvider,
    IntegrationConfig,
    Message,
    SendResult,
    MessagePriority
)

logger = structlog.get_logger()


class TeamsProvider(IntegrationProvider):
    """
    Provider para Microsoft Teams.
    
    Configuração necessária:
    - webhook_url: URL do incoming webhook
    """
    
    async def send(self, message: Message) -> SendResult:
        """Envia mensagem para Teams."""
        start_time = time.perf_counter()
        
        webhook_url = self.config.credentials.get("webhook_url")
        
        if not webhook_url:
            return SendResult(
                success=False,
                message_id=message.id,
                error="No webhook_url configured"
            )
        
        payload = self._build_adaptive_card(message)
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(webhook_url, json=payload)
            
            latency = (time.perf_counter() - start_time) * 1000
            
            if response.status_code == 200:
                self.logger.info("teams_message_sent", message_id=message.id)
                return SendResult(
                    success=True,
                    message_id=message.id,
                    latency_ms=latency
                )
            else:
                error = response.text
                self.logger.error("teams_send_failed", error=error)
                return SendResult(
                    success=False,
                    message_id=message.id,
                    error=error,
                    latency_ms=latency
                )
                
        except Exception as e:
            self.logger.error("teams_send_error", error=str(e))
            return SendResult(
                success=False,
                message_id=message.id,
                error=str(e)
            )
    
    def _build_adaptive_card(self, message: Message) -> dict:
        """Constrói Adaptive Card para Teams."""
        # Cor baseada na prioridade
        theme_color = {
            MessagePriority.LOW: "0076D7",
            MessagePriority.NORMAL: "0076D7",
            MessagePriority.HIGH: "FFA500",
            MessagePriority.URGENT: "FF0000"
        }.get(message.priority, "0076D7")
        
        # Ícone de prioridade
        priority_icon = {
            MessagePriority.LOW: "ℹ️",
            MessagePriority.NORMAL: "📨",
            MessagePriority.HIGH: "⚠️",
            MessagePriority.URGENT: "🚨"
        }.get(message.priority, "📨")
        
        # Body do card
        body: list = [
            {
                "type": "TextBlock",
                "text": f"{priority_icon} {message.subject or 'AuraCore Notification'}",
                "weight": "Bolder",
                "size": "Medium",
                "wrap": True
            },
            {
                "type": "TextBlock",
                "text": message.content,
                "wrap": True
            }
        ]
        
        # Adicionar metadados como facts
        if message.metadata:
            facts = [
                {"title": k, "value": str(v)}
                for k, v in list(message.metadata.items())[:5]  # Limitar a 5 facts
            ]
            body.append({
                "type": "FactSet",
                "facts": facts
            })
        
        # Adaptive Card
        card = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "contentUrl": None,
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": body,
                        "msteams": {
                            "width": "Full"
                        }
                    }
                }
            ]
        }
        
        return card
    
    async def validate_config(self) -> tuple[bool, Optional[str]]:
        """Valida configuração."""
        webhook_url = self.config.credentials.get("webhook_url")
        
        if not webhook_url:
            return False, "webhook_url is required"
        
        if "webhook.office.com" not in webhook_url:
            return False, "Invalid Teams webhook URL"
        
        return True, None
    
    async def test_connection(self) -> tuple[bool, Optional[str]]:
        """Testa conexão enviando card de teste."""
        webhook_url = self.config.credentials.get("webhook_url")
        
        test_payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.0",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": "✅ AuraCore connection test successful!"
                            }
                        ]
                    }
                }
            ]
        }
        
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(webhook_url, json=test_payload)
            
            if response.status_code == 200:
                return True, None
            else:
                return False, f"HTTP {response.status_code}: {response.text}"
                
        except Exception as e:
            return False, str(e)
