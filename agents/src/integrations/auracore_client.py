"""
Cliente HTTP para APIs do AuraCore.

Centraliza chamadas HTTP para o backend Next.js com:
- Retry automático
- Timeout configurável
- Headers de autenticação
- Logging de requests
"""

from typing import Any, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import get_settings
from src.core.observability import get_logger

logger = get_logger(__name__)


class AuracoreClient:
    """Cliente HTTP para APIs do AuraCore."""
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.auracore_api_url
        self.timeout = self.settings.auracore_api_timeout
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    async def get(
        self,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None
    ) -> dict[str, Any]:
        """
        GET request para API do AuraCore.
        
        Args:
            endpoint: Endpoint da API (ex: '/api/financial/payables')
            params: Query parameters
            headers: Headers adicionais
            
        Returns:
            Response JSON
        """
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            logger.debug(f"GET {url}", extra={"params": params})
            
            response = await client.get(
                url,
                params=params,
                headers=headers or {}
            )
            
            response.raise_for_status()
            return response.json()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    async def post(
        self,
        endpoint: str,
        data: dict[str, Any],
        headers: Optional[dict[str, str]] = None
    ) -> dict[str, Any]:
        """
        POST request para API do AuraCore.
        
        Args:
            endpoint: Endpoint da API
            data: Body JSON
            headers: Headers adicionais
            
        Returns:
            Response JSON
        """
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            logger.debug(f"POST {url}", extra={"data_keys": list(data.keys())})
            
            response = await client.post(
                url,
                json=data,
                headers={"Content-Type": "application/json", **(headers or {})}
            )
            
            response.raise_for_status()
            return response.json()
    
    # Métodos específicos para módulos
    
    async def get_payables(
        self,
        org_id: int,
        branch_id: int,
        **filters
    ) -> list[dict[str, Any]]:
        """Busca contas a pagar."""
        params = {
            "organizationId": org_id,
            "branchId": branch_id,
            **filters
        }
        result = await self.get("/api/financial/payables", params=params)
        return result.get("items", [])
    
    async def get_receivables(
        self,
        org_id: int,
        branch_id: int,
        **filters
    ) -> list[dict[str, Any]]:
        """Busca contas a receber."""
        params = {
            "organizationId": org_id,
            "branchId": branch_id,
            **filters
        }
        result = await self.get("/api/financial/receivables", params=params)
        return result.get("items", [])
    
    async def get_bank_balance(
        self,
        org_id: int,
        branch_id: int
    ) -> float:
        """Busca saldo bancário total."""
        params = {
            "organizationId": org_id,
            "branchId": branch_id
        }
        try:
            result = await self.get("/api/financial/bank-accounts/balance", params=params)
            return result.get("totalBalance", 0.0)
        except httpx.HTTPError:
            logger.warning("Falha ao buscar saldo bancário")
            return 0.0
    
    async def search_knowledge(
        self,
        query: str,
        collection: str = "auracore_knowledge",
        top_k: int = 5
    ) -> list[dict[str, Any]]:
        """Busca na knowledge base (ChromaDB)."""
        result = await self.post(
            "/api/knowledge/search",
            data={
                "query": query,
                "collection": collection,
                "topK": top_k
            }
        )
        return result.get("results", [])
