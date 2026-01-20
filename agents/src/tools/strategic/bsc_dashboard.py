"""
Tool: BSC Dashboard
Balanced Scorecard - Dashboard das 4 perspectivas estratégicas.

Risk Level: LOW (consulta)

Perspectivas BSC (Kaplan & Norton):
1. Financeira - Retorno, lucratividade, crescimento
2. Clientes - Satisfação, retenção, market share
3. Processos Internos - Eficiência, qualidade, inovação
4. Aprendizado e Crescimento - Capacitação, cultura, tecnologia
"""

from typing import Any, Optional
from datetime import date
from decimal import Decimal

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class BSCDashboardTool:
    """Balanced Scorecard Dashboard - 4 perspectivas estratégicas."""
    
    name = "bsc_dashboard"
    description = """
    Consulta e analisa o Balanced Scorecard da organização.
    
    Perspectivas:
    1. FINANCIAL: Indicadores financeiros (receita, margem, ROI)
    2. CUSTOMER: Indicadores de clientes (NPS, retenção, satisfação)
    3. INTERNAL: Indicadores de processos (eficiência, qualidade)
    4. LEARNING: Indicadores de aprendizado (capacitação, inovação)
    
    Ações:
    - overview: Visão geral de todas as perspectivas
    - perspective: Detalhes de uma perspectiva específica
    - objective: Detalhes de um objetivo específico
    - compare: Comparar períodos (YoY, MoM, QoQ)
    
    Parâmetros:
    - action: overview, perspective, objective, compare
    - perspective: FINANCIAL, CUSTOMER, INTERNAL, LEARNING
    - objective_id: ID do objetivo (para action=objective)
    - period: Período de análise (YYYY-MM)
    - compare_with: Período para comparação
    
    Retorna:
    - Objetivos, indicadores, metas e resultados
    - Status de cada indicador (on_track, at_risk, off_track)
    - Tendências e comparações
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        action: str = "overview",
        perspective: Optional[str] = None,
        objective_id: Optional[str] = None,
        period: Optional[str] = None,
        compare_with: Optional[str] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Consulta o Balanced Scorecard.
        
        Args:
            action: overview, perspective, objective, compare
            perspective: FINANCIAL, CUSTOMER, INTERNAL, LEARNING
            objective_id: ID do objetivo
            period: Período (YYYY-MM)
            compare_with: Período para comparação
            
        Returns:
            Dashboard do BSC
        """
        if not period:
            period = date.today().strftime("%Y-%m")
        
        logger.info(
            "Iniciando bsc_dashboard",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "action": action,
                "period": period
            }
        )
        
        valid_actions = ["overview", "perspective", "objective", "compare"]
        if action not in valid_actions:
            return {"success": False, "error": f"Ação inválida. Use: {', '.join(valid_actions)}"}
        
        if action == "overview":
            return await self._get_overview(period)
        elif action == "perspective":
            return await self._get_perspective(perspective, period)
        elif action == "objective":
            return await self._get_objective(objective_id, period)
        elif action == "compare":
            return await self._compare_periods(period, compare_with)
        
        return {"success": False, "error": "Ação não implementada"}
    
    async def _get_overview(self, period: str) -> dict[str, Any]:
        """Visão geral de todas as perspectivas."""
        # Simulação de dados BSC
        bsc = {
            "period": period,
            "overall_score": 78.5,
            "overall_status": "on_track",
            "perspectives": [
                {
                    "id": "FINANCIAL",
                    "name": "Financeira",
                    "icon": "💰",
                    "score": 82.0,
                    "status": "on_track",
                    "objectives_count": 4,
                    "on_track": 3,
                    "at_risk": 1,
                    "off_track": 0,
                    "highlights": [
                        {"indicator": "Receita Bruta", "value": "R$ 15.2M", "vs_target": "+5%"},
                        {"indicator": "Margem EBITDA", "value": "18.5%", "vs_target": "-2%"},
                    ]
                },
                {
                    "id": "CUSTOMER",
                    "name": "Clientes",
                    "icon": "👥",
                    "score": 75.0,
                    "status": "at_risk",
                    "objectives_count": 3,
                    "on_track": 1,
                    "at_risk": 2,
                    "off_track": 0,
                    "highlights": [
                        {"indicator": "NPS", "value": "42", "vs_target": "-8"},
                        {"indicator": "Retenção", "value": "87%", "vs_target": "-3%"},
                    ]
                },
                {
                    "id": "INTERNAL",
                    "name": "Processos Internos",
                    "icon": "⚙️",
                    "score": 80.0,
                    "status": "on_track",
                    "objectives_count": 5,
                    "on_track": 4,
                    "at_risk": 0,
                    "off_track": 1,
                    "highlights": [
                        {"indicator": "On-Time Delivery", "value": "94%", "vs_target": "+4%"},
                        {"indicator": "Custo por Entrega", "value": "R$ 85", "vs_target": "-10%"},
                    ]
                },
                {
                    "id": "LEARNING",
                    "name": "Aprendizado e Crescimento",
                    "icon": "🎓",
                    "score": 77.0,
                    "status": "on_track",
                    "objectives_count": 4,
                    "on_track": 3,
                    "at_risk": 1,
                    "off_track": 0,
                    "highlights": [
                        {"indicator": "Horas Treinamento", "value": "24h/func", "vs_target": "+20%"},
                        {"indicator": "Turnover", "value": "8%", "vs_target": "-2%"},
                    ]
                },
            ],
            "alerts": [
                {"type": "warning", "message": "NPS abaixo da meta por 2 meses consecutivos"},
                {"type": "info", "message": "Meta de receita anual atingida com 2 meses de antecedência"},
            ]
        }
        
        return {
            "success": True,
            "action": "overview",
            "bsc": bsc,
            "message": f"BSC {period}: Score geral {bsc['overall_score']}% - {self._get_status_emoji(bsc['overall_status'])}"
        }
    
    async def _get_perspective(self, perspective: Optional[str], period: str) -> dict[str, Any]:
        """Detalhes de uma perspectiva específica."""
        valid_perspectives = ["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"]
        if not perspective or perspective.upper() not in valid_perspectives:
            return {"success": False, "error": f"Perspectiva inválida. Use: {', '.join(valid_perspectives)}"}
        
        perspective = perspective.upper()
        
        # Simulação de dados detalhados
        perspectives_data = {
            "FINANCIAL": {
                "name": "Financeira",
                "description": "Indicadores de desempenho financeiro",
                "objectives": [
                    {
                        "id": "FIN-01",
                        "name": "Aumentar Receita",
                        "indicators": [
                            {"name": "Receita Bruta", "actual": 15200000, "target": 14500000, "unit": "BRL", "status": "on_track"},
                            {"name": "Ticket Médio", "actual": 2850, "target": 3000, "unit": "BRL", "status": "at_risk"},
                        ]
                    },
                    {
                        "id": "FIN-02",
                        "name": "Melhorar Margem",
                        "indicators": [
                            {"name": "Margem Bruta", "actual": 32.5, "target": 35.0, "unit": "%", "status": "at_risk"},
                            {"name": "Margem EBITDA", "actual": 18.5, "target": 20.0, "unit": "%", "status": "at_risk"},
                        ]
                    },
                    {
                        "id": "FIN-03",
                        "name": "Otimizar Capital",
                        "indicators": [
                            {"name": "ROI", "actual": 22.0, "target": 20.0, "unit": "%", "status": "on_track"},
                            {"name": "Ciclo Financeiro", "actual": 45, "target": 50, "unit": "dias", "status": "on_track"},
                        ]
                    },
                ]
            },
            "CUSTOMER": {
                "name": "Clientes",
                "description": "Indicadores de satisfação e retenção de clientes",
                "objectives": [
                    {
                        "id": "CUS-01",
                        "name": "Aumentar Satisfação",
                        "indicators": [
                            {"name": "NPS", "actual": 42, "target": 50, "unit": "pts", "status": "off_track"},
                            {"name": "CSAT", "actual": 4.2, "target": 4.5, "unit": "/5", "status": "at_risk"},
                        ]
                    },
                    {
                        "id": "CUS-02",
                        "name": "Reter Clientes",
                        "indicators": [
                            {"name": "Retenção", "actual": 87, "target": 90, "unit": "%", "status": "at_risk"},
                            {"name": "Churn", "actual": 2.5, "target": 2.0, "unit": "%", "status": "at_risk"},
                        ]
                    },
                ]
            },
            "INTERNAL": {
                "name": "Processos Internos",
                "description": "Indicadores de eficiência operacional",
                "objectives": [
                    {
                        "id": "INT-01",
                        "name": "Excelência em Entregas",
                        "indicators": [
                            {"name": "On-Time Delivery", "actual": 94, "target": 90, "unit": "%", "status": "on_track"},
                            {"name": "Entregas Perfeitas", "actual": 88, "target": 85, "unit": "%", "status": "on_track"},
                        ]
                    },
                    {
                        "id": "INT-02",
                        "name": "Reduzir Custos",
                        "indicators": [
                            {"name": "Custo por Entrega", "actual": 85, "target": 95, "unit": "BRL", "status": "on_track"},
                            {"name": "Custo Combustível/km", "actual": 1.85, "target": 2.00, "unit": "BRL", "status": "on_track"},
                        ]
                    },
                ]
            },
            "LEARNING": {
                "name": "Aprendizado e Crescimento",
                "description": "Indicadores de desenvolvimento organizacional",
                "objectives": [
                    {
                        "id": "LEA-01",
                        "name": "Desenvolver Pessoas",
                        "indicators": [
                            {"name": "Horas Treinamento", "actual": 24, "target": 20, "unit": "h/func", "status": "on_track"},
                            {"name": "Turnover", "actual": 8, "target": 10, "unit": "%", "status": "on_track"},
                        ]
                    },
                    {
                        "id": "LEA-02",
                        "name": "Inovação",
                        "indicators": [
                            {"name": "Projetos Inovação", "actual": 5, "target": 8, "unit": "", "status": "at_risk"},
                            {"name": "Automação", "actual": 65, "target": 70, "unit": "%", "status": "at_risk"},
                        ]
                    },
                ]
            },
        }
        
        data = perspectives_data.get(perspective, {})
        
        return {
            "success": True,
            "action": "perspective",
            "period": period,
            "perspective": data,
            "message": f"Perspectiva {data.get('name', perspective)}: {len(data.get('objectives', []))} objetivos"
        }
    
    async def _get_objective(self, objective_id: Optional[str], period: str) -> dict[str, Any]:
        """Detalhes de um objetivo específico."""
        if not objective_id:
            return {"success": False, "error": "objective_id é obrigatório"}
        
        # Simulação
        objective = {
            "id": objective_id,
            "name": "Aumentar Receita",
            "perspective": "FINANCIAL",
            "owner": "Diretor Comercial",
            "description": "Aumentar a receita bruta em 15% no ano fiscal",
            "indicators": [
                {
                    "name": "Receita Bruta",
                    "actual": 15200000,
                    "target": 14500000,
                    "unit": "BRL",
                    "status": "on_track",
                    "trend": "up",
                    "history": [
                        {"period": "2025-01", "value": 14800000},
                        {"period": "2024-12", "value": 14200000},
                        {"period": "2024-11", "value": 13900000},
                    ]
                }
            ],
            "initiatives": [
                {"name": "Campanha Q1", "status": "completed", "impact": "high"},
                {"name": "Expansão Norte", "status": "in_progress", "impact": "medium"},
                {"name": "Novo Canal Digital", "status": "planned", "impact": "high"},
            ]
        }
        
        return {
            "success": True,
            "action": "objective",
            "period": period,
            "objective": objective,
            "message": f"Objetivo {objective_id}: {objective['name']}"
        }
    
    async def _compare_periods(self, period: str, compare_with: Optional[str]) -> dict[str, Any]:
        """Compara BSC entre dois períodos."""
        if not compare_with:
            # Compara com mês anterior por padrão
            year, month = map(int, period.split("-"))
            if month == 1:
                compare_with = f"{year-1}-12"
            else:
                compare_with = f"{year}-{month-1:02d}"
        
        comparison = {
            "period": period,
            "compare_with": compare_with,
            "overall": {
                "current": 78.5,
                "previous": 75.2,
                "change": 3.3,
                "trend": "up"
            },
            "perspectives": [
                {"name": "Financeira", "current": 82.0, "previous": 78.0, "change": 4.0},
                {"name": "Clientes", "current": 75.0, "previous": 77.0, "change": -2.0},
                {"name": "Processos", "current": 80.0, "previous": 76.0, "change": 4.0},
                {"name": "Aprendizado", "current": 77.0, "previous": 74.0, "change": 3.0},
            ],
            "improved": ["Receita Bruta", "On-Time Delivery", "Custo por Entrega"],
            "declined": ["NPS", "Retenção de Clientes"],
        }
        
        return {
            "success": True,
            "action": "compare",
            "comparison": comparison,
            "message": f"Comparação {period} vs {compare_with}: Score {comparison['overall']['change']:+.1f}%"
        }
    
    def _get_status_emoji(self, status: str) -> str:
        """Retorna emoji para status."""
        return {"on_track": "🟢", "at_risk": "🟡", "off_track": "🔴"}.get(status, "⚪")
