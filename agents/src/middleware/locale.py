"""
Middleware para detecção de locale.
"""

from typing import Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import structlog

from src.services.i18n import Locale, DEFAULT_LOCALE

logger = structlog.get_logger()


class LocaleMiddleware(BaseHTTPMiddleware):
    """
    Middleware que detecta e define o locale da requisição.
    
    Ordem de prioridade:
    1. Query parameter: ?lang=pt-BR
    2. Header: X-Locale
    3. Header: Accept-Language
    4. Default: pt-BR
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Detectar locale
        locale = self._detect_locale(request)
        
        # Armazenar no state da request
        request.state.locale = locale
        
        # Processar request
        response = await call_next(request)
        
        # Adicionar header de resposta
        response.headers["Content-Language"] = locale.value
        
        return response
    
    def _detect_locale(self, request: Request) -> Locale:
        """Detecta locale da requisição."""
        
        # 1. Query parameter
        lang = request.query_params.get("lang")
        if lang:
            locale = Locale.from_string(lang)
            if locale:
                return locale
        
        # 2. Header X-Locale (customizado)
        x_locale = request.headers.get("X-Locale")
        if x_locale:
            locale = Locale.from_string(x_locale)
            if locale:
                return locale
        
        # 3. Header Accept-Language
        accept_language = request.headers.get("Accept-Language", "")
        locale = self._parse_accept_language(accept_language)
        if locale:
            return locale
        
        # 4. Default
        return DEFAULT_LOCALE
    
    def _parse_accept_language(self, header: str) -> Optional[Locale]:
        """Parse do header Accept-Language."""
        if not header:
            return None
        
        # Formato: pt-BR,pt;q=0.9,en;q=0.8
        languages: list[tuple[str, float]] = []
        
        for part in header.split(","):
            part = part.strip()
            if ";q=" in part:
                lang, q = part.split(";q=")
                try:
                    quality = float(q)
                except ValueError:
                    quality = 0.0
            else:
                lang = part
                quality = 1.0
            
            languages.append((lang.strip(), quality))
        
        # Ordenar por qualidade
        languages.sort(key=lambda x: x[1], reverse=True)
        
        # Encontrar primeiro locale suportado
        for lang, _ in languages:
            locale = Locale.from_string(lang)
            if locale:
                return locale
        
        return None


def get_request_locale(request: Request) -> Locale:
    """Helper para obter locale da request."""
    return getattr(request.state, "locale", DEFAULT_LOCALE)
