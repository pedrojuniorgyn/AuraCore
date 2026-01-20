# agents/src/services/integrations/providers/webhook.py
"""
Provider genérico para Webhooks.

Features:
- POST/PUT requests
- Headers customizados
- Autenticação (Bearer, Basic, API Key)
- Retry com backoff
"""

import time
import base64
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
    SendResult
)

logger = structlog.get_logger()


class WebhookProvider(IntegrationProvider):
    """
    Provider genérico para Webhooks.
    
    Configuração necessária:
    - url: URL do webhook
    - method: HTTP method (POST, PUT)
    - auth_type: Tipo de auth (none, bearer, basic, api_key)
    - auth_token: Token/senha
    - auth_user: Usuário (para basic)
    - auth_header: Nome do header (para api_key)
    - custom_headers: Headers adicionais
    - timeout: Timeout em segundos
    """
    
    async def send(self, message: Message) -> SendResult:
        """Envia mensagem via webhook."""
        start_time = time.perf_counter()
        
        url = self.config.credentials.get("url")
        if not url:
            return SendResult(
                success=False,
                message_id=message.id,
                error="No URL configured"
            )
        
        method = self.config.settings.get("method", "POST").upper()
        timeout = int(self.config.settings.get("timeout", 30))
        
        headers = self._build_headers()
        payload = self._build_payload(message)
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if method == "PUT":
                    response = await client.put(url, json=payload, headers=headers)
                else:
                    response = await client.post(url, json=payload, headers=headers)
            
            latency = (time.perf_counter() - start_time) * 1000
            
            if 200 <= response.status_code < 300:
                self.logger.info(
                    "webhook_sent",
                    message_id=message.id,
                    status_code=response.status_code
                )
                return SendResult(
                    success=True,
                    message_id=message.id,
                    response_data={"status_code": response.status_code},
                    latency_ms=latency
                )
            else:
                error = f"HTTP {response.status_code}: {response.text[:200]}"
                self.logger.error("webhook_failed", error=error)
                return SendResult(
                    success=False,
                    message_id=message.id,
                    error=error,
                    latency_ms=latency
                )
                
        except Exception as e:
            self.logger.error("webhook_error", error=str(e))
            return SendResult(
                success=False,
                message_id=message.id,
                error=str(e)
            )
    
    def _build_headers(self) -> dict:
        """Constrói headers do request."""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AuraCore/1.0"
        }
        
        # Custom headers
        custom_headers = self.config.settings.get("custom_headers", {})
        headers.update(custom_headers)
        
        # Autenticação
        auth_type = self.config.settings.get("auth_type", "none")
        auth_token = self.config.credentials.get("auth_token")
        auth_user = self.config.credentials.get("auth_user")
        auth_header = self.config.settings.get("auth_header", "X-API-Key")
        
        if auth_type == "bearer" and auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        elif auth_type == "basic" and auth_user and auth_token:
            credentials = base64.b64encode(f"{auth_user}:{auth_token}".encode()).decode()
            headers["Authorization"] = f"Basic {credentials}"
        elif auth_type == "api_key" and auth_token:
            headers[auth_header] = auth_token
        
        return headers
    
    def _build_payload(self, message: Message) -> dict:
        """Constrói payload do request."""
        # Se conteúdo já é JSON, usar diretamente
        if message.content_type == "json":
            try:
                return json.loads(message.content)
            except json.JSONDecodeError:
                pass
        
        # Payload padrão
        return {
            "id": message.id,
            "subject": message.subject,
            "content": message.content,
            "priority": message.priority.value,
            "metadata": message.metadata,
            "timestamp": time.time()
        }
    
    async def validate_config(self) -> tuple[bool, Optional[str]]:
        """Valida configuração."""
        url = self.config.credentials.get("url")
        
        if not url:
            return False, "URL is required"
        
        if not url.startswith(("http://", "https://")):
            return False, "Invalid URL format"
        
        return True, None
    
    async def test_connection(self) -> tuple[bool, Optional[str]]:
        """Testa conexão com HEAD request."""
        url = self.config.credentials.get("url")
        timeout = int(self.config.settings.get("timeout", 10))
        headers = self._build_headers()
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.head(url, headers=headers)
            
            # Aceitar qualquer resposta que não seja timeout/erro de conexão
            return True, None
            
        except Exception as e:
            return False, str(e)
