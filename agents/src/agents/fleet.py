"""
Fleet Agent - Especialista em gestão de frota de veículos.

Responsabilidades:
- Agendamento e controle de manutenções preventivas/corretivas
- Monitoramento de documentos e vencimentos
- Análise de consumo de combustível
- Alertas de manutenção preventiva
- Cálculo de CPK (Custo por Km)

Referências:
- CONTRAN (Resoluções de trânsito)
- ANTT (Transporte rodoviário de cargas)
- Lei 13.103/2015 (Lei do Motorista)
"""

from typing import List

from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.fleet.maintenance_scheduler import MaintenanceSchedulerTool
from src.tools.fleet.document_tracker import DocumentTrackerTool
from src.tools.fleet.fuel_monitor import FuelMonitorTool


class FleetAgent(BaseAuracoreAgent):
    """
    Agente especializado em gestão de frota de veículos.
    
    Domínios de conhecimento:
    - Manutenção preventiva e corretiva
    - Documentação veicular (CRLV, seguro, tacógrafo)
    - Consumo de combustível e CPK
    - Regulamentações CONTRAN e ANTT
    """
    
    def __init__(self):
        instructions = [
            # Identidade e expertise
            "Você é o especialista em gestão de frota do AuraCore, com profundo conhecimento em manutenção veicular e logística.",
            
            # Comportamento com tools
            "Para agendar, cancelar ou listar manutenções, use 'maintenance_scheduler'.",
            "Para consultar documentos de veículos ou motoristas, use 'document_tracker'.",
            "Para analisar consumo de combustível e CPK, use 'fuel_monitor'.",
            
            # Manutenção
            "Priorize manutenções preventivas baseadas em km e tempo.",
            "Alerte sobre manutenções atrasadas ou próximas do vencimento.",
            "Tipos de manutenção: PREVENTIVE (km/tempo), CORRECTIVE (reparo), PREDICTIVE (análise).",
            
            # Documentos
            "Monitore vencimentos de CRLV, seguro, tacógrafo, ANTT e CNH.",
            "Documente não-conformidades e gere alertas urgentes.",
            
            # Combustível
            "Calcule consumo médio (km/l) e CPK (Custo por Km).",
            "Detecte anomalias de consumo que podem indicar problemas mecânicos ou fraude.",
            "Compare veículos para identificar oportunidades de melhoria.",
            
            # Formatação
            "Formate valores monetários como R$ 1.234,56.",
            "Formate consumo como X,XX km/l.",
            "Use emojis de alerta: 🚨 (crítico), ⚠️ (atenção), ✅ (ok).",
            
            # Conformidade
            "Siga regulamentações CONTRAN e ANTT.",
            "Respeite a Lei do Motorista (13.103/2015).",
        ]
        
        tools = [
            MaintenanceSchedulerTool(),
            DocumentTrackerTool(),
            FuelMonitorTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.FLEET,
            name="Fleet Assistant",
            description=(
                "Especialista em gestão de frota de veículos. "
                "Domina manutenção, documentação e consumo de combustível."
            ),
            instructions=instructions,
            tools=tools,
        )
    
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        return [
            "Agendamento de manutenções preventivas e corretivas",
            "Alertas de manutenção baseados em km e tempo",
            "Controle de documentos de veículos e motoristas",
            "Monitoramento de vencimentos (CRLV, seguro, tacógrafo)",
            "Análise de consumo de combustível",
            "Cálculo de CPK (Custo por Quilômetro)",
            "Detecção de anomalias de consumo",
            "Comparação de eficiência entre veículos",
            "Conformidade com CONTRAN e ANTT",
        ]
