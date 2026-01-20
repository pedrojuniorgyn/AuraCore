# agents/tests/e2e/test_agents_api.py
"""
Testes E2E para API de Agents.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from typing import Dict, Any


class TestAgentsAPI:
    """Testes da API de Agents."""
    
    @pytest.mark.asyncio
    async def test_list_agents(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str]
    ) -> None:
        """Deve listar agents disponíveis."""
        with patch("src.middleware.auth.validate_api_key") as mock_auth:
            mock_auth.return_value = True
            
            response = await client.get(
                "/v1/agents",
                headers=api_key_header
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert len(data["agents"]) >= 8
        assert "fiscal" in data["agents"]
    
    @pytest.mark.asyncio
    async def test_chat_with_agent_success(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any,
        fiscal_agent_response: Dict[str, Any]
    ) -> None:
        """Deve processar chat com agent fiscal."""
        with patch("src.services.agents.get_agent") as mock_get:
            mock_agent = AsyncMock()
            mock_agent.run.return_value = fiscal_agent_response
            mock_get.return_value = mock_agent
            
            response = await client.post(
                "/v1/agents/chat",
                headers=api_key_header,
                json={
                    "agent": "fiscal",
                    "message": "Calcule o ICMS para SP -> RJ, valor R$ 1000"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["agent"] == "fiscal"
        assert "ICMS" in data["message"]
        assert data["tokens_input"] > 0
    
    @pytest.mark.asyncio
    async def test_chat_invalid_agent(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve retornar erro para agent inválido."""
        response = await client.post(
            "/v1/agents/chat",
            headers=api_key_header,
            json={
                "agent": "invalid_agent",
                "message": "Teste"
            }
        )
        
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_chat_without_auth(self, client: AsyncClient) -> None:
        """Deve retornar 401 sem autenticação."""
        response = await client.post(
            "/v1/agents/chat",
            json={
                "agent": "fiscal",
                "message": "Teste"
            }
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_chat_empty_message(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve validar mensagem vazia."""
        response = await client.post(
            "/v1/agents/chat",
            headers=api_key_header,
            json={
                "agent": "fiscal",
                "message": ""
            }
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_chat_with_context(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any,
        fiscal_agent_response: Dict[str, Any]
    ) -> None:
        """Deve processar chat com contexto adicional."""
        with patch("src.services.agents.get_agent") as mock_get:
            mock_agent = AsyncMock()
            mock_agent.run.return_value = fiscal_agent_response
            mock_get.return_value = mock_agent
            
            response = await client.post(
                "/v1/agents/chat",
                headers=api_key_header,
                json={
                    "agent": "fiscal",
                    "message": "Calcule o imposto",
                    "context": {
                        "valor": 1000,
                        "origem": "SP",
                        "destino": "RJ"
                    }
                }
            )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_chat_with_session(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any,
        fiscal_agent_response: Dict[str, Any]
    ) -> None:
        """Deve manter sessão entre mensagens."""
        with patch("src.services.agents.get_agent") as mock_get:
            mock_agent = AsyncMock()
            mock_agent.run.return_value = fiscal_agent_response
            mock_get.return_value = mock_agent
            
            # Primeira mensagem
            response1 = await client.post(
                "/v1/agents/chat",
                headers=api_key_header,
                json={
                    "agent": "fiscal",
                    "message": "Olá"
                }
            )
            
            session_id = response1.json().get("session_id")
            
            # Segunda mensagem com session_id
            response2 = await client.post(
                "/v1/agents/chat",
                headers=api_key_header,
                json={
                    "agent": "fiscal",
                    "message": "Continuar conversa",
                    "session_id": session_id
                }
            )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
