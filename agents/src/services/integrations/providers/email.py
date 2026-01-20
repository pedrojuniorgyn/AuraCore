# agents/src/services/integrations/providers/email.py
"""
Provider de integração com Email.

Features:
- SMTP direto
- SendGrid API
- Templates HTML
- Anexos
"""

import time
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import structlog

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import aiosmtplib
    SMTP_AVAILABLE = True
except ImportError:
    SMTP_AVAILABLE = False

from ..base import (
    IntegrationProvider,
    IntegrationConfig,
    Message,
    SendResult,
    MessagePriority
)

logger = structlog.get_logger()


class EmailProvider(IntegrationProvider):
    """
    Provider para Email.
    
    Configuração necessária (SMTP):
    - smtp_host: Host SMTP
    - smtp_port: Porta (587 para TLS)
    - smtp_user: Usuário
    - smtp_password: Senha
    - from_email: Email remetente
    - from_name: Nome remetente
    
    Configuração (SendGrid):
    - sendgrid_api_key: API Key do SendGrid
    - from_email: Email remetente
    - from_name: Nome remetente
    """
    
    SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"
    
    async def send(self, message: Message) -> SendResult:
        """Envia email."""
        start_time = time.perf_counter()
        
        sendgrid_key = self.config.credentials.get("sendgrid_api_key")
        
        if sendgrid_key:
            result = await self._send_via_sendgrid(message, sendgrid_key)
        else:
            result = await self._send_via_smtp(message)
        
        result.latency_ms = (time.perf_counter() - start_time) * 1000
        return result
    
    async def _send_via_sendgrid(self, message: Message, api_key: str) -> SendResult:
        """Envia via SendGrid."""
        from_email = self.config.credentials.get("from_email")
        from_name = self.config.credentials.get("from_name", "AuraCore")
        
        personalizations: dict = {
            "to": [{"email": message.recipient}],
            "subject": message.subject or "Notification from AuraCore"
        }
        
        # Prioridade
        if message.priority == MessagePriority.URGENT:
            personalizations["headers"] = {
                "X-Priority": "1",
                "Importance": "high"
            }
        
        payload = {
            "personalizations": [personalizations],
            "from": {
                "email": from_email,
                "name": from_name
            },
            "content": [
                {
                    "type": "text/html" if message.content_type == "html" else "text/plain",
                    "value": message.content
                }
            ]
        }
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    self.SENDGRID_API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
            
            if response.status_code in [200, 202]:
                message_id_header = response.headers.get("X-Message-Id")
                self.logger.info("email_sent_sendgrid", message_id=message.id)
                return SendResult(
                    success=True,
                    message_id=message.id,
                    provider_message_id=message_id_header
                )
            else:
                error = response.text
                self.logger.error("sendgrid_error", error=error)
                return SendResult(
                    success=False,
                    message_id=message.id,
                    error=error
                )
                
        except Exception as e:
            self.logger.error("sendgrid_error", error=str(e))
            return SendResult(
                success=False,
                message_id=message.id,
                error=str(e)
            )
    
    async def _send_via_smtp(self, message: Message) -> SendResult:
        """Envia via SMTP."""
        if not SMTP_AVAILABLE:
            return SendResult(
                success=False,
                message_id=message.id,
                error="aiosmtplib not installed"
            )
        
        smtp_host = self.config.credentials.get("smtp_host")
        smtp_port = int(self.config.credentials.get("smtp_port", 587))
        smtp_user = self.config.credentials.get("smtp_user")
        smtp_password = self.config.credentials.get("smtp_password")
        from_email = self.config.credentials.get("from_email")
        from_name = self.config.credentials.get("from_name", "AuraCore")
        
        # Construir email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = message.subject or "Notification from AuraCore"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = message.recipient
        
        # Prioridade
        if message.priority == MessagePriority.URGENT:
            msg["X-Priority"] = "1"
            msg["Importance"] = "high"
        
        # Conteúdo
        content_type = "html" if message.content_type == "html" else "plain"
        msg.attach(MIMEText(message.content, content_type))
        
        try:
            await aiosmtplib.send(
                msg,
                hostname=smtp_host,
                port=smtp_port,
                username=smtp_user,
                password=smtp_password,
                start_tls=True
            )
            
            self.logger.info("email_sent_smtp", message_id=message.id)
            return SendResult(
                success=True,
                message_id=message.id
            )
            
        except Exception as e:
            self.logger.error("smtp_error", error=str(e))
            return SendResult(
                success=False,
                message_id=message.id,
                error=str(e)
            )
    
    async def validate_config(self) -> tuple[bool, Optional[str]]:
        """Valida configuração."""
        sendgrid_key = self.config.credentials.get("sendgrid_api_key")
        smtp_host = self.config.credentials.get("smtp_host")
        from_email = self.config.credentials.get("from_email")
        
        if not from_email:
            return False, "from_email is required"
        
        if not sendgrid_key and not smtp_host:
            return False, "Either sendgrid_api_key or smtp_host is required"
        
        return True, None
    
    async def test_connection(self) -> tuple[bool, Optional[str]]:
        """Testa conexão."""
        sendgrid_key = self.config.credentials.get("sendgrid_api_key")
        
        if sendgrid_key:
            # SendGrid - verificar API key com request de scopes
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get(
                        "https://api.sendgrid.com/v3/scopes",
                        headers={"Authorization": f"Bearer {sendgrid_key}"}
                    )
                
                if response.status_code == 200:
                    return True, None
                else:
                    return False, f"Invalid API key: {response.status_code}"
                    
            except Exception as e:
                return False, str(e)
        else:
            # Testar SMTP
            if not SMTP_AVAILABLE:
                return False, "aiosmtplib not installed"
            
            try:
                smtp_host = self.config.credentials.get("smtp_host")
                smtp_port = int(self.config.credentials.get("smtp_port", 587))
                smtp_user = self.config.credentials.get("smtp_user")
                smtp_password = self.config.credentials.get("smtp_password")
                
                smtp = aiosmtplib.SMTP(hostname=smtp_host, port=smtp_port)
                await smtp.connect()
                await smtp.starttls()
                await smtp.login(smtp_user, smtp_password)
                await smtp.quit()
                
                return True, None
                
            except Exception as e:
                return False, str(e)
