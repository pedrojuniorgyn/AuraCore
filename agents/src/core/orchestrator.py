"""
Orquestrador de agentes.

Responsável por:
- Inicializar todos os agentes
- Rotear mensagens para o agente correto
- Classificar intents
- Gerenciar handoffs entre agentes
"""

from typing import Dict, Optional

import structlog

from src.core.base import BaseAuracoreAgent, AgentType, AgentContext

logger = structlog.get_logger()

# Import dos agentes
from src.agents.fiscal import FiscalAgent
from src.agents.financial import FinancialAgent
from src.agents.tms import TMSAgent
from src.agents.crm import CRMAgent
from src.agents.accounting import AccountingAgent
from src.agents.fleet import FleetAgent
from src.agents.strategic import StrategicAgent
from src.agents.qa import QAAgent


class AgentOrchestrator:
    """
    Orquestra múltiplos agentes especializados.
    
    Responsabilidades:
    - Inicializar agentes disponíveis
    - Classificar intent da mensagem
    - Rotear para o agente correto
    - Gerenciar handoffs entre agentes
    """
    
    def __init__(self):
        self.agents: Dict[AgentType, BaseAuracoreAgent] = {}
        self._initialize_agents()
    
    def _initialize_agents(self) -> None:
        """Inicializa todos os agentes disponíveis."""
        
        # FASE 1: Fiscal Agent
        try:
            self.agents[AgentType.FISCAL] = FiscalAgent()
            logger.info("Fiscal Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize Fiscal Agent", error=str(e))
        
        # FASE 2: Financial Agent
        try:
            self.agents[AgentType.FINANCIAL] = FinancialAgent()
            logger.info("Financial Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize Financial Agent", error=str(e))
        
        # FASE 3: TMS Agent
        try:
            self.agents[AgentType.TMS] = TMSAgent()
            logger.info("TMS Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize TMS Agent", error=str(e))
        
        # FASE 4: CRM Agent
        try:
            self.agents[AgentType.CRM] = CRMAgent()
            logger.info("CRM Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize CRM Agent", error=str(e))
        
        # FASE 5: Accounting Agent
        try:
            self.agents[AgentType.ACCOUNTING] = AccountingAgent()
            logger.info("Accounting Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize Accounting Agent", error=str(e))
        
        # FASE 6: Fleet Agent
        try:
            self.agents[AgentType.FLEET] = FleetAgent()
            logger.info("Fleet Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize Fleet Agent", error=str(e))
        
        # FASE 7: Strategic Agent
        try:
            self.agents[AgentType.STRATEGIC] = StrategicAgent()
            logger.info("Strategic Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize Strategic Agent", error=str(e))
        
        # FASE 8: QA Agent
        try:
            self.agents[AgentType.QA] = QAAgent()
            logger.info("QA Agent initialized")
        except Exception as e:
            logger.error("Failed to initialize QA Agent", error=str(e))
        
        logger.info(
            "Agents initialization complete",
            total_agents=len(self.agents),
            available_agents=[a.value for a in self.agents.keys()],
        )
    
    def get_agent(self, agent_type: AgentType) -> Optional[BaseAuracoreAgent]:
        """Retorna um agente específico."""
        return self.agents.get(agent_type)
    
    def list_agents(self) -> list:
        """Lista todos os agentes disponíveis."""
        return [
            {
                "type": agent_type.value,
                "name": agent.name,
                "description": agent.description,
                "capabilities": agent.get_capabilities(),
                "tools": [t.name for t in agent.tools] if hasattr(agent, 'tools') else [],
            }
            for agent_type, agent in self.agents.items()
        ]
    
    async def route_message(
        self,
        message: str,
        context: AgentContext,
        agent_type: Optional[AgentType] = None,
    ) -> dict:
        """
        Roteia mensagem para o agente apropriado.
        
        Args:
            message: Mensagem do usuário
            context: Contexto de execução
            agent_type: Tipo do agente (opcional, será classificado se não informado)
            
        Returns:
            Resposta do agente
        """
        
        # Se tipo especificado, usar diretamente
        if agent_type:
            agent = self.get_agent(agent_type)
            if not agent:
                return {
                    "error": f"Agent '{agent_type.value}' not available",
                    "available_agents": [a.value for a in self.agents.keys()],
                }
            
            logger.info(
                "Routing to specified agent",
                agent=agent_type.value,
                user=context.user_id,
            )
            return await agent.chat(message, context)
        
        # Classificar intent para escolher agente
        classified_type = await self._classify_intent(message)
        agent = self.get_agent(classified_type)
        
        if not agent:
            # Fallback para fiscal (mais genérico)
            agent = self.agents.get(AgentType.FISCAL)
            if not agent:
                return {
                    "error": "No agents available",
                    "message": "Sistema de agentes não inicializado corretamente",
                }
        
        logger.info(
            "Routing to classified agent",
            classified_agent=classified_type.value,
            user=context.user_id,
        )
        return await agent.chat(message, context)
    
    async def _classify_intent(self, message: str) -> AgentType:
        """
        Classifica a intenção da mensagem para escolher o agente.
        
        Usa keywords para classificação rápida.
        Em versões futuras, pode usar um modelo de classificação.
        """
        
        message_lower = message.lower()
        
        # Keywords por agente (ordenadas por especificidade)
        keywords_map = {
            AgentType.FISCAL: [
                "icms", "imposto", "tributo", "cte", "nfe", "nf-e", "ct-e",
                "sped", "fiscal", "alíquota", "cfop", "cst", "reforma tributária",
                "ibs", "cbs", "difal", "lei kandir", "legislação", "multa fiscal",
            ],
            AgentType.FINANCIAL: [
                "fluxo de caixa", "cash flow", "pagamento", "recebimento",
                "cobrança", "financeiro", "conciliação", "dda", "boleto",
                "inadimplência", "provisão", "pdd",
            ],
            AgentType.TMS: [
                "viagem", "carga", "entrega", "motorista", "rota", "coleta",
                "rastreamento", "tracking", "operação", "frete", "romaneio",
            ],
            AgentType.CRM: [
                "cliente", "proposta", "lead", "venda", "comercial",
                "cotação", "prospect", "funil", "pipeline", "churn",
            ],
            AgentType.FLEET: [
                "veículo", "manutenção", "pneu", "combustível", "diesel",
                "frota", "documento", "licenciamento", "multa",
            ],
            AgentType.ACCOUNTING: [
                "contábil", "lançamento", "balanço", "dre", "razão",
                "plano de contas", "fechamento", "balancete", "nbc",
            ],
            AgentType.STRATEGIC: [
                "bsc", "pdca", "meta", "kpi", "estratégia", "indicador",
                "war room", "5w2h", "follow-up", "objetivo", "swot",
            ],
            AgentType.QA: [
                "qa", "qualidade", "teste", "bug", "frontend", "análise",
                "auditoria", "botão", "handler", "onclick", "componente",
                "relatório", "issue", "verificar", "scanner",
            ],
        }
        
        # Contar matches por agente
        scores: Dict[AgentType, int] = {}
        for agent_type, keywords in keywords_map.items():
            score = sum(1 for kw in keywords if kw in message_lower)
            if score > 0:
                scores[agent_type] = score
        
        # Retornar agente com maior score
        if scores:
            best_match = max(scores, key=scores.get)
            logger.debug(
                "Intent classified",
                best_match=best_match.value,
                scores=scores,
            )
            return best_match
        
        # Default: fiscal (mais genérico para ERP)
        return AgentType.FISCAL


# Singleton do orquestrador
_orchestrator: Optional[AgentOrchestrator] = None


def get_orchestrator() -> AgentOrchestrator:
    """Retorna instância singleton do orquestrador."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator()
    return _orchestrator
