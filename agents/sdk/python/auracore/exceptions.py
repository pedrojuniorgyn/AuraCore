# agents/sdk/python/auracore/exceptions.py
"""
Exceções do SDK.
"""

from typing import Optional, Any


class AuraCoreError(Exception):
    """Exceção base do SDK."""
    
    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        error_code: Optional[str] = None,
        details: Optional[dict] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
    
    def __str__(self) -> str:
        parts = [self.message]
        if self.status_code:
            parts.append(f"(HTTP {self.status_code})")
        if self.error_code:
            parts.append(f"[{self.error_code}]")
        return " ".join(parts)


class AuthenticationError(AuraCoreError):
    """Erro de autenticação (401)."""
    pass


class AuthorizationError(AuraCoreError):
    """Erro de autorização (403)."""
    pass


class NotFoundError(AuraCoreError):
    """Recurso não encontrado (404)."""
    pass


class ValidationError(AuraCoreError):
    """Erro de validação (400, 422)."""
    pass


class RateLimitError(AuraCoreError):
    """Rate limit excedido (429)."""
    
    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        **kwargs: Any
    ):
        super().__init__(message, **kwargs)
        self.retry_after = retry_after


class ServerError(AuraCoreError):
    """Erro do servidor (5xx)."""
    pass


def raise_for_status(response: Any) -> None:
    """Levanta exceção apropriada para status de erro."""
    if response.status_code < 400:
        return
    
    try:
        data = response.json()
        message = data.get("detail", data.get("message", response.text))
        error_code = data.get("error_code")
        details = data.get("details", {})
    except Exception:
        message = response.text
        error_code = None
        details = {}
    
    kwargs = {
        "message": message,
        "status_code": response.status_code,
        "error_code": error_code,
        "details": details
    }
    
    if response.status_code == 401:
        raise AuthenticationError(**kwargs)
    elif response.status_code == 403:
        raise AuthorizationError(**kwargs)
    elif response.status_code == 404:
        raise NotFoundError(**kwargs)
    elif response.status_code in [400, 422]:
        raise ValidationError(**kwargs)
    elif response.status_code == 429:
        retry_after = response.headers.get("Retry-After")
        raise RateLimitError(
            retry_after=int(retry_after) if retry_after else None,
            **kwargs
        )
    elif response.status_code >= 500:
        raise ServerError(**kwargs)
    else:
        raise AuraCoreError(**kwargs)
