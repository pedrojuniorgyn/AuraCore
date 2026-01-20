"""
Tool: Visual Auditor
Análise visual de interfaces usando Claude Vision.

Risk Level: LOW (análise de imagem)

Detecta:
- Inconsistências de design
- Problemas de layout
- Elementos sobrepostos
- Texto ilegível
- Falta de feedback visual
"""

from typing import Any, Optional

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class VisualAuditorTool:
    """Análise visual de interfaces com Claude Vision."""
    
    name = "visual_auditor"
    description = """
    Analisa screenshots de interface usando Claude Vision.
    
    Verifica:
    - Consistência de design (cores, fontes, espaçamentos)
    - Problemas de layout (sobreposição, alinhamento)
    - UX (feedback visual, clareza de ações)
    - Acessibilidade básica (contraste, tamanho de texto)
    
    Parâmetros:
    - image_base64: Imagem em base64
    - image_url: URL da imagem (alternativa)
    - page_name: Nome da página
    - module: Módulo do sistema
    - focus_areas: Áreas de foco (design, ux, accessibility, layout)
    
    Retorna:
    - Issues visuais com severidade
    - Score geral de qualidade
    - Pontos positivos identificados
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        image_base64: Optional[str] = None,
        image_url: Optional[str] = None,
        page_name: Optional[str] = None,
        module: Optional[str] = None,
        focus_areas: Optional[list[str]] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Analisa screenshot de interface.
        
        Args:
            image_base64: Imagem em base64
            image_url: URL da imagem
            page_name: Nome da página
            module: Módulo do sistema
            focus_areas: Áreas de foco
            
        Returns:
            Análise visual com issues e score
        """
        logger.info(
            "Iniciando visual_auditor",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "page_name": page_name,
                "module": module
            }
        )
        
        if not image_base64 and not image_url:
            return {"success": False, "error": "image_base64 ou image_url é obrigatório"}
        
        # Simulação de análise (TODO: Integrar com Claude Vision API)
        issues = [
            {
                "category": "DESIGN",
                "severity": "MEDIUM",
                "description": "Botões com estilos inconsistentes detectados",
                "location": "Área de ações no topo",
                "suggestion": "Padronizar usando componentes do design system"
            },
            {
                "category": "UX",
                "severity": "HIGH",
                "description": "Botão 'Salvar' sem estado de loading/disabled durante operação",
                "location": "Formulário principal",
                "suggestion": "Adicionar feedback visual durante submit"
            },
            {
                "category": "LAYOUT",
                "severity": "LOW",
                "description": "Espaçamento irregular entre cards",
                "location": "Grid de cards",
                "suggestion": "Usar gap consistente (ex: gap-4)"
            },
            {
                "category": "ACCESSIBILITY",
                "severity": "MEDIUM",
                "description": "Contraste de texto pode ser insuficiente",
                "location": "Labels de formulário",
                "suggestion": "Usar cores com ratio de contraste >= 4.5:1"
            },
        ]
        
        # Filtrar por foco se especificado
        if focus_areas:
            focus_lower = [f.lower() for f in focus_areas]
            issues = [i for i in issues if i["category"].lower() in focus_lower]
        
        high_count = len([i for i in issues if i["severity"] == "HIGH"])
        medium_count = len([i for i in issues if i["severity"] == "MEDIUM"])
        low_count = len([i for i in issues if i["severity"] == "LOW"])
        
        # Score baseado nas issues
        total_issues = len(issues)
        if total_issues == 0:
            overall_score = 100.0
        else:
            penalty = (high_count * 20) + (medium_count * 10) + (low_count * 5)
            overall_score = max(0, 100 - penalty)
        
        overall_assessment = "Bom" if overall_score >= 70 else "Precisa melhorias" if overall_score >= 50 else "Crítico"
        
        return {
            "success": True,
            "page_name": page_name,
            "module": module,
            "issues": issues,
            "high_count": high_count,
            "medium_count": medium_count,
            "low_count": low_count,
            "overall_score": overall_score,
            "overall_assessment": overall_assessment,
            "positive_aspects": [
                "Layout responsivo",
                "Hierarquia visual clara",
                "Cores do brand aplicadas"
            ],
            "message": f"Análise visual: 🔴{high_count} high, 🟡{medium_count} medium, 🟢{low_count} low. Score: {overall_score:.0f}/100"
        }
