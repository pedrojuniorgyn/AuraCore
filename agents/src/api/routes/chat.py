"""Chat endpoint para interação com agentes."""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.core.base import AgentContext, AgentType
from src.core.orchestrator import get_orchestrator

router = APIRouter()


class ChatRequest(BaseModel):
    """Request para chat com agente."""
    
    message: str = Field(
        description="Mensagem do usuário",
        min_length=1,
        max_length=10000,
    )
    agent_type: Optional[str] = Field(
        default=None,
        description="Tipo do agente (fiscal, financial, tms, etc.). Se não informado, será classificado automaticamente.",
    )
    user_id: str = Field(
        description="ID do usuário",
    )
    org_id: int = Field(
        description="ID da organização",
    )
    branch_id: int = Field(
        description="ID da filial",
    )
    role: str = Field(
        default="user",
        description="Role do usuário no sistema",
    )
    stream: bool = Field(
        default=False,
        description="Se deve usar streaming na resposta",
    )


class ChatResponse(BaseModel):
    """Response do chat."""
    
    agent: str
    agent_name: str
    response: str
    tools_used: list
    context: dict


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Envia mensagem para um agente.
    
    O agente será selecionado automaticamente com base no conteúdo
    da mensagem, ou pode ser especificado via agent_type.
    
    Args:
        request: Dados da requisição (mensagem, contexto, etc.)
        
    Returns:
        Resposta do agente com metadados
    """
    
    # Criar contexto
    context = AgentContext(
        user_id=request.user_id,
        org_id=request.org_id,
        branch_id=request.branch_id,
        role=request.role,
        permissions=[],
    )
    
    # Determinar tipo do agente
    agent_type = None
    if request.agent_type:
        try:
            agent_type = AgentType(request.agent_type)
        except ValueError:
            available = [a.value for a in AgentType]
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de agente inválido: '{request.agent_type}'. Disponíveis: {available}",
            )
    
    # Obter orquestrador e rotear mensagem
    orchestrator = get_orchestrator()
    
    if request.stream:
        # Streaming response (SSE)
        async def generate():
            result = await orchestrator.route_message(
                message=request.message,
                context=context,
                agent_type=agent_type,
            )
            yield f"data: {json.dumps(result)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
        )
    
    # Response normal
    result = await orchestrator.route_message(
        message=request.message,
        context=context,
        agent_type=agent_type,
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result)
    
    return ChatResponse(**result)
