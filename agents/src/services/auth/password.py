# agents/src/services/auth/password.py
"""
Hash de senhas com bcrypt.
"""

from typing import Optional
import structlog

try:
    from passlib.context import CryptContext
    PASSLIB_AVAILABLE = True
except ImportError:
    PASSLIB_AVAILABLE = False

logger = structlog.get_logger()


class PasswordHasher:
    """
    Hasher de senhas com bcrypt.
    
    Uso:
        hasher = get_password_hasher()
        
        # Hash senha
        hashed = hasher.hash("minha-senha")
        
        # Verificar
        if hasher.verify("minha-senha", hashed):
            print("Senha correta!")
    """
    
    def __init__(self):
        if not PASSLIB_AVAILABLE:
            raise RuntimeError("passlib não instalado")
        
        self._context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto"
        )
        
        logger.info("password_hasher_initialized")
    
    def hash(self, password: str) -> str:
        """Gera hash da senha."""
        return self._context.hash(password)
    
    def verify(self, password: str, hashed: str) -> bool:
        """Verifica se senha corresponde ao hash."""
        try:
            return self._context.verify(password, hashed)
        except Exception as e:
            logger.error("password_verify_error", error=str(e))
            return False
    
    def needs_rehash(self, hashed: str) -> bool:
        """Verifica se hash precisa ser atualizado."""
        return self._context.needs_update(hashed)


# Singleton
_password_hasher: Optional[PasswordHasher] = None


def get_password_hasher() -> PasswordHasher:
    """Retorna instância singleton."""
    global _password_hasher
    if _password_hasher is None:
        _password_hasher = PasswordHasher()
    return _password_hasher
