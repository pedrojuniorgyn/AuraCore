"""
Tool: Report Generator
Gera relatórios de qualidade em diversos formatos.

Risk Level: LOW (geração de relatório)

Formatos:
- Markdown
- JSON
- HTML
"""

import json
from datetime import datetime
from typing import Any, Optional

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class ReportGeneratorTool:
    """Gera relatórios de qualidade."""
    
    name = "report_generator"
    description = """
    Gera relatório de qualidade em formato estruturado.
    
    Formatos disponíveis:
    - markdown: Para documentação e PRs
    - json: Para integração com ferramentas
    - html: Para visualização web
    
    Parâmetros:
    - title: Título do relatório
    - summary: Resumo executivo
    - sections: Lista de seções com título, conteúdo, severidade
    - format: markdown, json, html
    - include_timestamp: Incluir data/hora
    - include_recommendations: Incluir recomendações
    
    Retorna:
    - Relatório no formato solicitado
    - Metadados (seções, items, data)
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        title: str = "Relatório de Qualidade",
        summary: Optional[str] = None,
        sections: Optional[list[dict]] = None,
        format: str = "markdown",
        include_timestamp: bool = True,
        include_recommendations: bool = True,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Gera relatório de qualidade.
        
        Args:
            title: Título do relatório
            summary: Resumo executivo
            sections: Seções do relatório
            format: Formato de saída
            
        Returns:
            Relatório gerado
        """
        logger.info(
            "Iniciando report_generator",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "format": format,
                "sections": len(sections) if sections else 0
            }
        )
        
        sections = sections or []
        generated_at = datetime.utcnow()
        total_items = sum(s.get("items_count", 0) for s in sections)
        
        if format == "markdown":
            content = self._generate_markdown(title, summary, sections, generated_at, include_timestamp, include_recommendations)
        elif format == "json":
            content = self._generate_json(title, summary, sections, generated_at)
        elif format == "html":
            content = self._generate_html(title, summary, sections, generated_at)
        else:
            return {"success": False, "error": f"Formato desconhecido: {format}"}
        
        return {
            "success": True,
            "format": format,
            "content": content,
            "generated_at": generated_at.isoformat(),
            "sections_count": len(sections),
            "total_items": total_items,
            "message": f"Relatório gerado: {len(sections)} seções, {total_items} items"
        }
    
    def _generate_markdown(
        self,
        title: str,
        summary: Optional[str],
        sections: list[dict],
        generated_at: datetime,
        include_timestamp: bool,
        include_recommendations: bool
    ) -> str:
        """Gera relatório em Markdown."""
        lines = [f"# {title}", ""]
        
        if include_timestamp:
            lines.extend([
                f"**Gerado em:** {generated_at.strftime('%Y-%m-%d %H:%M:%S')} UTC",
                "",
            ])
        
        if summary:
            lines.extend([
                "## Resumo Executivo",
                "",
                summary,
                "",
            ])
        
        # Seções
        for section in sections:
            severity = section.get("severity", "")
            severity_icon = {"ERROR": "🔴", "WARNING": "🟡", "INFO": "🔵"}.get(severity, "")
            
            lines.extend([
                f"## {severity_icon} {section.get('title', 'Seção')}",
                "",
                section.get("content", ""),
                "",
            ])
            
            items_count = section.get("items_count", 0)
            if items_count > 0:
                lines.append(f"*{items_count} item(s) encontrado(s)*")
                lines.append("")
        
        if include_recommendations:
            lines.extend([
                "---",
                "",
                "## Recomendações",
                "",
                "1. Corrigir todos os erros (🔴) antes do deploy",
                "2. Revisar warnings (🟡) e decidir se são aceitáveis",
                "3. Adicionar testes para componentes críticos",
                "4. Implementar handlers vazios ou remover botões não funcionais",
                "",
            ])
        
        return "\n".join(lines)
    
    def _generate_json(
        self,
        title: str,
        summary: Optional[str],
        sections: list[dict],
        generated_at: datetime
    ) -> str:
        """Gera relatório em JSON."""
        report = {
            "title": title,
            "generated_at": generated_at.isoformat(),
            "summary": summary,
            "sections": [
                {
                    "title": s.get("title"),
                    "severity": s.get("severity"),
                    "content": s.get("content"),
                    "items_count": s.get("items_count", 0)
                }
                for s in sections
            ],
            "totals": {
                "sections": len(sections),
                "items": sum(s.get("items_count", 0) for s in sections)
            }
        }
        
        return json.dumps(report, indent=2, ensure_ascii=False)
    
    def _generate_html(
        self,
        title: str,
        summary: Optional[str],
        sections: list[dict],
        generated_at: datetime
    ) -> str:
        """Gera relatório em HTML."""
        sections_html = ""
        for section in sections:
            severity = section.get("severity", "")
            severity_class = {"ERROR": "error", "WARNING": "warning", "INFO": "info"}.get(severity, "")
            
            sections_html += f"""
            <section class="report-section {severity_class}">
                <h2>{section.get('title', 'Seção')}</h2>
                <p>{section.get('content', '')}</p>
                <span class="items-count">{section.get('items_count', 0)} item(s)</span>
            </section>
            """
        
        return f"""<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        .report-section {{ padding: 15px; margin: 10px 0; border-radius: 8px; background: #f5f5f5; }}
        .error {{ border-left: 4px solid #dc2626; }}
        .warning {{ border-left: 4px solid #f59e0b; }}
        .info {{ border-left: 4px solid #3b82f6; }}
        .items-count {{ color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <p><em>Gerado em: {generated_at.strftime('%Y-%m-%d %H:%M:%S')} UTC</em></p>
    {f'<p>{summary}</p>' if summary else ''}
    {sections_html}
</body>
</html>"""
