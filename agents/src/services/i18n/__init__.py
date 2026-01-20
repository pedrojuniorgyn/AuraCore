"""Sistema de internacionalização."""

from .translator import Translator, get_translator
from .locales import Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES
from .messages import MessageKey

__all__ = [
    "Translator",
    "get_translator",
    "Locale",
    "DEFAULT_LOCALE",
    "SUPPORTED_LOCALES",
    "MessageKey"
]
