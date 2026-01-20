# agents/src/services/auth/api_key.py
"""
Gerenciamento de API Keys.
"""

import secrets
import hashlib
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import structlog

from src.services.cache import get_cache

logger = structlog.get_logger()


class APIKeyStatus(str, Enum):
    """Status de uma API Key."""
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


@dataclass
class APIKey:
    """Representação de uma API Key."""
    id: str
    key_hash: str
    name: str
    organization_id: int
    branch_id: int
    created_by: str
    status: APIKeyStatus = APIKeyStatus.ACTIVE
    permissions: list[str] = field(default_factory=list)
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    
    @property
    def is_valid(self) -> bool:
        """Verifica se a key é válida."""
        if self.status != APIKeyStatus.ACTIVE:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True
    
    def to_dict(self) -> dict:
        """Converte para dicionário."""
        return {
            "id": self.id,
            "key_hash": self.key_hash,
            "name": self.name,
            "organization_id": self.organization_id,
            "branch_id": self.branch_id,
            "created_by": self.created_by,
            "status": self.status.value,
            "permissions": self.permissions,
            "rate_limit_per_minute": self.rate_limit_per_minute,
            "rate_limit_per_hour": self.rate_limit_per_hour,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "APIKey":
        """Cria a partir de dicionário."""
        return cls(
            id=data["id"],
            key_hash=data["key_hash"],
            name=data["name"],
            organization_id=data["organization_id"],
            branch_id=data["branch_id"],
            created_by=data["created_by"],
            status=APIKeyStatus(data["status"]),
            permissions=data.get("permissions", []),
            rate_limit_per_minute=data.get("rate_limit_per_minute", 60),
            rate_limit_per_hour=data.get("rate_limit_per_hour", 1000),
            created_at=datetime.fromisoformat(data["created_at"]),
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
            last_used_at=datetime.fromisoformat(data["last_used_at"]) if data.get("last_used_at") else None
        )


class APIKeyManager:
    """
    Gerenciador de API Keys.
    
    Uso:
        manager = get_api_key_manager()
        
        # Criar nova key
        key, raw_key = await manager.create_key(
            name="Production Key",
            org_id=1,
            branch_id=1,
            created_by="admin",
            expires_in_days=365
        )
        
        # Validar key
        api_key = await manager.validate_key("ak_xxxxxxxxxxxxx")
        
        # Revogar key
        await manager.revoke_key(key_id)
    """
    
    # Prefixo das keys para identificação
    KEY_PREFIX = "ak_"
    
    def __init__(self):
        self._cache = get_cache()
        logger.info("api_key_manager_initialized")
    
    def _generate_key(self) -> str:
        """Gera uma nova API key."""
        # 32 bytes = 64 caracteres hex
        random_part = secrets.token_hex(32)
        return f"{self.KEY_PREFIX}{random_part}"
    
    def _hash_key(self, raw_key: str) -> str:
        """Gera hash SHA-256 da key."""
        return hashlib.sha256(raw_key.encode()).hexdigest()
    
    async def create_key(
        self,
        name: str,
        org_id: int,
        branch_id: int,
        created_by: str,
        permissions: Optional[list[str]] = None,
        expires_in_days: Optional[int] = None,
        rate_limit_per_minute: int = 60,
        rate_limit_per_hour: int = 1000
    ) -> tuple[APIKey, str]:
        """
        Cria uma nova API Key.
        
        Returns:
            (APIKey, raw_key) - A raw_key só é retornada uma vez!
        """
        import uuid
        
        raw_key = self._generate_key()
        key_hash = self._hash_key(raw_key)
        key_id = str(uuid.uuid4())
        
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        api_key = APIKey(
            id=key_id,
            key_hash=key_hash,
            name=name,
            organization_id=org_id,
            branch_id=branch_id,
            created_by=created_by,
            permissions=permissions or ["*"],
            rate_limit_per_minute=rate_limit_per_minute,
            rate_limit_per_hour=rate_limit_per_hour,
            expires_at=expires_at
        )
        
        # Salvar no cache (por hash para lookup rápido)
        await self._cache.set_json(
            f"apikey:hash:{key_hash}",
            api_key.to_dict(),
            ttl=86400 * 365  # 1 ano
        )
        
        # Índice por ID
        await self._cache.set_json(
            f"apikey:id:{key_id}",
            api_key.to_dict(),
            ttl=86400 * 365
        )
        
        # Índice por organização
        org_keys = await self._cache.get_json(f"apikey:org:{org_id}") or []
        org_keys.append(key_id)
        await self._cache.set_json(f"apikey:org:{org_id}", org_keys, ttl=86400 * 365)
        
        logger.info(
            "api_key_created",
            key_id=key_id,
            name=name,
            org_id=org_id,
            expires_at=expires_at
        )
        
        return api_key, raw_key
    
    async def validate_key(self, raw_key: str) -> Optional[APIKey]:
        """
        Valida uma API Key.
        
        Returns:
            APIKey se válida, None se inválida
        """
        if not raw_key or not raw_key.startswith(self.KEY_PREFIX):
            return None
        
        key_hash = self._hash_key(raw_key)
        
        data = await self._cache.get_json(f"apikey:hash:{key_hash}")
        if not data:
            logger.warning("api_key_not_found", key_prefix=raw_key[:10])
            return None
        
        api_key = APIKey.from_dict(data)
        
        if not api_key.is_valid:
            logger.warning(
                "api_key_invalid",
                key_id=api_key.id,
                status=api_key.status.value
            )
            return None
        
        # Atualizar last_used_at
        api_key.last_used_at = datetime.utcnow()
        await self._cache.set_json(
            f"apikey:hash:{key_hash}",
            api_key.to_dict(),
            ttl=86400 * 365
        )
        
        return api_key
    
    async def get_key_by_id(self, key_id: str) -> Optional[APIKey]:
        """Obtém key por ID."""
        data = await self._cache.get_json(f"apikey:id:{key_id}")
        if not data:
            return None
        return APIKey.from_dict(data)
    
    async def list_keys(self, org_id: int) -> list[APIKey]:
        """Lista keys de uma organização."""
        key_ids = await self._cache.get_json(f"apikey:org:{org_id}") or []
        
        keys = []
        for key_id in key_ids:
            key = await self.get_key_by_id(key_id)
            if key:
                keys.append(key)
        
        return keys
    
    async def revoke_key(self, key_id: str) -> bool:
        """Revoga uma API Key."""
        api_key = await self.get_key_by_id(key_id)
        if not api_key:
            return False
        
        api_key.status = APIKeyStatus.REVOKED
        
        # Atualizar em ambos os índices
        await self._cache.set_json(
            f"apikey:hash:{api_key.key_hash}",
            api_key.to_dict(),
            ttl=86400 * 365
        )
        await self._cache.set_json(
            f"apikey:id:{key_id}",
            api_key.to_dict(),
            ttl=86400 * 365
        )
        
        logger.info("api_key_revoked", key_id=key_id)
        return True
    
    async def rotate_key(self, key_id: str) -> tuple[Optional[APIKey], Optional[str]]:
        """
        Rotaciona uma API Key (cria nova, revoga antiga).
        
        Returns:
            (new_key, new_raw_key) ou (None, None) se falhar
        """
        old_key = await self.get_key_by_id(key_id)
        if not old_key:
            return None, None
        
        # Criar nova key com mesmas permissões
        new_key, new_raw_key = await self.create_key(
            name=f"{old_key.name} (rotated)",
            org_id=old_key.organization_id,
            branch_id=old_key.branch_id,
            created_by=old_key.created_by,
            permissions=old_key.permissions,
            rate_limit_per_minute=old_key.rate_limit_per_minute,
            rate_limit_per_hour=old_key.rate_limit_per_hour
        )
        
        # Revogar antiga
        await self.revoke_key(key_id)
        
        logger.info("api_key_rotated", old_key_id=key_id, new_key_id=new_key.id)
        
        return new_key, new_raw_key


# Singleton
_api_key_manager: Optional[APIKeyManager] = None


def get_api_key_manager() -> APIKeyManager:
    """Retorna instância singleton."""
    global _api_key_manager
    if _api_key_manager is None:
        _api_key_manager = APIKeyManager()
    return _api_key_manager
