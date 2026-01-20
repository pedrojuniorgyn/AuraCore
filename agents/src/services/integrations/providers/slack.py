# agents/src/services/integrations/providers/slack.py
"""
Provider de integração com Slack.

Features:
- Webhooks
- Bot API
- Block Kit messages
- Slash commands
"""

import time
import json
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


class SlackProvider(IntegrationProvider):
    """
    Provider para Slack.
    
    Configuração necessária:
    - webhook_url: URL do webhook
    - bot_token: Token do bot (opcional, para API)
    - default_channel: Canal padrão
    """
    
    SLACK_API_URL = "https://slack.com/api"
    
    async def send(self, message: Message) -> SendResult:
        """Envia mensagem para Slack."""
        start_time = time.perf_counter()
        
        webhook_url = self.config.credentials.get("webhook_url")
        bot_token = self.config.credentials.get("bot_token")
        
        # Determinar método de envio
        if bot_token and message.recipient.startswith("#"):
            # Usar Bot API para canais específicos
            result = await self._send_via_api(message, bot_token)
        elif webhook_url:
            # Usar Webhook
            result = await self._send_via_webhook(message, webhook_url)
        else:
            return SendResult(
                success=False,
                message_id=message.id,
                error="No webhook_url or bot_token configured"
            )
        
        result.latency_ms = (time.perf_counter() - start_time) * 1000
        return result
    
    async def _send_via_webhook(self, message: Message, webhook_url: str) -> SendResult:
        """Envia via Webhook."""
        payload = self._build_payload(message)
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(webhook_url, json=payload)
            
            if response.status_code == 200:
                self.logger.info("slack_message_sent", message_id=message.id)
                return SendResult(
                    success=True,
                    message_id=message.id,
                    response_data={"status": "ok"}
                )
            else:
                error = response.text
                self.logger.error("slack_send_failed", error=error)
                return SendResult(
                    success=False,
                    message_id=message.id,
                    error=error
                )
                
        except Exception as e:
            self.logger.error("slack_send_error", error=str(e))
            return SendResult(
                success=False,
                message_id=message.id,
                error=str(e)
            )
    
    async def _send_via_api(self, message: Message, token: str) -> SendResult:
        """Envia via Bot API."""
        payload = {
            "channel": message.recipient,
            **self._build_payload(message)
        }
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.SLACK_API_URL}/chat.postMessage",
                    headers={"Authorization": f"Bearer {token}"},
                    json=payload
                )
            
            data = response.json()
            
            if data.get("ok"):
                self.logger.info(
                    "slack_message_sent",
                    message_id=message.id,
                    ts=data.get("ts")
                )
                return SendResult(
                    success=True,
                    message_id=message.id,
                    provider_message_id=data.get("ts"),
                    response_data=data
                )
            else:
                error = data.get("error", "Unknown error")
                self.logger.error("slack_api_error", error=error)
                return SendResult(
                    success=False,
                    message_id=message.id,
                    error=error
                )
                
        except Exception as e:
            self.logger.error("slack_api_error", error=str(e))
            return SendResult(
                success=False,
                message_id=message.id,
                error=str(e)
            )
    
    def _build_payload(self, message: Message) -> dict:
        """Constrói payload do Slack."""
        payload: dict = {}
        
        # Texto simples ou blocks
        if message.content_type == "json":
            # Assumir que é Block Kit
            try:
                payload["blocks"] = json.loads(message.content)
            except json.JSONDecodeError:
                payload["text"] = message.content
        else:
            payload["text"] = message.content
        
        # Anexos
        if message.attachments:
            payload["attachments"] = message.attachments
        
        # Prioridade -> emoji
        priority_emoji = {
            MessagePriority.LOW: "ℹ️",
            MessagePriority.NORMAL: "",
            MessagePriority.HIGH: "⚠️",
            MessagePriority.URGENT: "🚨"
        }
        
        emoji = priority_emoji.get(message.priority, "")
        if emoji and "text" in payload:
            payload["text"] = f"{emoji} {payload['text']}"
        
        return payload
    
    async def validate_config(self) -> tuple[bool, Optional[str]]:
        """Valida configuração."""
        webhook_url = self.config.credentials.get("webhook_url")
        bot_token = self.config.credentials.get("bot_token")
        
        if not webhook_url and not bot_token:
            return False, "Either webhook_url or bot_token is required"
        
        if webhook_url and not webhook_url.startswith("https://hooks.slack.com/"):
            return False, "Invalid Slack webhook URL"
        
        return True, None
    
    async def test_connection(self) -> tuple[bool, Optional[str]]:
        """Testa conexão."""
        bot_token = self.config.credentials.get("bot_token")
        
        if bot_token:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.post(
                        f"{self.SLACK_API_URL}/auth.test",
                        headers={"Authorization": f"Bearer {bot_token}"}
                    )
                
                data = response.json()
                if data.get("ok"):
                    return True, None
                else:
                    return False, data.get("error", "Auth test failed")
                    
            except Exception as e:
                return False, str(e)
        
        # Webhook não tem teste de conexão
        return True, None
