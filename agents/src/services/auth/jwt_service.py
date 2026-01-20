# agents/src/services/auth/jwt_service.py
"""
Serviço de JWT Tokens.
"""

import os
from typing import Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import structlog

try:
    import jwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False

logger = structlog.get_logger()


@dataclass
class TokenPayload:
    """Payload do token JWT."""
    sub: str  # Subject (user_id)
    org_id: int
    branch_id: int
    permissions: list[str]
    exp: datetime
    iat: datetime
    jti: Optional[str] = None  # JWT ID
    
    def to_dict(self) -> dict:
        return {
            "sub": self.sub,
            "org_id": self.org_id,
            "branch_id": self.branch_id,
            "permissions": self.permissions,
            "exp": int(self.exp.timestamp()),
            "iat": int(self.iat.timestamp()),
            "jti": self.jti
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "TokenPayload":
        return cls(
            sub=data["sub"],
            org_id=data["org_id"],
            branch_id=data["branch_id"],
            permissions=data.get("permissions", []),
            exp=datetime.fromtimestamp(data["exp"]),
            iat=datetime.fromtimestamp(data["iat"]),
            jti=data.get("jti")
        )


class JWTService:
    """
    Serviço de criação e validação de JWT.
    
    Uso:
        jwt_service = get_jwt_service()
        
        # Criar token
        token = jwt_service.create_token(
            user_id="user123",
            org_id=1,
            branch_id=1,
            permissions=["agent:read", "agent:write"]
        )
        
        # Validar token
        payload = jwt_service.verify_token(token)
    """
    
    def __init__(
        self,
        secret_key: Optional[str] = None,
        algorithm: str = "HS256",
        access_token_expire_minutes: int = 60,
        refresh_token_expire_days: int = 7
    ):
        if not JWT_AVAILABLE:
            raise RuntimeError("PyJWT não instalado")
        
        self._secret_key = secret_key or os.getenv("JWT_SECRET_KEY", "change-me-in-production")
        self._algorithm = algorithm
        self._access_expire = timedelta(minutes=access_token_expire_minutes)
        self._refresh_expire = timedelta(days=refresh_token_expire_days)
        
        if self._secret_key == "change-me-in-production":
            logger.warning("jwt_using_default_secret")
        
        logger.info("jwt_service_initialized", algorithm=algorithm)
    
    def create_token(
        self,
        user_id: str,
        org_id: int,
        branch_id: int,
        permissions: list[str],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Cria um access token."""
        import uuid
        
        now = datetime.utcnow()
        expire = now + (expires_delta or self._access_expire)
        
        payload = TokenPayload(
            sub=user_id,
            org_id=org_id,
            branch_id=branch_id,
            permissions=permissions,
            exp=expire,
            iat=now,
            jti=str(uuid.uuid4())
        )
        
        token = jwt.encode(
            payload.to_dict(),
            self._secret_key,
            algorithm=self._algorithm
        )
        
        logger.debug("jwt_created", user_id=user_id, expires_at=expire)
        
        return token
    
    def create_refresh_token(
        self,
        user_id: str,
        org_id: int,
        branch_id: int
    ) -> str:
        """Cria um refresh token (longa duração)."""
        return self.create_token(
            user_id=user_id,
            org_id=org_id,
            branch_id=branch_id,
            permissions=["refresh"],
            expires_delta=self._refresh_expire
        )
    
    def verify_token(self, token: str) -> Optional[TokenPayload]:
        """
        Verifica e decodifica um token.
        
        Returns:
            TokenPayload se válido, None se inválido
        """
        try:
            data = jwt.decode(
                token,
                self._secret_key,
                algorithms=[self._algorithm]
            )
            return TokenPayload.from_dict(data)
        
        except jwt.ExpiredSignatureError:
            logger.warning("jwt_expired")
            return None
        
        except jwt.InvalidTokenError as e:
            logger.warning("jwt_invalid", error=str(e))
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """
        Usa refresh token para criar novo access token.
        
        Returns:
            Novo access token ou None se refresh inválido
        """
        payload = self.verify_token(refresh_token)
        
        if not payload:
            return None
        
        if "refresh" not in payload.permissions:
            logger.warning("jwt_not_refresh_token")
            return None
        
        return self.create_token(
            user_id=payload.sub,
            org_id=payload.org_id,
            branch_id=payload.branch_id,
            permissions=[]  # Permissões reais devem vir do banco
        )


# Singleton
_jwt_service: Optional[JWTService] = None


def get_jwt_service() -> JWTService:
    """Retorna instância singleton."""
    global _jwt_service
    if _jwt_service is None:
        _jwt_service = JWTService()
    return _jwt_service
