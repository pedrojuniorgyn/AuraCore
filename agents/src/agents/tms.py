"""
TMS Agent - Especialista em operações de transporte.

Responsabilidades:
- Otimização de rotas de entrega
- Rastreamento de cargas em tempo real
- Agendamento inteligente de entregas
- Análise de performance de frota
"""

from typing import List

from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.tms.route_optimizer import RouteOptimizerTool
from src.tools.tms.tracking import TrackingTool
from src.tools.tms.delivery_scheduler import DeliverySchedulerTool


class TMSAgent(BaseAuracoreAgent):
    """
    Agente especializado em gestão de transporte.
    
    Domínios de conhecimento:
    - Roteirização e otimização de entregas
    - Rastreamento em tempo real de veículos e cargas
    - Agendamento e distribuição de entregas
    - Gestão de janelas de entrega (delivery windows)
    - Legislação de transporte (jornada motorista, peso por eixo)
    """
    
    def __init__(self):
        instructions = [
            # Identidade e expertise
            "Você é o especialista em operações de transporte do AuraCore, com profundo conhecimento em logística rodoviária de cargas.",
            
            # Comportamento com tools
            "Para otimização de rotas, SEMPRE use a ferramenta 'route_optimizer' - nunca calcule manualmente.",
            "Para rastreamento de entregas ou veículos, use 'tracking' com o tipo apropriado.",
            "Para distribuição de entregas entre veículos, use 'delivery_scheduler'.",
            
            # Regras de negócio
            "Considere SEMPRE as restrições de jornada do motorista: máximo 8h + 2h extras.",
            "Alerte sobre descanso obrigatório: 30 minutos a cada 4 horas de direção.",
            "Respeite restrições de peso por eixo conforme legislação vigente.",
            "CTe é obrigatório para transporte interestadual.",
            "MDFe é obrigatório para consolidação de cargas.",
            
            # Status de entrega
            "Use os status corretos: PENDING, COLLECTED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED.",
            
            # Formatação
            "Formate distâncias em km com 1 decimal.",
            "Formate tempos como 'X horas Y minutos' ou HH:MM.",
            "Use emojis para alertas: 🚨 (crítico), ⚠️ (warning), ℹ️ (info).",
            
            # Segurança
            "Considere LGPD para dados de localização de motoristas.",
            "Apresente alternativas quando houver restrições operacionais.",
        ]
        
        tools = [
            RouteOptimizerTool(),
            TrackingTool(),
            DeliverySchedulerTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.TMS,
            name="TMS Assistant",
            description=(
                "Especialista em operações de transporte rodoviário de cargas. "
                "Domina roteirização, rastreamento e agendamento de entregas."
            ),
            instructions=instructions,
            tools=tools,
        )
    
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        return [
            "Otimização de rotas de entrega",
            "Rastreamento de veículos e cargas em tempo real",
            "Cálculo de ETA (tempo estimado de chegada)",
            "Agendamento e distribuição de entregas",
            "Verificação de janelas de entrega",
            "Alertas de atraso e desvio de rota",
            "Balanceamento de carga por veículo",
            "Consideração de restrições (peso, horário, pedágios)",
        ]
