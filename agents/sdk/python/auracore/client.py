# agents/sdk/python/auracore/client.py
"""
Cliente principal do SDK.
"""

from typing import Optional, Any
import httpx
from .config import Config
from .resources.agents import AgentsResource
from .resources.voice import VoiceResource
from .resources.rag import RAGResource
from .resources.documents import DocumentsResource
from .resources.analytics import AnalyticsResource
from .exceptions import AuthenticationError

__version__ = "1.0.0"


class AuraCore:
    """
    Cliente AuraCore.
    
    Args:
        api_key: API Key (ac_live_xxx ou ac_test_xxx)
        base_url: URL base da API (default: https://api.auracore.com.br)
        timeout: Timeout em segundos (default: 60)
        max_retries: Máximo de retries (default: 3)
    
    Exemplo:
        client = AuraCore(api_key="ac_live_xxx")
        
        # Sync
        response = client.agents.chat_sync("fiscal", "Qual o ICMS de SP?")
        
        # Async
        async with AuraCore(api_key="ac_live_xxx") as client:
            response = await client.agents.chat("fiscal", "Qual o ICMS de SP?")
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.auracore.com.br",
        timeout: int = 60,
        max_retries: int = 3
    ):
        self.config = Config(
            api_key=api_key,
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            max_retries=max_retries
        )
        
        if not self.config.api_key:
            raise AuthenticationError("API key is required")
        
        # HTTP clients
        self._sync_client: Optional[httpx.Client] = None
        self._async_client: Optional[httpx.AsyncClient] = None
        
        # Resources
        self.agents = AgentsResource(self)
        self.voice = VoiceResource(self)
        self.rag = RAGResource(self)
        self.documents = DocumentsResource(self)
        self.analytics = AnalyticsResource(self)
    
    @property
    def sync_client(self) -> httpx.Client:
        """Cliente HTTP síncrono."""
        if self._sync_client is None:
            self._sync_client = httpx.Client(
                base_url=self.config.base_url,
                headers=self._headers,
                timeout=self.config.timeout
            )
        return self._sync_client
    
    @property
    def async_client(self) -> httpx.AsyncClient:
        """Cliente HTTP assíncrono."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self.config.base_url,
                headers=self._headers,
                timeout=self.config.timeout
            )
        return self._async_client
    
    @property
    def _headers(self) -> dict:
        """Headers padrão."""
        return {
            "X-API-Key": self.config.api_key or "",
            "Content-Type": "application/json",
            "User-Agent": f"auracore-python/{__version__}"
        }
    
    async def __aenter__(self) -> "AuraCore":
        """Async context manager."""
        return self
    
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Fecha cliente async."""
        await self.close_async()
    
    def __enter__(self) -> "AuraCore":
        """Sync context manager."""
        return self
    
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Fecha cliente sync."""
        self.close()
    
    def close(self) -> None:
        """Fecha cliente síncrono."""
        if self._sync_client:
            self._sync_client.close()
            self._sync_client = None
    
    async def close_async(self) -> None:
        """Fecha cliente assíncrono."""
        if self._async_client:
            await self._async_client.aclose()
            self._async_client = None
