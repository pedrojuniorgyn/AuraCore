"""
Tool para sugestão de pagamentos otimizados.

Prioriza pagamentos considerando:
- Criticidade (impostos, folha)
- Descontos por antecipação
- Fluxo de caixa disponível
"""

from typing import Any, Optional
from datetime import date, timedelta
from enum import Enum

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class Priority(str, Enum):
    """Prioridades de pagamento."""
    CRITICAL = "critical"  # Impostos, folha
    HIGH = "high"          # Fornecedores estratégicos
    MEDIUM = "medium"      # Regulares
    LOW = "low"            # Flexível


class SuggestPaymentsTool:
    """Sugestão inteligente de pagamentos."""
    
    name = "suggest_payments"
    description = "Sugere ordem e datas otimizadas para pagamentos considerando fluxo de caixa"
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def execute(
        self,
        organization_id: int,
        branch_id: int,
        user_id: str,
        available_balance: Optional[float] = None,
        target_date: Optional[date] = None,
        max_suggestions: int = 20,
        consider_discounts: bool = True,
        **kwargs
    ) -> dict[str, Any]:
        """
        Gera sugestões de pagamento.
        
        Args:
            available_balance: Saldo disponível (busca automaticamente se None)
            target_date: Data alvo
            max_suggestions: Máximo de sugestões
            consider_discounts: Considerar descontos por antecipação
            
        Returns:
            Lista priorizada de pagamentos sugeridos
        """
        logger.info(
            f"Iniciando suggest_payments",
            extra={"org_id": organization_id, "branch_id": branch_id}
        )
        
        ref_date = target_date or date.today()
        
        # Buscar saldo se não informado
        if available_balance is None:
            available_balance = await self.client.get_bank_balance(
                org_id=organization_id,
                branch_id=branch_id
            )
        
        # Buscar títulos pendentes (próximos 30 dias)
        payables = await self.client.get_payables(
            org_id=organization_id,
            branch_id=branch_id,
            dueDateEnd=(ref_date + timedelta(days=30)).isoformat(),
            status="pending"
        )
        
        # Priorizar
        prioritized = self._prioritize(payables)
        
        # Selecionar dentro do saldo
        suggestions = self._select(
            prioritized, available_balance, max_suggestions, consider_discounts
        )
        
        # Calcular economia
        savings = self._calculate_savings(suggestions) if consider_discounts else {}
        
        # Gerar alertas
        warnings = self._generate_warnings(payables, suggestions)
        
        return {
            "available_balance": available_balance,
            "target_date": ref_date.isoformat(),
            "total_pending": len(payables),
            "total_pending_amount": round(sum(p.get("amount", 0) for p in payables), 2),
            "suggestions": suggestions,
            "suggested_total": round(sum(s.get("amount", 0) for s in suggestions), 2),
            "remaining_balance": round(
                available_balance - sum(s.get("amount", 0) for s in suggestions), 2
            ),
            "potential_savings": savings,
            "warnings": warnings
        }
    
    def _prioritize(self, payables: list[dict]) -> list[dict]:
        """Classifica por prioridade."""
        today = date.today()
        
        for p in payables:
            cat = p.get("category", "").lower()
            
            # Determinar prioridade base
            if cat in ["imposto", "tax", "folha", "salario", "inss", "fgts"]:
                priority = Priority.CRITICAL
            elif p.get("supplierStrategic"):
                priority = Priority.HIGH
            elif cat in ["servico", "aluguel", "energia", "agua"]:
                priority = Priority.MEDIUM
            else:
                priority = Priority.LOW
            
            # Ajustar por vencimento
            try:
                due = date.fromisoformat(p.get("dueDate", "")[:10])
                days_to_due = (due - today).days
                
                if days_to_due < 0:  # Vencido
                    priority = Priority.CRITICAL
                elif days_to_due <= 3 and priority == Priority.LOW:
                    priority = Priority.MEDIUM
            except ValueError:
                pass
            
            p["_priority"] = priority
            p["_order"] = list(Priority).index(priority)
        
        return sorted(payables, key=lambda x: (x.get("_order", 99), x.get("dueDate", "")))
    
    def _select(
        self,
        prioritized: list[dict],
        available: float,
        max_count: int,
        consider_discounts: bool
    ) -> list[dict]:
        """Seleciona pagamentos dentro do saldo."""
        suggestions = []
        running = 0.0
        
        for p in prioritized:
            if len(suggestions) >= max_count:
                break
            
            amount = p.get("amount", 0)
            discount = 0.0
            
            if consider_discounts and p.get("earlyDiscountRate", 0) > 0:
                discount = self._calc_discount(p)
                amount -= discount
            
            if running + amount <= available:
                suggestions.append({
                    "id": p.get("id"),
                    "supplier": p.get("supplierName", ""),
                    "description": p.get("description", ""),
                    "original_amount": p.get("amount", 0),
                    "discount": round(discount, 2),
                    "amount": round(amount, 2),
                    "due_date": p.get("dueDate", ""),
                    "priority": p.get("_priority", Priority.LOW),
                    "reason": self._get_reason(p, discount)
                })
                running += amount
            elif p.get("_priority") == Priority.CRITICAL:
                # Alertar sobre crítico que não cabe
                suggestions.append({
                    "id": p.get("id"),
                    "supplier": p.get("supplierName", ""),
                    "description": p.get("description", ""),
                    "amount": round(amount, 2),
                    "due_date": p.get("dueDate", ""),
                    "priority": Priority.CRITICAL,
                    "reason": "⚠️ CRÍTICO - Saldo insuficiente!",
                    "warning": True
                })
        
        return suggestions
    
    def _calc_discount(self, payable: dict) -> float:
        """Calcula desconto por antecipação."""
        rate = payable.get("earlyDiscountRate", 0) / 100
        days = payable.get("earlyDiscountDays", 0)
        amount = payable.get("amount", 0)
        
        if rate <= 0 or days <= 0:
            return 0.0
        
        try:
            due = date.fromisoformat(payable.get("dueDate", "")[:10])
            if (due - date.today()).days >= days:
                return amount * rate
        except ValueError:
            pass
        
        return 0.0
    
    def _get_reason(self, p: dict, discount: float) -> str:
        """Gera razão para sugestão."""
        priority = p.get("_priority")
        
        if priority == Priority.CRITICAL:
            return "🔴 Crítico - vencimento iminente ou obrigatório"
        elif priority == Priority.HIGH:
            return "🟡 Fornecedor estratégico"
        elif discount > 0:
            return f"🟢 Desconto de {p.get('earlyDiscountRate')}% por antecipação"
        return "Pagamento regular"
    
    def _calculate_savings(self, suggestions: list[dict]) -> dict:
        """Calcula economia potencial."""
        total_discount = sum(s.get("discount", 0) for s in suggestions)
        total_original = sum(s.get("original_amount", 0) for s in suggestions)
        
        return {
            "total_discount": round(total_discount, 2),
            "percentage": round(total_discount / total_original * 100, 2) if total_original else 0
        }
    
    def _generate_warnings(
        self, all_payables: list[dict], suggestions: list[dict]
    ) -> list[dict]:
        """Gera alertas."""
        warnings = []
        suggested_ids = {s.get("id") for s in suggestions}
        today = date.today()
        
        for p in all_payables:
            if p.get("id") in suggested_ids:
                continue
            
            try:
                due = date.fromisoformat(p.get("dueDate", "")[:10])
                if due < today:
                    warnings.append({
                        "type": "overdue",
                        "severity": "critical",
                        "message": f"Vencido não selecionado: {p.get('description', '')} - R$ {p.get('amount', 0):,.2f}"
                    })
            except ValueError:
                pass
        
        for s in suggestions:
            if s.get("warning"):
                warnings.append({
                    "type": "insufficient_balance",
                    "severity": "critical",
                    "message": f"Saldo insuficiente: {s.get('supplier', '')} - R$ {s.get('amount', 0):,.2f}"
                })
        
        return warnings
