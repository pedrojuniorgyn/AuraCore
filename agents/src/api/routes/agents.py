"""Endpoints para listagem de agentes."""

from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from src.core.orchestrator import get_orchestrator

router = APIRouter()


class AgentInfo(BaseModel):
    """Informações de um agente."""
    
    type: str
    name: str
    description: str
    capabilities: List[str]
    tools: List[str]


@router.get("", response_model=List[AgentInfo])
async def list_agents():
    """
    Lista todos os agentes disponíveis.
    
    Retorna informações sobre cada agente:
    - type: Tipo do agente (fiscal, financial, etc.)
    - name: Nome amigável
    - description: Descrição das capacidades
    - capabilities: Lista de capacidades
    - tools: Lista de ferramentas disponíveis
    """
    
    orchestrator = get_orchestrator()
    return orchestrator.list_agents()


@router.get("/{agent_type}")
async def get_agent_details(agent_type: str):
    """
    Retorna detalhes de um agente específico.
    
    Args:
        agent_type: Tipo do agente (fiscal, financial, etc.)
    """
    
    orchestrator = get_orchestrator()
    agents = orchestrator.list_agents()
    
    for agent in agents:
        if agent["type"] == agent_type:
            return agent
    
    return {"error": f"Agent '{agent_type}' not found"}
