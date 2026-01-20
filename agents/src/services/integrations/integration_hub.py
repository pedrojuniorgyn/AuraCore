# agents/src/services/integrations/integration_hub.py
"""
Hub central de integrações.
"""

import uuid
from typing import Optional, Type
from datetime import datetime
import structlog

from .base import (
    IntegrationType,
    IntegrationConfig,
    IntegrationProvider,
    Message,
    SendResult,
    MessagePriority
)
from .providers import (
    SlackProvider,
    TeamsProvider,
    EmailProvider,
    WebhookProvider
)
from src.services.cache import get_cache

logger = structlog.get_logger()


# Mapeamento de tipos para providers
PROVIDER_MAP: dict[IntegrationType, Type[IntegrationProvider]] = {
    IntegrationType.SLACK: SlackProvider,
    IntegrationType.TEAMS: TeamsProvider,
    IntegrationType.EMAIL: EmailProvider,
    IntegrationType.WEBHOOK: WebhookProvider,
}


class IntegrationHub:
    """
    Hub central para gerenciamento de integrações.
    
    Uso:
        hub = get_integration_hub()
        
        # Criar integração
        config = await hub.create_integration(
            type=IntegrationType.SLACK,
            name="Alertas",
            org_id=1,
            branch_id=1,
            credentials={"webhook_url": "https://..."}
        )
        
        # Enviar mensagem
        result = await hub.send_message(
            integration_id=config.id,
            recipient="#alerts",
            content="Nova venda realizada!",
            priority=MessagePriority.HIGH
        )
        
        # Broadcast para todas integrações
        await hub.broadcast(
            org_id=1,
            content="Sistema em manutenção",
            priority=MessagePriority.URGENT
        )
    """
    
    def __init__(self):
        self._cache = get_cache()
        self._providers: dict[str, IntegrationProvider] = {}
        logger.info("integration_hub_initialized")
    
    # ===== CRUD DE INTEGRAÇÕES =====
    
    async def create_integration(
        self,
        type: IntegrationType,
        name: str,
        org_id: int,
        branch_id: int,
        credentials: dict,
        settings: Optional[dict] = None
    ) -> IntegrationConfig:
        """Cria nova integração."""
        config = IntegrationConfig(
            id=str(uuid.uuid4()),
            type=type,
            name=name,
            organization_id=org_id,
            branch_id=branch_id,
            credentials=credentials,
            settings=settings or {}
        )
        
        # Validar
        provider = self._get_provider(config)
        is_valid, error = await provider.validate_config()
        
        if not is_valid:
            raise ValueError(f"Invalid configuration: {error}")
        
        # Salvar
        await self._save_config(config)
        
        logger.info(
            "integration_created",
            integration_id=config.id,
            type=type.value,
            name=name
        )
        
        return config
    
    async def get_integration(self, integration_id: str) -> Optional[IntegrationConfig]:
        """Obtém integração por ID."""
        data = await self._cache.get_json(f"integration:{integration_id}")
        
        if not data:
            return None
        
        return IntegrationConfig(
            id=data["id"],
            type=IntegrationType(data["type"]),
            name=data["name"],
            organization_id=data["organization_id"],
            branch_id=data["branch_id"],
            is_active=data["is_active"],
            credentials=data["credentials"],
            settings=data.get("settings", {}),
            rate_limit_per_minute=data.get("rate_limit_per_minute", 60),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"])
        )
    
    async def list_integrations(
        self,
        org_id: int,
        branch_id: Optional[int] = None,
        type: Optional[IntegrationType] = None
    ) -> list[IntegrationConfig]:
        """Lista integrações."""
        # Obter índice de integrações da organização
        index_key = f"integration:index:{org_id}"
        integration_ids = await self._cache.get_json(index_key) or []
        
        integrations = []
        for integration_id in integration_ids:
            config = await self.get_integration(integration_id)
            if config:
                # Filtros
                if branch_id and config.branch_id != branch_id:
                    continue
                if type and config.type != type:
                    continue
                integrations.append(config)
        
        return integrations
    
    async def update_integration(
        self,
        integration_id: str,
        **updates
    ) -> Optional[IntegrationConfig]:
        """Atualiza integração."""
        config = await self.get_integration(integration_id)
        
        if not config:
            return None
        
        # Atualizar campos
        if "name" in updates:
            config.name = updates["name"]
        if "credentials" in updates:
            config.credentials.update(updates["credentials"])
        if "settings" in updates:
            config.settings.update(updates["settings"])
        if "is_active" in updates:
            config.is_active = updates["is_active"]
        
        config.updated_at = datetime.utcnow()
        
        # Revalidar se credentials mudaram
        if "credentials" in updates:
            provider = self._get_provider(config)
            is_valid, error = await provider.validate_config()
            if not is_valid:
                raise ValueError(f"Invalid configuration: {error}")
        
        await self._save_config(config)
        
        # Limpar provider em cache
        if integration_id in self._providers:
            del self._providers[integration_id]
        
        return config
    
    async def delete_integration(self, integration_id: str) -> bool:
        """Remove integração."""
        config = await self.get_integration(integration_id)
        
        if not config:
            return False
        
        await self._cache.delete(f"integration:{integration_id}")
        
        # Remover do índice
        index_key = f"integration:index:{config.organization_id}"
        integration_ids = await self._cache.get_json(index_key) or []
        if integration_id in integration_ids:
            integration_ids.remove(integration_id)
            await self._cache.set_json(index_key, integration_ids, ttl=2592000)
        
        if integration_id in self._providers:
            del self._providers[integration_id]
        
        logger.info("integration_deleted", integration_id=integration_id)
        return True
    
    # ===== ENVIO DE MENSAGENS =====
    
    async def send_message(
        self,
        integration_id: str,
        recipient: str,
        content: str,
        subject: Optional[str] = None,
        content_type: str = "text",
        priority: MessagePriority = MessagePriority.NORMAL,
        metadata: Optional[dict] = None
    ) -> SendResult:
        """Envia mensagem via integração específica."""
        config = await self.get_integration(integration_id)
        
        if not config:
            return SendResult(
                success=False,
                message_id="",
                error="Integration not found"
            )
        
        if not config.is_active:
            return SendResult(
                success=False,
                message_id="",
                error="Integration is inactive"
            )
        
        message = Message(
            id=str(uuid.uuid4()),
            integration_id=integration_id,
            recipient=recipient,
            subject=subject,
            content=content,
            content_type=content_type,
            priority=priority,
            metadata=metadata or {}
        )
        
        provider = self._get_provider(config)
        result = await provider.send(message)
        
        # Audit log
        await self._log_send(config, message, result)
        
        return result
    
    async def broadcast(
        self,
        org_id: int,
        content: str,
        subject: Optional[str] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
        integration_types: Optional[list[IntegrationType]] = None
    ) -> list[SendResult]:
        """Envia para todas integrações da organização."""
        integrations = await self.list_integrations(org_id)
        
        if integration_types:
            integrations = [i for i in integrations if i.type in integration_types]
        
        results = []
        for integration in integrations:
            if integration.is_active:
                # Determinar recipient padrão
                recipient = integration.settings.get("default_recipient", "")
                
                if recipient:
                    result = await self.send_message(
                        integration_id=integration.id,
                        recipient=recipient,
                        content=content,
                        subject=subject,
                        priority=priority
                    )
                    results.append(result)
        
        return results
    
    # ===== TESTE DE CONEXÃO =====
    
    async def test_integration(self, integration_id: str) -> tuple[bool, Optional[str]]:
        """Testa conexão da integração."""
        config = await self.get_integration(integration_id)
        
        if not config:
            return False, "Integration not found"
        
        provider = self._get_provider(config)
        return await provider.test_connection()
    
    # ===== HELPERS =====
    
    def _get_provider(self, config: IntegrationConfig) -> IntegrationProvider:
        """Obtém ou cria provider para a integração."""
        if config.id in self._providers:
            return self._providers[config.id]
        
        provider_class = PROVIDER_MAP.get(config.type)
        if not provider_class:
            raise ValueError(f"Unknown integration type: {config.type}")
        
        provider = provider_class(config)
        self._providers[config.id] = provider
        
        return provider
    
    async def _save_config(self, config: IntegrationConfig):
        """Salva configuração no cache."""
        await self._cache.set_json(
            f"integration:{config.id}",
            {
                "id": config.id,
                "type": config.type.value,
                "name": config.name,
                "organization_id": config.organization_id,
                "branch_id": config.branch_id,
                "is_active": config.is_active,
                "credentials": config.credentials,
                "settings": config.settings,
                "rate_limit_per_minute": config.rate_limit_per_minute,
                "created_at": config.created_at.isoformat(),
                "updated_at": config.updated_at.isoformat()
            },
            ttl=2592000  # 30 dias
        )
        
        # Adicionar ao índice da organização
        index_key = f"integration:index:{config.organization_id}"
        integration_ids = await self._cache.get_json(index_key) or []
        if config.id not in integration_ids:
            integration_ids.append(config.id)
            await self._cache.set_json(index_key, integration_ids, ttl=2592000)
    
    async def _log_send(
        self,
        config: IntegrationConfig,
        message: Message,
        result: SendResult
    ):
        """Log de envio para auditoria."""
        logger.info(
            "integration_message_sent",
            integration_id=config.id,
            integration_type=config.type.value,
            message_id=message.id,
            recipient=message.recipient,
            priority=message.priority.value,
            success=result.success,
            latency_ms=result.latency_ms,
            error=result.error
        )


# Singleton
_integration_hub: Optional[IntegrationHub] = None


def get_integration_hub() -> IntegrationHub:
    """Retorna instância singleton."""
    global _integration_hub
    if _integration_hub is None:
        _integration_hub = IntegrationHub()
    return _integration_hub
