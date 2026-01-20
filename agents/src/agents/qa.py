"""
QA Agent - Especialista em Quality Assurance de Frontend.

Responsabilidades:
- Análise estática de código React/TypeScript
- Detecção de handlers vazios ou incompletos
- Análise visual de interfaces
- Geração de relatórios de issues

Detecta:
- Botões/handlers não funcionais
- TODOs e código incompleto
- Problemas de UI/UX
- Issues de acessibilidade
"""

from typing import List

from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.qa.code_analyzer import CodeAnalyzerTool
from src.tools.qa.visual_auditor import VisualAuditorTool
from src.tools.qa.component_scanner import ComponentScannerTool
from src.tools.qa.report_generator import ReportGeneratorTool


class QAAgent(BaseAuracoreAgent):
    """
    Agente especializado em Quality Assurance de Frontend.
    
    Domínios de conhecimento:
    - Análise estática de código
    - Detecção de problemas de UI/UX
    - Verificação de handlers e eventos
    - Geração de relatórios de qualidade
    """
    
    def __init__(self):
        instructions = [
            # Identidade e expertise
            "Você é o especialista em QA do AuraCore, focado em garantir qualidade do frontend.",
            
            # Comportamento com tools
            "Para analisar código e encontrar problemas, use 'code_analyzer'.",
            "Para análise visual de screenshots, use 'visual_auditor'.",
            "Para escanear componentes de um módulo, use 'component_scanner'.",
            "Para gerar relatórios formatados, use 'report_generator'.",
            
            # Análise de código
            "Detecte handlers vazios: onClick={() => {}}, onSubmit vazio, onChange vazio.",
            "Identifique código de debug: console.log, debugger, TODOs.",
            "Encontre links quebrados: href='#' sem função.",
            
            # Priorização
            "Classifique issues por severidade: ERROR (crítico), WARNING (atenção), INFO (informativo).",
            "Priorize erros que afetam funcionalidade sobre problemas cosméticos.",
            
            # Relatórios
            "Gere relatórios claros com ações recomendadas.",
            "Agrupe issues por categoria para facilitar correção.",
            
            # Formatação
            "Use emojis para severidade: 🔴 (error), 🟡 (warning), 🔵 (info).",
            "Forneça snippets de código para contextualizar.",
        ]
        
        tools = [
            CodeAnalyzerTool(),
            VisualAuditorTool(),
            ComponentScannerTool(),
            ReportGeneratorTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.QA,
            name="QA Assistant",
            description=(
                "Especialista em Quality Assurance de Frontend. "
                "Analisa código, detecta problemas e gera relatórios de qualidade."
            ),
            instructions=instructions,
            tools=tools,
        )
    
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        return [
            "Análise estática de código React/TypeScript",
            "Detecção de handlers vazios (onClick, onSubmit, onChange)",
            "Identificação de código de debug (console.log, debugger)",
            "Busca por TODOs e FIXMEs pendentes",
            "Análise visual de interfaces (screenshots)",
            "Scanner de componentes por módulo",
            "Geração de relatórios em Markdown/JSON/HTML",
            "Verificação de links quebrados",
            "Detecção de elementos sempre desabilitados",
        ]
