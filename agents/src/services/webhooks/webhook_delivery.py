"""
Entrega de webhooks com retry e logging.
"""

import asyncio
import hashlib
import hmac
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import structlog

import httpx

from .webhook_events import WebhookEvent

logger = structlog.get_logger()


class DeliveryStatus(str, Enum):
    """Status de entrega."""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class DeliveryAttempt:
    """Tentativa de entrega."""
    timestamp: datetime
    status_code: Optional[int]
    response_body: Optional[str]
    error: Optional[str]
    duration_ms: float


@dataclass
class WebhookDelivery:
    """
    Gerencia entrega de webhook com retry.
    """
    
    event: WebhookEvent
    endpoint_url: str
    secret: Optional[str] = None
    
    # Config
    max_retries: int = 3
    retry_delay_seconds: int = 5
    timeout_seconds: int = 30
    
    # State
    status: DeliveryStatus = DeliveryStatus.PENDING
    attempts: list[DeliveryAttempt] = field(default_factory=list)
    delivered_at: Optional[datetime] = None
    
    def _generate_signature(self, payload: str) -> str:
        """Gera assinatura HMAC-SHA256."""
        if not self.secret:
            return ""
        
        signature = hmac.new(
            self.secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"sha256={signature}"
    
    async def deliver(self) -> bool:
        """
        Entrega o webhook com retry.
        
        Returns:
            True se entregue com sucesso
        """
        payload = self.event.to_json()
        signature = self._generate_signature(payload)
        
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Event": self.event.type.value,
            "X-Webhook-ID": self.event.id,
            "X-Webhook-Timestamp": self.event.timestamp.isoformat(),
        }
        
        if signature:
            headers["X-Webhook-Signature"] = signature
        
        for attempt in range(self.max_retries):
            self.status = DeliveryStatus.RETRYING if attempt > 0 else DeliveryStatus.PENDING
            
            start_time = datetime.utcnow()
            
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    response = await client.post(
                        self.endpoint_url,
                        content=payload,
                        headers=headers
                    )
                
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                attempt_record = DeliveryAttempt(
                    timestamp=start_time,
                    status_code=response.status_code,
                    response_body=response.text[:500] if response.text else None,
                    error=None,
                    duration_ms=duration_ms
                )
                self.attempts.append(attempt_record)
                
                # 2xx é sucesso
                if 200 <= response.status_code < 300:
                    self.status = DeliveryStatus.SUCCESS
                    self.delivered_at = datetime.utcnow()
                    
                    logger.info(
                        "webhook_delivered",
                        event_id=self.event.id,
                        event_type=self.event.type.value,
                        endpoint=self.endpoint_url,
                        status_code=response.status_code,
                        attempts=attempt + 1
                    )
                    
                    return True
                
                # 4xx não faz retry (erro do cliente)
                if 400 <= response.status_code < 500:
                    self.status = DeliveryStatus.FAILED
                    logger.warning(
                        "webhook_client_error",
                        event_id=self.event.id,
                        status_code=response.status_code
                    )
                    return False
                
            except Exception as e:
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                attempt_record = DeliveryAttempt(
                    timestamp=start_time,
                    status_code=None,
                    response_body=None,
                    error=str(e),
                    duration_ms=duration_ms
                )
                self.attempts.append(attempt_record)
                
                logger.warning(
                    "webhook_delivery_error",
                    event_id=self.event.id,
                    attempt=attempt + 1,
                    error=str(e)
                )
            
            # Esperar antes de retry
            if attempt < self.max_retries - 1:
                delay = self.retry_delay_seconds * (2 ** attempt)  # Exponential backoff
                await asyncio.sleep(delay)
        
        # Todas as tentativas falharam
        self.status = DeliveryStatus.FAILED
        logger.error(
            "webhook_delivery_failed",
            event_id=self.event.id,
            endpoint=self.endpoint_url,
            attempts=len(self.attempts)
        )
        
        return False
