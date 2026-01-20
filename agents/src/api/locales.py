"""
API endpoints para internacionalização.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel

from src.services.i18n import get_translator, Locale, DEFAULT_LOCALE
from src.middleware.locale import get_request_locale

router = APIRouter(prefix="/locales", tags=["locales"])


class LocaleInfo(BaseModel):
    """Informações de um locale."""
    code: str
    name: str
    is_default: bool


class LocalesResponse(BaseModel):
    """Lista de locales."""
    locales: list[LocaleInfo]
    current: str


class TranslationRequest(BaseModel):
    """Request de tradução."""
    key: str
    params: dict[str, str] = {}


class TranslationResponse(BaseModel):
    """Response de tradução."""
    key: str
    locale: str
    translation: str


@router.get("/", response_model=LocalesResponse)
async def list_locales(request: Request) -> LocalesResponse:
    """
    Lista locales suportados.
    
    Returns:
        Lista de locales disponíveis e o locale atual da requisição
    """
    translator = get_translator()
    current = get_request_locale(request)
    
    return LocalesResponse(
        locales=[
            LocaleInfo(
                code=locale.value,
                name=locale.display_name,
                is_default=locale == DEFAULT_LOCALE
            )
            for locale in translator.get_available_locales()
        ],
        current=current.value
    )


@router.post("/translate", response_model=TranslationResponse)
async def translate(
    data: TranslationRequest,
    request: Request
) -> TranslationResponse:
    """
    Traduz uma chave para o locale atual.
    
    Args:
        data: Chave e parâmetros de interpolação
        request: Request com locale detectado
    
    Returns:
        Tradução no locale da requisição
    """
    translator = get_translator()
    locale = get_request_locale(request)
    
    translation = translator.t(data.key, locale=locale, **data.params)
    
    return TranslationResponse(
        key=data.key,
        locale=locale.value,
        translation=translation
    )


@router.get("/translate/{key:path}", response_model=TranslationResponse)
async def get_translation(
    key: str,
    request: Request
) -> TranslationResponse:
    """
    Obtém tradução de uma chave via GET.
    
    Args:
        key: Chave de tradução (ex: general.welcome)
        request: Request com locale detectado
    
    Returns:
        Tradução no locale da requisição
    """
    translator = get_translator()
    locale = get_request_locale(request)
    
    translation = translator.t(key, locale=locale)
    
    return TranslationResponse(
        key=key,
        locale=locale.value,
        translation=translation
    )
