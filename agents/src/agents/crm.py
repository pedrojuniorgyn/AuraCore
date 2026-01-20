"""
CRM Agent - Especialista em gestão comercial e relacionamento com clientes.

Responsabilidades:
- Qualificação e scoring de leads
- Geração de propostas comerciais
- Análise de saúde de clientes (churn risk)
- Recomendações de upsell/cross-sell
"""

from typing import List

from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.crm.lead_scorer import LeadScorerTool
from src.tools.crm.proposal_generator import ProposalGeneratorTool
from src.tools.crm.customer_health import CustomerHealthTool


class CRMAgent(BaseAuracoreAgent):
    """
    Agente especializado em gestão comercial.
    
    Domínios de conhecimento:
    - Qualificação e scoring de leads
    - Geração de propostas comerciais
    - Análise de saúde de clientes
    - Ciclo de vendas no setor de transporte
    - Precificação de frete
    """
    
    def __init__(self):
        instructions = [
            # Identidade e expertise
            "Você é o especialista comercial do AuraCore, com profundo conhecimento em vendas B2B no setor de transporte e logística.",
            
            # Comportamento com tools
            "Para qualificar leads, SEMPRE use a ferramenta 'lead_scorer' - nunca pontue manualmente.",
            "Para gerar propostas comerciais, use 'proposal_generator' com as rotas e volumes desejados.",
            "Para analisar saúde de clientes ou risco de churn, use 'customer_health'.",
            
            # Ciclo de vendas
            "Use os estágios corretos do funil: LEAD, PROSPECT, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST.",
            
            # Segmentos
            "Classifique clientes: Enterprise (> R$ 500k/mês), Mid-Market (R$ 50k-500k), SMB (< R$ 50k), Spot (avulso).",
            
            # Precificação
            "Considere os componentes de frete: peso (R$/kg), ad valorem (%), GRIS, pedágio, TDE/TRT.",
            
            # Formatação
            "Formate valores monetários como R$ 1.234,56.",
            "Use emojis de temperatura: 🔥 (hot), 🌡️ (warm), ❄️ (cold).",
            "Use emojis de status: 💚 (saudável), 🟡 (risco), 🔴 (crítico).",
            
            # Segurança
            "Respeite LGPD para dados de contato.",
            "Não exponha informações de concorrência.",
            "Sempre sugira próximos passos acionáveis.",
        ]
        
        tools = [
            LeadScorerTool(),
            ProposalGeneratorTool(),
            CustomerHealthTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.CRM,
            name="CRM Assistant",
            description=(
                "Especialista em gestão comercial e relacionamento com clientes. "
                "Domina qualificação de leads, propostas comerciais e análise de churn."
            ),
            instructions=instructions,
            tools=tools,
        )
    
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        return [
            "Scoring e qualificação de leads",
            "Geração de propostas comerciais personalizadas",
            "Análise de saúde de clientes",
            "Identificação de risco de churn",
            "Recomendações de upsell/cross-sell",
            "Precificação de frete por rota",
            "Comparativo de preços de mercado",
            "Priorização de pipeline comercial",
        ]
