"""
Definição de locales suportados.
"""

from enum import Enum
from typing import Optional


class Locale(str, Enum):
    """Locales suportados."""
    PT_BR = "pt-BR"
    EN = "en"
    ES = "es"
    
    @classmethod
    def from_string(cls, value: str) -> Optional["Locale"]:
        """Converte string para Locale."""
        if not value:
            return None
            
        # Normalizar
        value = value.replace("_", "-")
        
        # Mapeamentos comuns
        mappings = {
            "pt": cls.PT_BR,
            "pt-br": cls.PT_BR,
            "portuguese": cls.PT_BR,
            "en": cls.EN,
            "en-us": cls.EN,
            "en-gb": cls.EN,
            "english": cls.EN,
            "es": cls.ES,
            "es-es": cls.ES,
            "es-mx": cls.ES,
            "spanish": cls.ES,
        }
        
        return mappings.get(value.lower())
    
    @property
    def display_name(self) -> str:
        """Nome de exibição do locale."""
        names = {
            Locale.PT_BR: "Português (Brasil)",
            Locale.EN: "English",
            Locale.ES: "Español"
        }
        return names.get(self, self.value)
    
    @property
    def language_code(self) -> str:
        """Código de idioma ISO 639-1."""
        codes = {
            Locale.PT_BR: "pt",
            Locale.EN: "en",
            Locale.ES: "es"
        }
        return codes.get(self, "en")


DEFAULT_LOCALE = Locale.PT_BR
SUPPORTED_LOCALES = [Locale.PT_BR, Locale.EN, Locale.ES]
