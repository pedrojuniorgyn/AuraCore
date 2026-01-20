# agents/sdk/python/auracore/resources/agents.py
"""
Resource de Agents.
"""

from typing import Optional, List, TYPE_CHECKING
from ..types import AgentResponse
from ..exceptions import raise_for_status

if TYPE_CHECKING:
    from ..client import AuraCore


class AgentsResource:
    """
    Resource para interação com agents.
    
    Uso:
        # Async
        response = await client.agents.chat("fiscal", "Calcule o ICMS")
        
        # Sync
        response = client.agents.chat_sync("fiscal", "Calcule o ICMS")
        
        # Com contexto
        response = await client.agents.chat(
            agent="fiscal",
            message="Calcule o ICMS para SP -> RJ",
            context={"valor": 1000, "ncm": "8471.30.19"}
        )
    """
    
    AGENTS = [
        "fiscal",
        "financial",
        "accounting",
        "tms",
        "wms",
        "crm",
        "fleet",
        "strategic"
    ]
    
    def __init__(self, client: "AuraCore"):
        self._client = client
    
    async def chat(
        self,
        agent: str,
        message: str,
        context: Optional[dict] = None,
        session_id: Optional[str] = None,
        stream: bool = False
    ) -> AgentResponse:
        """
        Envia mensagem para um agent.
        
        Args:
            agent: Nome do agent (fiscal, financial, etc)
            message: Mensagem do usuário
            context: Contexto adicional
            session_id: ID de sessão para manter histórico
            stream: Se True, retorna streaming (não implementado)
        
        Returns:
            AgentResponse com a resposta do agent
        """
        payload = {
            "agent": agent,
            "message": message,
            "context": context or {},
            "session_id": session_id
        }
        
        response = await self._client.async_client.post(
            "/v1/agents/chat",
            json=payload
        )
        
        raise_for_status(response)
        data = response.json()
        
        return AgentResponse(
            message=data["message"],
            agent=data["agent"],
            tool_calls=data.get("tool_calls", []),
            tokens_input=data.get("tokens_input", 0),
            tokens_output=data.get("tokens_output", 0),
            duration_ms=data.get("duration_ms", 0),
            session_id=data.get("session_id"),
            metadata=data.get("metadata", {})
        )
    
    def chat_sync(
        self,
        agent: str,
        message: str,
        context: Optional[dict] = None,
        session_id: Optional[str] = None
    ) -> AgentResponse:
        """Versão síncrona de chat()."""
        payload = {
            "agent": agent,
            "message": message,
            "context": context or {},
            "session_id": session_id
        }
        
        response = self._client.sync_client.post(
            "/v1/agents/chat",
            json=payload
        )
        
        raise_for_status(response)
        data = response.json()
        
        return AgentResponse(
            message=data["message"],
            agent=data["agent"],
            tool_calls=data.get("tool_calls", []),
            tokens_input=data.get("tokens_input", 0),
            tokens_output=data.get("tokens_output", 0),
            duration_ms=data.get("duration_ms", 0),
            session_id=data.get("session_id"),
            metadata=data.get("metadata", {})
        )
    
    async def list_agents(self) -> List[str]:
        """Lista agents disponíveis."""
        response = await self._client.async_client.get("/v1/agents")
        raise_for_status(response)
        return response.json().get("agents", self.AGENTS)
    
    def list_agents_sync(self) -> List[str]:
        """Versão síncrona de list_agents()."""
        response = self._client.sync_client.get("/v1/agents")
        raise_for_status(response)
        return response.json().get("agents", self.AGENTS)
