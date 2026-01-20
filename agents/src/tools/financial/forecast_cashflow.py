"""
Tool para previsão de fluxo de caixa.

Analisa títulos em aberto e projeta entradas/saídas.
"""

from typing import Any, Optional
from datetime import date, timedelta
from pydantic import BaseModel, Field

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class ForecastCashflowInput(BaseModel):
    """Input para previsão de fluxo de caixa."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days_ahead: int = Field(default=30, ge=1, le=365)
    include_provisioned: bool = Field(default=True)


class ForecastCashflowTool:
    """Previsão de fluxo de caixa."""
    
    name = "forecast_cashflow"
    description = "Projeta entradas e saídas de caixa para período futuro, identificando gaps de liquidez"
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def execute(
        self,
        organization_id: int,
        branch_id: int,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        days_ahead: int = 30,
        include_provisioned: bool = True,
        **kwargs
    ) -> dict[str, Any]:
        """
        Executa previsão de fluxo de caixa.
        
        Args:
            organization_id: ID da organização
            branch_id: ID da filial
            user_id: ID do usuário
            start_date: Data inicial (default: hoje)
            end_date: Data final (default: hoje + days_ahead)
            days_ahead: Dias à frente para projetar
            include_provisioned: Incluir títulos provisionados
            
        Returns:
            Projeção diária com entradas, saídas, saldo e alertas
        """
        logger.info(
            f"Iniciando forecast_cashflow",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "days_ahead": days_ahead
            }
        )
        
        # Definir período
        start = start_date or date.today()
        end = end_date or (start + timedelta(days=days_ahead))
        
        # Buscar dados
        payables = await self.client.get_payables(
            org_id=organization_id,
            branch_id=branch_id,
            dueDateStart=start.isoformat(),
            dueDateEnd=end.isoformat(),
            status="pending"
        )
        
        receivables = await self.client.get_receivables(
            org_id=organization_id,
            branch_id=branch_id,
            dueDateStart=start.isoformat(),
            dueDateEnd=end.isoformat(),
            status="pending"
        )
        
        current_balance = await self.client.get_bank_balance(
            org_id=organization_id,
            branch_id=branch_id
        )
        
        # Construir projeção diária
        projection = self._build_projection(
            start, end, payables, receivables, current_balance
        )
        
        # Identificar alertas
        alerts = self._identify_alerts(projection)
        
        # Calcular resumo
        summary = self._calculate_summary(projection)
        
        return {
            "period": {
                "start": start.isoformat(),
                "end": end.isoformat(),
                "days": (end - start).days
            },
            "current_balance": current_balance,
            "projection": projection,
            "summary": summary,
            "alerts": alerts,
            "metadata": {
                "organization_id": organization_id,
                "branch_id": branch_id,
                "payables_count": len(payables),
                "receivables_count": len(receivables)
            }
        }
    
    def _build_projection(
        self,
        start: date,
        end: date,
        payables: list[dict],
        receivables: list[dict],
        initial_balance: float
    ) -> list[dict]:
        """Constrói projeção diária."""
        projection = []
        running_balance = initial_balance
        current = start
        
        while current <= end:
            date_str = current.isoformat()
            
            # Saídas do dia
            day_out = sum(
                p.get("amount", 0) 
                for p in payables 
                if p.get("dueDate", "")[:10] == date_str
            )
            
            # Entradas do dia
            day_in = sum(
                r.get("amount", 0)
                for r in receivables
                if r.get("dueDate", "")[:10] == date_str
            )
            
            running_balance = running_balance + day_in - day_out
            
            projection.append({
                "date": date_str,
                "inflows": round(day_in, 2),
                "outflows": round(day_out, 2),
                "net": round(day_in - day_out, 2),
                "balance": round(running_balance, 2)
            })
            
            current += timedelta(days=1)
        
        return projection
    
    def _identify_alerts(self, projection: list[dict]) -> list[dict]:
        """Identifica alertas de liquidez."""
        alerts = []
        
        for day in projection:
            if day["balance"] < 0:
                alerts.append({
                    "type": "negative_balance",
                    "severity": "critical",
                    "date": day["date"],
                    "message": f"Saldo negativo: R$ {day['balance']:,.2f}",
                    "action": "Antecipar recebíveis ou renegociar pagamentos"
                })
            elif day["outflows"] > 0 and day["balance"] < day["outflows"] * 0.2:
                alerts.append({
                    "type": "low_balance",
                    "severity": "warning",
                    "date": day["date"],
                    "message": f"Saldo baixo: R$ {day['balance']:,.2f}",
                    "action": "Monitorar entradas"
                })
        
        return alerts
    
    def _calculate_summary(self, projection: list[dict]) -> dict:
        """Calcula resumo do período."""
        if not projection:
            return {}
        
        total_in = sum(d["inflows"] for d in projection)
        total_out = sum(d["outflows"] for d in projection)
        min_bal = min(d["balance"] for d in projection)
        max_bal = max(d["balance"] for d in projection)
        
        return {
            "total_inflows": round(total_in, 2),
            "total_outflows": round(total_out, 2),
            "net_flow": round(total_in - total_out, 2),
            "min_balance": round(min_bal, 2),
            "max_balance": round(max_bal, 2),
            "final_balance": round(projection[-1]["balance"], 2),
            "days_negative": sum(1 for d in projection if d["balance"] < 0)
        }
