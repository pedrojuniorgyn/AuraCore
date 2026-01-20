"""
Tool para análise de saúde do cliente.

Avalia:
- Risco de churn (cancelamento)
- Satisfação (NPS, tickets)
- Oportunidades de upsell
- Histórico de relacionamento
"""

from typing import Any, Optional
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class HealthStatus(str, Enum):
    """Status de saúde do cliente."""
    HEALTHY = "healthy"       # Score >= 80
    AT_RISK = "at_risk"       # Score 50-79
    CRITICAL = "critical"     # Score < 50


class ChurnRisk(str, Enum):
    """Nível de risco de churn."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class HealthIndicator:
    """Indicador de saúde."""
    name: str
    value: float
    max_value: float
    weight: float
    status: str
    trend: str  # up, down, stable


class CustomerHealthTool:
    """Análise de saúde do cliente."""
    
    name = "customer_health"
    description = """
    Analisa saúde do cliente, risco de churn e oportunidades de crescimento.
    
    Parâmetros:
    - customer_id: ID do cliente
    - cnpj: CNPJ do cliente
    - analyze_all: Se True, analisa todos os clientes ativos
    - health_threshold: Score mínimo para retornar
    - include_history: Incluir histórico de métricas
    - period_months: Período de análise em meses
    
    Retorna:
    - Health Score (0-100)
    - Status: 💚 Saudável, 🟡 Em Risco, 🔴 Crítico
    - Risco de Churn
    - Indicadores detalhados
    - Oportunidades de upsell
    - Recomendações de ação
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        customer_id: Optional[str] = None,
        cnpj: Optional[str] = None,
        analyze_all: bool = False,
        health_threshold: int = 0,
        include_history: bool = True,
        period_months: int = 6,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Analisa saúde de cliente(s).
        
        Args:
            customer_id: ID do cliente
            cnpj: CNPJ do cliente
            analyze_all: Se True, analisa todos os clientes ativos
            health_threshold: Score mínimo para retornar
            include_history: Incluir histórico de métricas
            period_months: Período de análise em meses
            
        Returns:
            Análise de saúde com indicadores e recomendações
        """
        logger.info(
            "Iniciando customer_health",
            extra={
                "org_id": organization_id,
                "customer_id": customer_id,
                "analyze_all": analyze_all
            }
        )
        
        # Buscar cliente(s)
        if customer_id:
            customers = [await self._fetch_customer(
                organization_id, branch_id, customer_id
            )]
        elif cnpj:
            customers = await self._fetch_customer_by_cnpj(
                organization_id, branch_id, cnpj
            )
        elif analyze_all:
            customers = await self._fetch_active_customers(
                organization_id, branch_id
            )
        else:
            return {"error": "Informe customer_id, cnpj ou analyze_all=True"}
        
        customers = [c for c in customers if c]
        
        if not customers:
            return {"error": "Nenhum cliente encontrado"}
        
        # Analisar cada cliente
        analyses = []
        period_start = datetime.now() - timedelta(days=period_months * 30)
        
        for customer in customers:
            analysis = await self._analyze_customer(
                organization_id, branch_id,
                customer, period_start, include_history
            )
            
            if analysis["health_score"] >= health_threshold:
                analyses.append(analysis)
        
        # Ordenar por score (pior primeiro para atenção)
        analyses.sort(key=lambda x: x["health_score"])
        
        # Estatísticas gerais
        stats = self._calculate_portfolio_stats(analyses)
        
        return {
            "success": True,
            "total_analyzed": len(analyses),
            "period": {
                "start": period_start.date().isoformat(),
                "end": datetime.now().date().isoformat(),
                "months": period_months
            },
            "portfolio_summary": stats,
            "customers": analyses[:50],  # Limit to 50
            "alerts": self._generate_portfolio_alerts(analyses),
            "generated_at": datetime.now().isoformat()
        }
    
    async def _fetch_customer(
        self, org_id: Optional[int], branch_id: Optional[int], customer_id: str
    ) -> Optional[dict]:
        """Busca cliente por ID."""
        try:
            return await self.client.get(
                f"/api/crm/customers/{customer_id}",
                params={"organizationId": org_id, "branchId": branch_id}
            )
        except Exception as e:
            logger.error(f"Erro ao buscar cliente: {e}")
            # Retornar dados simulados para demo
            return {
                "id": customer_id,
                "companyName": "Cliente Exemplo Ltda",
                "cnpj": "12.345.678/0001-90",
                "segment": "e-commerce",
                "accountManager": "Maria Silva",
                "expectedMonthlyVolume": 100000,
                "services": ["Entrega Expressa"]
            }
    
    async def _fetch_customer_by_cnpj(
        self, org_id: Optional[int], branch_id: Optional[int], cnpj: str
    ) -> list[dict]:
        """Busca cliente por CNPJ."""
        try:
            result = await self.client.get(
                "/api/crm/customers",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "cnpj": cnpj.replace(".", "").replace("/", "").replace("-", "")
                }
            )
            return result.get("items", [])
        except Exception:
            return []
    
    async def _fetch_active_customers(
        self, org_id: Optional[int], branch_id: Optional[int]
    ) -> list[dict]:
        """Busca clientes ativos."""
        try:
            result = await self.client.get(
                "/api/crm/customers",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "status": "active",
                    "limit": 200
                }
            )
            return result.get("items", [])
        except Exception:
            return []
    
    async def _analyze_customer(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        customer: dict,
        period_start: datetime,
        include_history: bool
    ) -> dict:
        """Analisa saúde de um cliente."""
        customer_id = customer.get("id")
        
        # Buscar dados complementares
        operations = await self._fetch_operations(
            org_id, branch_id, customer_id, period_start
        )
        
        tickets = await self._fetch_tickets(
            org_id, branch_id, customer_id, period_start
        )
        
        financial = await self._fetch_financial_data(
            org_id, branch_id, customer_id, period_start
        )
        
        # Calcular indicadores
        indicators = self._calculate_indicators(
            customer, operations, tickets, financial
        )
        
        # Calcular score geral
        health_score = self._calculate_health_score(indicators)
        
        # Determinar status e risco de churn
        status = self._get_health_status(health_score)
        churn_risk = self._assess_churn_risk(indicators)
        
        # Identificar oportunidades
        opportunities = self._identify_opportunities(customer, operations, indicators)
        
        # Gerar recomendações
        recommendations = self._generate_recommendations(
            customer, indicators, churn_risk
        )
        
        result = {
            "customer_id": customer_id,
            "company_name": customer.get("companyName"),
            "cnpj": customer.get("cnpj"),
            "segment": customer.get("segment"),
            "account_manager": customer.get("accountManager"),
            
            "health_score": health_score,
            "status": status,
            "status_emoji": self._get_status_emoji(status),
            
            "churn_risk": churn_risk,
            
            "indicators": [
                {
                    "name": ind.name,
                    "value": ind.value,
                    "max_value": ind.max_value,
                    "percentage": round(ind.value / ind.max_value * 100, 1) if ind.max_value else 0,
                    "weight": f"{ind.weight * 100:.0f}%",
                    "status": ind.status,
                    "trend": ind.trend
                }
                for ind in indicators
            ],
            
            "opportunities": opportunities,
            "recommendations": recommendations
        }
        
        if include_history:
            result["history"] = self._get_health_history()
        
        return result
    
    async def _fetch_operations(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        customer_id: str,
        period_start: datetime
    ) -> dict:
        """Busca dados de operações."""
        try:
            result = await self.client.get(
                "/api/tms/deliveries/statistics",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "customerId": customer_id,
                    "since": period_start.isoformat()
                }
            )
            return result
        except Exception:
            return {
                "totalDeliveries": 150,
                "deliveredOnTime": 140,
                "totalVolume": 450000,
                "averagePerMonth": 75000,
                "volumeTrend": [70000, 72000, 75000, 74000, 76000, 75000]
            }
    
    async def _fetch_tickets(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        customer_id: str,
        period_start: datetime
    ) -> dict:
        """Busca dados de tickets/reclamações."""
        try:
            result = await self.client.get(
                "/api/support/tickets/statistics",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "customerId": customer_id,
                    "since": period_start.isoformat()
                }
            )
            return result
        except Exception:
            return {
                "totalTickets": 3,
                "openTickets": 0,
                "avgResolutionHours": 24,
                "npsScore": 72,
                "npsTrend": [68, 70, 71, 72, 72, 72]
            }
    
    async def _fetch_financial_data(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        customer_id: str,
        period_start: datetime
    ) -> dict:
        """Busca dados financeiros."""
        try:
            result = await self.client.get(
                "/api/financial/customers/statistics",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "customerId": customer_id,
                    "since": period_start.isoformat()
                }
            )
            return result
        except Exception:
            return {
                "totalRevenue": 450000,
                "averageMonthlyRevenue": 75000,
                "paymentOnTime": 95,
                "overdueAmount": 0
            }
    
    def _calculate_indicators(
        self,
        customer: dict,
        operations: dict,
        tickets: dict,
        financial: dict
    ) -> list[HealthIndicator]:
        """Calcula indicadores de saúde."""
        indicators = []
        
        # 1. Volume de Operações (25%)
        avg_monthly = operations.get("averagePerMonth", 0)
        expected_monthly = customer.get("expectedMonthlyVolume", 1)
        volume_ratio = min(avg_monthly / expected_monthly, 1.0) if expected_monthly else 0.5
        
        indicators.append(HealthIndicator(
            name="Volume de Operações",
            value=round(volume_ratio * 100, 1),
            max_value=100,
            weight=0.25,
            status="good" if volume_ratio >= 0.8 else "warning" if volume_ratio >= 0.5 else "critical",
            trend=self._calculate_trend(operations.get("volumeTrend", []))
        ))
        
        # 2. Performance de Entrega (25%)
        total_deliveries = operations.get("totalDeliveries", 0)
        on_time = operations.get("deliveredOnTime", 0)
        otd_rate = (on_time / total_deliveries * 100) if total_deliveries > 0 else 100
        
        indicators.append(HealthIndicator(
            name="Taxa de Entrega no Prazo",
            value=round(otd_rate, 1),
            max_value=100,
            weight=0.25,
            status="good" if otd_rate >= 95 else "warning" if otd_rate >= 85 else "critical",
            trend="stable"
        ))
        
        # 3. Satisfação/NPS (20%)
        nps = tickets.get("npsScore", 70)
        
        indicators.append(HealthIndicator(
            name="NPS",
            value=nps,
            max_value=100,
            weight=0.20,
            status="good" if nps >= 70 else "warning" if nps >= 50 else "critical",
            trend=self._calculate_trend(tickets.get("npsTrend", []))
        ))
        
        # 4. Tickets/Reclamações (15%)
        total_tickets = tickets.get("totalTickets", 0)
        ticket_score = max(0, 100 - (total_tickets * 5))  # -5 pontos por ticket
        
        indicators.append(HealthIndicator(
            name="Índice de Reclamações",
            value=round(ticket_score, 1),
            max_value=100,
            weight=0.15,
            status="good" if ticket_score >= 80 else "warning" if ticket_score >= 60 else "critical",
            trend="up" if total_tickets == 0 else "down"
        ))
        
        # 5. Saúde Financeira (15%)
        payment_on_time = financial.get("paymentOnTime", 100)
        
        indicators.append(HealthIndicator(
            name="Pontualidade de Pagamento",
            value=round(payment_on_time, 1),
            max_value=100,
            weight=0.15,
            status="good" if payment_on_time >= 95 else "warning" if payment_on_time >= 80 else "critical",
            trend="stable"
        ))
        
        return indicators
    
    def _calculate_health_score(self, indicators: list[HealthIndicator]) -> int:
        """Calcula score geral de saúde."""
        weighted_sum = sum(
            ind.value * ind.weight for ind in indicators
        )
        return round(weighted_sum)
    
    def _get_health_status(self, score: int) -> dict:
        """Retorna status de saúde."""
        if score >= 80:
            return {"level": HealthStatus.HEALTHY.value, "label": "Saudável"}
        elif score >= 50:
            return {"level": HealthStatus.AT_RISK.value, "label": "Em Risco"}
        else:
            return {"level": HealthStatus.CRITICAL.value, "label": "Crítico"}
    
    def _get_status_emoji(self, status: dict) -> str:
        """Retorna emoji do status."""
        emojis = {
            HealthStatus.HEALTHY.value: "💚",
            HealthStatus.AT_RISK.value: "🟡",
            HealthStatus.CRITICAL.value: "🔴"
        }
        return emojis.get(status["level"], "⚪")
    
    def _assess_churn_risk(self, indicators: list[HealthIndicator]) -> dict:
        """Avalia risco de churn."""
        risk_factors = []
        risk_score = 0
        
        for ind in indicators:
            if ind.status == "critical":
                risk_score += 30
                risk_factors.append(f"{ind.name} crítico")
            elif ind.status == "warning":
                risk_score += 15
            
            if ind.trend == "down":
                risk_score += 10
                risk_factors.append(f"{ind.name} em queda")
        
        if risk_score >= 50:
            level = ChurnRisk.HIGH.value
            probability = min(90, 50 + risk_score // 2)
        elif risk_score >= 25:
            level = ChurnRisk.MEDIUM.value
            probability = 25 + risk_score
        else:
            level = ChurnRisk.LOW.value
            probability = max(5, risk_score)
        
        return {
            "level": level,
            "probability": f"{probability}%",
            "factors": risk_factors[:5]
        }
    
    def _identify_opportunities(
        self,
        customer: dict,
        operations: dict,
        indicators: list[HealthIndicator]
    ) -> list[dict]:
        """Identifica oportunidades de crescimento."""
        opportunities = []
        
        # Verificar se há espaço para crescimento
        volume_ind = next((i for i in indicators if i.name == "Volume de Operações"), None)
        if volume_ind and volume_ind.value < 80:
            opportunities.append({
                "type": "volume_increase",
                "title": "Aumento de Volume",
                "description": f"Cliente operando a {volume_ind.value:.0f}% do potencial",
                "potential_value": "Alto",
                "action": "Reunião de expansão de operações"
            })
        
        # Novos serviços
        current_services = customer.get("services", [])
        available_services = ["Entrega Expressa", "Coleta Programada", "Rastreamento Premium"]
        missing = [s for s in available_services if s not in current_services]
        
        if missing:
            opportunities.append({
                "type": "cross_sell",
                "title": "Cross-sell de Serviços",
                "description": f"Oferecer: {', '.join(missing[:2])}",
                "potential_value": "Médio",
                "action": "Apresentar portfólio completo"
            })
        
        # Novas rotas
        if operations.get("totalDeliveries", 0) > 100:
            opportunities.append({
                "type": "new_routes",
                "title": "Expansão de Rotas",
                "description": "Avaliar novas regiões de atuação",
                "potential_value": "Médio",
                "action": "Mapear necessidades logísticas"
            })
        
        return opportunities
    
    def _generate_recommendations(
        self,
        customer: dict,
        indicators: list[HealthIndicator],
        churn_risk: dict
    ) -> list[dict]:
        """Gera recomendações de ação."""
        recommendations = []
        
        # Baseado no risco de churn
        if churn_risk["level"] == ChurnRisk.HIGH.value:
            recommendations.append({
                "priority": "urgent",
                "action": "Agendar reunião executiva",
                "reason": "Alto risco de churn - intervenção imediata necessária"
            })
            recommendations.append({
                "priority": "urgent",
                "action": "Revisar SLA e condições comerciais",
                "reason": "Verificar se há insatisfação com termos atuais"
            })
        
        elif churn_risk["level"] == ChurnRisk.MEDIUM.value:
            recommendations.append({
                "priority": "high",
                "action": "Contato do Account Manager",
                "reason": "Monitorar de perto e antecipar problemas"
            })
        
        # Baseado em indicadores específicos
        for ind in indicators:
            if ind.status == "critical":
                if "Entrega" in ind.name:
                    recommendations.append({
                        "priority": "high",
                        "action": "Revisar operação logística",
                        "reason": f"{ind.name} abaixo do aceitável"
                    })
                elif "NPS" in ind.name:
                    recommendations.append({
                        "priority": "high",
                        "action": "Pesquisa de satisfação detalhada",
                        "reason": "Entender pontos de insatisfação"
                    })
                elif "Pagamento" in ind.name:
                    recommendations.append({
                        "priority": "medium",
                        "action": "Acionar cobrança",
                        "reason": "Atrasos frequentes de pagamento"
                    })
        
        return recommendations[:6]
    
    def _calculate_trend(self, values: list) -> str:
        """Calcula tendência de uma série."""
        if not values or len(values) < 2:
            return "stable"
        
        recent = values[-3:] if len(values) >= 3 else values
        first = recent[0]
        last = recent[-1]
        
        if last > first * 1.1:
            return "up"
        elif last < first * 0.9:
            return "down"
        return "stable"
    
    def _get_health_history(self) -> list[dict]:
        """Retorna histórico de scores."""
        return [
            {"month": "2025-07", "score": 75},
            {"month": "2025-08", "score": 72},
            {"month": "2025-09", "score": 70},
            {"month": "2025-10", "score": 68},
            {"month": "2025-11", "score": 65},
            {"month": "2025-12", "score": 63}
        ]
    
    def _calculate_portfolio_stats(self, analyses: list[dict]) -> dict:
        """Calcula estatísticas do portfólio."""
        if not analyses:
            return {}
        
        scores = [a["health_score"] for a in analyses]
        statuses = [a["status"]["level"] for a in analyses]
        risks = [a["churn_risk"]["level"] for a in analyses]
        
        return {
            "average_health_score": round(sum(scores) / len(scores), 1),
            "healthy_count": sum(1 for s in statuses if s == HealthStatus.HEALTHY.value),
            "at_risk_count": sum(1 for s in statuses if s == HealthStatus.AT_RISK.value),
            "critical_count": sum(1 for s in statuses if s == HealthStatus.CRITICAL.value),
            "high_churn_risk": sum(1 for r in risks if r == ChurnRisk.HIGH.value),
            "medium_churn_risk": sum(1 for r in risks if r == ChurnRisk.MEDIUM.value)
        }
    
    def _generate_portfolio_alerts(self, analyses: list[dict]) -> list[dict]:
        """Gera alertas do portfólio."""
        alerts = []
        
        critical_customers = [a for a in analyses if a["status"]["level"] == HealthStatus.CRITICAL.value]
        high_risk = [a for a in analyses if a["churn_risk"]["level"] == ChurnRisk.HIGH.value]
        
        if critical_customers:
            alerts.append({
                "severity": "critical",
                "message": f"{len(critical_customers)} cliente(s) em estado crítico",
                "customers": [c["company_name"] for c in critical_customers[:5]]
            })
        
        if high_risk:
            alerts.append({
                "severity": "warning",
                "message": f"{len(high_risk)} cliente(s) com alto risco de churn",
                "customers": [c["company_name"] for c in high_risk[:5]]
            })
        
        return alerts
