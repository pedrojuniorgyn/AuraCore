#!/usr/bin/env python3
"""
Exemplo de integração com AuraCore API em Python.

Demonstra uso das principais funcionalidades:
- Chat com agentes
- Consulta de legislação (RAG)
- Processamento de voz
"""

import httpx
import asyncio
from typing import Optional


class AuraCoreClient:
    """Cliente Python para AuraCore API."""
    
    def __init__(
        self,
        base_url: str = "https://api.auracore.com.br",
        api_key: str = "",
        org_id: int = 1,
        branch_id: int = 1
    ):
        self.base_url = base_url
        self.api_key = api_key
        self.org_id = org_id
        self.branch_id = branch_id
    
    def _get_headers(self) -> dict:
        return {
            "X-API-Key": self.api_key,
            "X-Organization-ID": str(self.org_id),
            "X-Branch-ID": str(self.branch_id),
            "Content-Type": "application/json"
        }
    
    async def chat(self, message: str, agent_type: Optional[str] = None) -> dict:
        """
        Envia mensagem para um agente.
        
        Args:
            message: Mensagem do usuário
            agent_type: Tipo do agente (fiscal, financial, tms, etc)
        
        Returns:
            Resposta do agente
        
        Example:
            >>> response = await client.chat(
            ...     "Qual a alíquota de ICMS de SP para RJ?",
            ...     agent_type="fiscal"
            ... )
            >>> print(response['response'])
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat",
                headers=self._get_headers(),
                json={
                    "message": message,
                    "agent_type": agent_type
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def query_legislation(self, query: str, top_k: int = 5) -> dict:
        """
        Consulta legislação fiscal via RAG.
        
        Args:
            query: Pergunta sobre legislação
            top_k: Número de resultados
        
        Returns:
            Contexto e fontes
        
        Example:
            >>> result = await client.query_legislation(
            ...     "Como calcular PIS sobre frete?"
            ... )
            >>> print(result['context'])
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/knowledge/query",
                headers=self._get_headers(),
                json={
                    "query": query,
                    "top_k": top_k
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def process_voice(
        self,
        audio_base64: str,
        respond_with_audio: bool = True
    ) -> dict:
        """
        Processa áudio de voz.
        
        Args:
            audio_base64: Áudio em base64 (webm/opus)
            respond_with_audio: Se deve retornar áudio de resposta
        
        Returns:
            Transcrição, resposta do agente e áudio de resposta
        
        Example:
            >>> with open('audio.webm', 'rb') as f:
            ...     audio_b64 = base64.b64encode(f.read()).decode()
            >>> result = await client.process_voice(audio_b64)
            >>> print(result['transcription'])
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/voice/process",
                headers=self._get_headers(),
                json={
                    "audio_base64": audio_base64,
                    "encoding": "WEBM_OPUS",
                    "respond_with_audio": respond_with_audio
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def list_agents(self) -> dict:
        """
        Lista agentes disponíveis.
        
        Returns:
            Lista de agentes com suas capacidades
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/agents",
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
    
    async def health_check(self) -> dict:
        """
        Verifica saúde do serviço.
        
        Returns:
            Status de saúde
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/health",
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()


# ===== EXEMPLO DE USO =====

async def main():
    """Exemplo de uso do cliente."""
    
    # Configurar cliente
    client = AuraCoreClient(
        base_url="http://localhost:8000",  # ou https://api.auracore.com.br
        api_key="sua-api-key",
        org_id=1,
        branch_id=1
    )
    
    # 1. Verificar saúde
    print("=== Health Check ===")
    try:
        health = await client.health_check()
        print(f"Status: {health.get('status', 'unknown')}")
    except Exception as e:
        print(f"Erro: {e}")
    
    # 2. Listar agentes
    print("\n=== Agentes Disponíveis ===")
    try:
        agents = await client.list_agents()
        for agent in agents.get('agents', []):
            print(f"- {agent['name']}: {agent.get('description', 'N/A')}")
    except Exception as e:
        print(f"Erro: {e}")
    
    # 3. Chat com agente fiscal
    print("\n=== Chat com Agente Fiscal ===")
    try:
        response = await client.chat(
            "Qual a alíquota de ICMS interestadual de SP para RJ?",
            agent_type="fiscal"
        )
        print(f"Resposta: {response.get('response', 'N/A')[:200]}...")
    except Exception as e:
        print(f"Erro: {e}")
    
    # 4. Consultar legislação
    print("\n=== Consulta de Legislação ===")
    try:
        legislation = await client.query_legislation(
            "Como calcular PIS sobre frete?"
        )
        context = legislation.get('context', '')
        sources = legislation.get('sources', [])
        print(f"Contexto: {context[:200]}...")
        print(f"Fontes: {sources}")
    except Exception as e:
        print(f"Erro: {e}")


if __name__ == "__main__":
    asyncio.run(main())
