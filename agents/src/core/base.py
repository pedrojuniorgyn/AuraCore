"""
Classe base para todos os agentes do AuraCore.

Define interface comum e comportamentos padrão.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, List, Optional

import structlog
from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.storage.sqlite import SqliteStorage

from src.config import get_settings
from src.core.guardrails import GuardrailMiddleware
from src.core.observability import ObservabilityMiddleware

logger = structlog.get_logger()


class AgentType(str, Enum):
    """Tipos de agentes disponíveis."""
    
    FISCAL = "fiscal"
    FINANCIAL = "financial"
    TMS = "tms"
    CRM = "crm"
    FLEET = "fleet"
    ACCOUNTING = "accounting"
    STRATEGIC = "strategic"
    QA = "qa"


@dataclass
class AgentContext:
    """Contexto de execução do agente."""
    
    user_id: str
    org_id: int
    branch_id: int
    role: str
    permissions: List[str] = field(default_factory=list)
    session_id: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Converte para dicionário."""
        return {
            "user_id": self.user_id,
            "org_id": self.org_id,
            "branch_id": self.branch_id,
            "role": self.role,
            "permissions": self.permissions,
            "session_id": self.session_id,
        }


class BaseAuracoreAgent(ABC):
    """
    Classe base abstrata para agentes do AuraCore.
    
    Fornece:
    - Integração com Agno Framework
    - Memória persistente por agente
    - Guardrails de segurança
    - Observabilidade (logging, métricas)
    - Instruções base comuns
    """
    
    def __init__(
        self,
        agent_type: AgentType,
        name: str,
        description: str,
        instructions: List[str],
        tools: List[Any],
    ):
        self.agent_type = agent_type
        self.name = name
        self.description = description
        self.settings = get_settings()
        self._tools = tools
        
        # Criar agente Agno
        self.agent = self._create_agent(instructions)
        
        # Middlewares
        self.guardrails = GuardrailMiddleware()
        self.observability = ObservabilityMiddleware()
        
        logger.info(
            "Agent initialized",
            agent_type=agent_type.value,
            name=name,
            tools_count=len(tools),
        )
    
    def _create_agent(self, custom_instructions: List[str]) -> Agent:
        """Cria instância do agente Agno."""
        
        # Instruções base comuns a todos os agentes
        base_instructions = [
            "Você é um assistente especializado do AuraCore ERP para empresas de logística.",
            "Sempre seja preciso, profissional e cite fontes quando possível.",
            "Se não souber algo com certeza, admita e sugira como encontrar a informação.",
            "Use as ferramentas disponíveis ANTES de responder perguntas técnicas.",
            "Formate respostas em Markdown para melhor legibilidade.",
            "Considere sempre o contexto brasileiro (legislação, moeda BRL, fuso horário).",
            "Nunca invente dados - use sempre as ferramentas para buscar informações reais.",
        ]
        
        all_instructions = base_instructions + custom_instructions
        
        # Storage para memória persistente
        storage = None
        if self.settings.enable_memory:
            db_path = f"{self.settings.memory_db_path}/{self.agent_type.value}_memory.db"
            storage = SqliteStorage(table_name="agent_sessions", db_file=db_path)
        
        return Agent(
            name=self.name,
            model=Claude(id="claude-sonnet-4-5-20250514"),
            description=self.description,
            instructions=all_instructions,
            tools=self._tools,
            storage=storage,
            add_history_to_messages=True,
            num_history_responses=10,
            markdown=True,
            show_tool_calls=True,
        )
    
    async def chat(
        self,
        message: str,
        context: AgentContext,
        stream: bool = False,
    ) -> dict:
        """
        Processa uma mensagem do usuário.
        
        Args:
            message: Mensagem do usuário
            context: Contexto de execução (org, user, permissions)
            stream: Se deve usar streaming
            
        Returns:
            Resposta do agente com metadados
        """
        
        # Adicionar contexto à mensagem
        context_str = self._build_context_string(context)
        enriched_message = f"{message}\n\n{context_str}"
        
        # Executar com observabilidade
        async def execute():
            if stream:
                return self.agent.run(enriched_message, stream=True)
            else:
                return self.agent.run(enriched_message)
        
        # Wrapper com observabilidade
        result = await self.observability.wrap_agent_call(
            agent_name=self.name,
            user_input=message,
            user_context=context.to_dict(),
            agent_fn=execute,
        )
        
        # Extrair resposta
        response_text = ""
        tools_used = []
        
        if hasattr(result, "content"):
            response_text = result.content
        elif isinstance(result, str):
            response_text = result
        else:
            response_text = str(result)
        
        if hasattr(result, "tool_calls") and result.tool_calls:
            tools_used = [tc.name for tc in result.tool_calls]
        
        return {
            "agent": self.agent_type.value,
            "agent_name": self.name,
            "response": response_text,
            "tools_used": tools_used,
            "context": {
                "org_id": context.org_id,
                "user_id": context.user_id,
            },
        }
    
    def _build_context_string(self, context: AgentContext) -> str:
        """Constrói string de contexto para o agente."""
        return (
            f"---\n"
            f"**Contexto da Sessão:**\n"
            f"- Organização ID: {context.org_id}\n"
            f"- Filial ID: {context.branch_id}\n"
            f"- Usuário: {context.user_id}\n"
            f"- Perfil: {context.role}\n"
            f"---"
        )
    
    @property
    def tools(self) -> List[Any]:
        """Retorna lista de tools do agente."""
        return self._tools
    
    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        pass
