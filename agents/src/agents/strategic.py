"""
Strategic Agent - Especialista em gestão estratégica empresarial.

Responsabilidades:
- Balanced Scorecard (BSC) - 4 perspectivas
- Ciclos PDCA (Plan-Do-Check-Act)
- Análise de KPIs e métricas
- War Room para gestão de crises

Referências:
- Kaplan & Norton (Balanced Scorecard)
- Deming (PDCA Cycle)
- Metodologias ágeis de gestão
"""

from typing import List

from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.strategic.bsc_dashboard import BSCDashboardTool
from src.tools.strategic.pdca_tracker import PDCATrackerTool
from src.tools.strategic.kpi_analyzer import KPIAnalyzerTool
from src.tools.strategic.war_room import WarRoomTool


class StrategicAgent(BaseAuracoreAgent):
    """
    Agente especializado em gestão estratégica empresarial.
    
    Domínios de conhecimento:
    - Balanced Scorecard (BSC)
    - Ciclos PDCA
    - KPIs e métricas de negócio
    - Gestão de crises (War Room)
    """
    
    def __init__(self):
        instructions = [
            # Identidade e expertise
            "Você é o estrategista do AuraCore, especialista em gestão estratégica e tomada de decisão.",
            
            # Comportamento com tools
            "Para consultar ou atualizar o Balanced Scorecard, use 'bsc_dashboard'.",
            "Para gerenciar ciclos PDCA, use 'pdca_tracker'.",
            "Para analisar KPIs e métricas, use 'kpi_analyzer'.",
            "Para gestão de crises e situações urgentes, use 'war_room'.",
            
            # BSC - 4 Perspectivas
            "O BSC tem 4 perspectivas: Financeira, Clientes, Processos Internos, Aprendizado e Crescimento.",
            "Cada perspectiva tem objetivos, indicadores, metas e iniciativas.",
            
            # PDCA
            "PDCA: Plan (planejar), Do (executar), Check (verificar), Act (agir/corrigir).",
            "Cada ciclo deve ter prazos, responsáveis e métricas de acompanhamento.",
            
            # KPIs
            "Analise tendências, compare com metas e identifique desvios significativos.",
            "Sugira ações corretivas quando KPIs estiverem abaixo da meta.",
            
            # War Room
            "War Room é para situações críticas que requerem atenção imediata.",
            "Priorize comunicação clara, ações rápidas e acompanhamento rigoroso.",
            
            # Formatação
            "Use tabelas para comparações e rankings.",
            "Destaque indicadores críticos com cores: 🟢 (bom), 🟡 (atenção), 🔴 (crítico).",
            "Formate valores percentuais com 1 casa decimal (ex: 85.5%).",
        ]
        
        tools = [
            BSCDashboardTool(),
            PDCATrackerTool(),
            KPIAnalyzerTool(),
            WarRoomTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.STRATEGIC,
            name="Strategic Assistant",
            description=(
                "Especialista em gestão estratégica empresarial. "
                "Domina BSC, PDCA, KPIs e gestão de crises."
            ),
            instructions=instructions,
            tools=tools,
        )
    
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        return [
            "Balanced Scorecard - 4 perspectivas estratégicas",
            "Ciclos PDCA - gestão de melhorias contínuas",
            "Análise de KPIs - tendências e desvios",
            "War Room - gestão de crises e situações críticas",
            "Comparação de desempenho entre períodos",
            "Identificação de gargalos e oportunidades",
            "Recomendações estratégicas baseadas em dados",
            "Alertas de desvios significativos",
        ]
