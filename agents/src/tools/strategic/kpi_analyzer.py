"""
Tool: KPI Analyzer
Análise de KPIs e métricas de negócio.

Risk Level: LOW (consulta)

Categorias de KPIs:
- Financeiros: Receita, margem, ROI, EBITDA
- Operacionais: Produtividade, eficiência, qualidade
- Comerciais: Vendas, conversão, ticket médio
- RH: Turnover, absenteísmo, satisfação
"""

from typing import Any, Optional
from datetime import date, timedelta

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class KPIAnalyzerTool:
    """Análise de KPIs e métricas de negócio."""
    
    name = "kpi_analyzer"
    description = """
    Analisa KPIs e métricas de desempenho do negócio.
    
    Categorias:
    - FINANCIAL: Receita, margem, ROI, EBITDA
    - OPERATIONAL: Produtividade, eficiência, qualidade
    - COMMERCIAL: Vendas, conversão, ticket médio
    - HR: Turnover, absenteísmo, satisfação
    
    Ações:
    - dashboard: Painel com principais KPIs
    - analyze: Análise detalhada de um KPI
    - trends: Tendências históricas
    - alerts: KPIs com desvios significativos
    - compare: Comparar KPIs entre períodos
    
    Parâmetros:
    - action: dashboard, analyze, trends, alerts, compare
    - category: FINANCIAL, OPERATIONAL, COMMERCIAL, HR
    - kpi_id: ID do KPI específico
    - period: Período de análise (YYYY-MM)
    - compare_with: Período para comparação
    
    Retorna:
    - Valor atual, meta, tendência
    - Análise de desvios
    - Recomendações de ação
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        action: str = "dashboard",
        category: Optional[str] = None,
        kpi_id: Optional[str] = None,
        period: Optional[str] = None,
        compare_with: Optional[str] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Analisa KPIs e métricas.
        
        Args:
            action: dashboard, analyze, trends, alerts, compare
            category: Categoria de KPIs
            kpi_id: ID do KPI
            period: Período (YYYY-MM)
            
        Returns:
            Análise de KPIs
        """
        if not period:
            period = date.today().strftime("%Y-%m")
        
        logger.info(
            "Iniciando kpi_analyzer",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "action": action,
                "category": category
            }
        )
        
        valid_actions = ["dashboard", "analyze", "trends", "alerts", "compare"]
        if action not in valid_actions:
            return {"success": False, "error": f"Ação inválida. Use: {', '.join(valid_actions)}"}
        
        if action == "dashboard":
            return await self._get_dashboard(category, period)
        elif action == "analyze":
            return await self._analyze_kpi(kpi_id, period)
        elif action == "trends":
            return await self._get_trends(kpi_id, period)
        elif action == "alerts":
            return await self._get_alerts(period)
        elif action == "compare":
            return await self._compare_periods(period, compare_with)
        
        return {"success": False, "error": "Ação não implementada"}
    
    async def _get_dashboard(self, category: Optional[str], period: str) -> dict[str, Any]:
        """Dashboard com principais KPIs."""
        # Simulação de dados
        categories = {
            "FINANCIAL": [
                {"id": "FIN-REV", "name": "Receita Bruta", "value": 15200000, "target": 14500000, "unit": "BRL", "status": "on_track", "trend": "up", "change": 5.2},
                {"id": "FIN-EBITDA", "name": "Margem EBITDA", "value": 18.5, "target": 20.0, "unit": "%", "status": "at_risk", "trend": "down", "change": -1.5},
                {"id": "FIN-ROI", "name": "ROI", "value": 22.0, "target": 20.0, "unit": "%", "status": "on_track", "trend": "up", "change": 2.0},
                {"id": "FIN-CASH", "name": "Ciclo de Caixa", "value": 45, "target": 50, "unit": "dias", "status": "on_track", "trend": "down", "change": -5},
            ],
            "OPERATIONAL": [
                {"id": "OPS-OTD", "name": "On-Time Delivery", "value": 94.2, "target": 90.0, "unit": "%", "status": "on_track", "trend": "up", "change": 2.1},
                {"id": "OPS-CPK", "name": "Custo por Km", "value": 4.85, "target": 5.00, "unit": "BRL", "status": "on_track", "trend": "down", "change": -3.0},
                {"id": "OPS-UTIL", "name": "Utilização Frota", "value": 78.5, "target": 85.0, "unit": "%", "status": "at_risk", "trend": "up", "change": 1.5},
                {"id": "OPS-AVR", "name": "Avarias", "value": 0.8, "target": 1.0, "unit": "%", "status": "on_track", "trend": "down", "change": -0.2},
            ],
            "COMMERCIAL": [
                {"id": "COM-LEADS", "name": "Leads Qualificados", "value": 245, "target": 200, "unit": "", "status": "on_track", "trend": "up", "change": 22.5},
                {"id": "COM-CONV", "name": "Taxa Conversão", "value": 12.5, "target": 15.0, "unit": "%", "status": "at_risk", "trend": "stable", "change": 0.0},
                {"id": "COM-TKT", "name": "Ticket Médio", "value": 2850, "target": 3000, "unit": "BRL", "status": "at_risk", "trend": "down", "change": -5.0},
                {"id": "COM-NPS", "name": "NPS", "value": 42, "target": 50, "unit": "pts", "status": "off_track", "trend": "down", "change": -4},
            ],
            "HR": [
                {"id": "HR-TURN", "name": "Turnover", "value": 8.0, "target": 10.0, "unit": "%", "status": "on_track", "trend": "down", "change": -2.0},
                {"id": "HR-ABS", "name": "Absenteísmo", "value": 3.5, "target": 4.0, "unit": "%", "status": "on_track", "trend": "stable", "change": 0.0},
                {"id": "HR-TRAIN", "name": "Horas Treinamento", "value": 24, "target": 20, "unit": "h/func", "status": "on_track", "trend": "up", "change": 20.0},
                {"id": "HR-SAT", "name": "Satisfação", "value": 4.2, "target": 4.5, "unit": "/5", "status": "at_risk", "trend": "stable", "change": 0.0},
            ],
        }
        
        if category and category.upper() in categories:
            kpis = {category.upper(): categories[category.upper()]}
        else:
            kpis = categories
        
        # Resumo
        all_kpis = [kpi for cat in kpis.values() for kpi in cat]
        on_track = len([k for k in all_kpis if k["status"] == "on_track"])
        at_risk = len([k for k in all_kpis if k["status"] == "at_risk"])
        off_track = len([k for k in all_kpis if k["status"] == "off_track"])
        
        return {
            "success": True,
            "action": "dashboard",
            "period": period,
            "kpis": kpis,
            "summary": {
                "total": len(all_kpis),
                "on_track": on_track,
                "at_risk": at_risk,
                "off_track": off_track,
                "health_rate": round(on_track / len(all_kpis) * 100, 1) if all_kpis else 0
            },
            "message": f"Dashboard KPIs: 🟢{on_track} 🟡{at_risk} 🔴{off_track}"
        }
    
    async def _analyze_kpi(self, kpi_id: Optional[str], period: str) -> dict[str, Any]:
        """Análise detalhada de um KPI."""
        if not kpi_id:
            return {"success": False, "error": "kpi_id é obrigatório"}
        
        # Simulação
        analysis = {
            "id": kpi_id,
            "name": "NPS - Net Promoter Score",
            "category": "COMMERCIAL",
            "description": "Mede a lealdade do cliente e probabilidade de recomendação",
            "current": {
                "value": 42,
                "target": 50,
                "variance": -8,
                "variance_pct": -16.0,
                "status": "off_track"
            },
            "trend": {
                "direction": "down",
                "last_3_months": [46, 44, 42],
                "ytd_average": 44.5
            },
            "breakdown": {
                "promoters": 52,
                "passives": 28,
                "detractors": 20
            },
            "drivers": [
                {"factor": "Tempo de entrega", "impact": "high", "trend": "improving"},
                {"factor": "Atendimento pós-venda", "impact": "high", "trend": "declining"},
                {"factor": "Qualidade embalagem", "impact": "medium", "trend": "stable"},
            ],
            "recommendations": [
                "📞 Implementar follow-up proativo pós-entrega",
                "📋 Revisar processo de tratamento de reclamações",
                "🎯 Focar em converter passivos em promotores",
            ],
            "action_plan": {
                "priority": "HIGH",
                "responsible": "Gerente CX",
                "deadline": "2025-02-28"
            }
        }
        
        return {
            "success": True,
            "action": "analyze",
            "period": period,
            "analysis": analysis,
            "message": f"KPI {kpi_id}: {analysis['current']['value']} (meta: {analysis['current']['target']})"
        }
    
    async def _get_trends(self, kpi_id: Optional[str], period: str) -> dict[str, Any]:
        """Tendências históricas de KPIs."""
        # Se kpi_id específico, mostra histórico dele
        # Senão, mostra tendências gerais
        
        trends = {
            "period": period,
            "trending_up": [
                {"id": "FIN-REV", "name": "Receita Bruta", "change_3m": 12.5, "change_ytd": 8.2},
                {"id": "OPS-OTD", "name": "On-Time Delivery", "change_3m": 5.0, "change_ytd": 6.8},
                {"id": "COM-LEADS", "name": "Leads Qualificados", "change_3m": 22.5, "change_ytd": 15.0},
            ],
            "trending_down": [
                {"id": "COM-NPS", "name": "NPS", "change_3m": -8.7, "change_ytd": -5.5},
                {"id": "FIN-EBITDA", "name": "Margem EBITDA", "change_3m": -3.0, "change_ytd": -2.1},
                {"id": "COM-TKT", "name": "Ticket Médio", "change_3m": -5.0, "change_ytd": -3.2},
            ],
            "stable": [
                {"id": "HR-ABS", "name": "Absenteísmo", "change_3m": 0.0, "change_ytd": -0.5},
                {"id": "HR-SAT", "name": "Satisfação", "change_3m": 0.0, "change_ytd": 0.2},
            ]
        }
        
        return {
            "success": True,
            "action": "trends",
            "trends": trends,
            "message": f"Tendências: ⬆️{len(trends['trending_up'])} ⬇️{len(trends['trending_down'])} ➡️{len(trends['stable'])}"
        }
    
    async def _get_alerts(self, period: str) -> dict[str, Any]:
        """KPIs com desvios significativos."""
        alerts = [
            {
                "severity": "critical",
                "kpi_id": "COM-NPS",
                "kpi_name": "NPS",
                "message": "NPS em queda por 3 meses consecutivos",
                "value": 42,
                "target": 50,
                "variance": -16.0,
                "action": "Reunião de crise agendada para amanhã"
            },
            {
                "severity": "warning",
                "kpi_id": "OPS-UTIL",
                "kpi_name": "Utilização Frota",
                "message": "Utilização abaixo da meta por 2 meses",
                "value": 78.5,
                "target": 85.0,
                "variance": -7.6,
                "action": "Revisar planejamento de rotas"
            },
            {
                "severity": "warning",
                "kpi_id": "COM-CONV",
                "kpi_name": "Taxa Conversão",
                "message": "Conversão estagnada há 3 meses",
                "value": 12.5,
                "target": 15.0,
                "variance": -16.7,
                "action": "Avaliar qualidade dos leads"
            },
            {
                "severity": "info",
                "kpi_id": "FIN-REV",
                "kpi_name": "Receita Bruta",
                "message": "Meta anual atingida com antecedência!",
                "value": 15200000,
                "target": 14500000,
                "variance": 4.8,
                "action": "Revisar projeção para Q2"
            },
        ]
        
        critical = len([a for a in alerts if a["severity"] == "critical"])
        warning = len([a for a in alerts if a["severity"] == "warning"])
        
        return {
            "success": True,
            "action": "alerts",
            "period": period,
            "alerts": alerts,
            "summary": {
                "critical": critical,
                "warning": warning,
                "info": len(alerts) - critical - warning
            },
            "message": f"Alertas: 🔴{critical} críticos, 🟡{warning} atenção"
        }
    
    async def _compare_periods(self, period: str, compare_with: Optional[str]) -> dict[str, Any]:
        """Compara KPIs entre períodos."""
        if not compare_with:
            year, month = map(int, period.split("-"))
            if month == 1:
                compare_with = f"{year-1}-12"
            else:
                compare_with = f"{year}-{month-1:02d}"
        
        comparison = {
            "period": period,
            "compare_with": compare_with,
            "improved": [
                {"name": "Receita Bruta", "current": "R$ 15.2M", "previous": "R$ 14.5M", "change": "+4.8%"},
                {"name": "On-Time Delivery", "current": "94.2%", "previous": "92.1%", "change": "+2.1pp"},
                {"name": "Custo por Km", "current": "R$ 4.85", "previous": "R$ 5.00", "change": "-3.0%"},
            ],
            "declined": [
                {"name": "NPS", "current": "42", "previous": "44", "change": "-4.5%"},
                {"name": "Margem EBITDA", "current": "18.5%", "previous": "19.0%", "change": "-0.5pp"},
                {"name": "Ticket Médio", "current": "R$ 2.850", "previous": "R$ 3.000", "change": "-5.0%"},
            ],
            "stable": [
                {"name": "Turnover", "current": "8%", "previous": "8%", "change": "0"},
                {"name": "Absenteísmo", "current": "3.5%", "previous": "3.5%", "change": "0"},
            ]
        }
        
        return {
            "success": True,
            "action": "compare",
            "comparison": comparison,
            "message": f"Comparação {period} vs {compare_with}: {len(comparison['improved'])} melhoraram, {len(comparison['declined'])} pioraram"
        }
