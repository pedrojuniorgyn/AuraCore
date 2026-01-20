"""
Fiscal Agent - Especialista em legislação fiscal brasileira.

Responsabilidades:
- Cálculos de impostos (ICMS, PIS, COFINS)
- Validação de documentos fiscais (CTe, NFe)
- Consultas à legislação
- Simulação da Reforma Tributária 2026
- Geração de arquivos SPED
"""

from typing import List

from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.fiscal.calculate_icms import CalculateICMSTool
from src.tools.fiscal.validate_cte import ValidateCTeTool
from src.tools.fiscal.query_legislation import QueryLegislationTool
from src.tools.fiscal.simulate_tax import SimulateTaxTool
from src.tools.fiscal.check_nfe import CheckNFeTool


class FiscalAgent(BaseAuracoreAgent):
    """
    Agente especializado em legislação fiscal brasileira.
    
    Domínios de conhecimento:
    - ICMS (Lei Kandir - LC 87/96)
    - PIS/COFINS (Leis 10.637/02 e 10.833/03)
    - Reforma Tributária 2026 (EC 132/23)
    - Documentos eletrônicos (CTe, NFe, MDFe, NFS-e)
    - SPED (EFD-ICMS/IPI, EFD-Contribuições)
    """
    
    def __init__(self):
        instructions = [
            # Identidade e expertise
            "Você é o especialista fiscal do AuraCore, com profundo conhecimento em tributação brasileira para transportadoras.",
            
            # Comportamento com tools
            "SEMPRE use a ferramenta 'query_legislation' para consultar a base de conhecimento antes de responder sobre legislação.",
            "Para cálculos de ICMS, SEMPRE use a ferramenta 'calculate_icms' - nunca calcule manualmente.",
            "Ao validar documentos fiscais, use 'validate_cte' ou 'check_nfe' conforme o caso.",
            
            # Precisão e fundamentação
            "Cite SEMPRE a base legal das suas respostas (Lei, Artigo, IN, Convênio).",
            "Se não encontrar informação na base de conhecimento, informe que precisa verificar e sugira consultar um contador.",
            
            # Contexto temporal
            "Considere a Reforma Tributária 2026 (IBS/CBS) quando relevante para planejamento.",
            "Alerte sobre prazos de obrigações acessórias (SPED, GIA, DCTF).",
            
            # Alertas importantes
            "⚠️ Para operações críticas (autorização CTe, geração SPED), sempre confirme os dados antes de prosseguir.",
            "Alerte sobre riscos de multas fiscais quando identificar possíveis irregularidades.",
        ]
        
        tools = [
            CalculateICMSTool(),
            ValidateCTeTool(),
            QueryLegislationTool(),
            SimulateTaxTool(),
            CheckNFeTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.FISCAL,
            name="Fiscal Assistant",
            description=(
                "Especialista em legislação fiscal brasileira para transportadoras. "
                "Domina ICMS, PIS/COFINS, documentos eletrônicos e SPED."
            ),
            instructions=instructions,
            tools=tools,
        )
    
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        return [
            "Cálculo de ICMS (interestadual e interno)",
            "Validação de CTe antes de autorização",
            "Verificação de NFes vinculadas",
            "Consulta à legislação fiscal (Lei Kandir, IN RFB)",
            "Simulação de carga tributária (atual vs Reforma 2026)",
            "Orientação sobre CFOP e CST",
            "Alertas sobre obrigações acessórias",
            "Análise de benefícios fiscais",
        ]
