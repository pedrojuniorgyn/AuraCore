# agents/sdk/python/auracore/config.py
"""
Configuração do SDK.
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Config:
    """Configuração do cliente."""
    api_key: Optional[str] = None
    base_url: str = "https://api.auracore.com.br"
    timeout: int = 60
    max_retries: int = 3
    
    def __post_init__(self) -> None:
        # Tentar obter API key do ambiente
        if not self.api_key:
            self.api_key = os.getenv("AURACORE_API_KEY")
        
        # Validar API key format
        if self.api_key and not self.api_key.startswith("ac_"):
            raise ValueError("Invalid API key format. Expected: ac_live_xxx or ac_test_xxx")
