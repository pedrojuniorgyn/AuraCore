"""
Tool: Account Reconciliation
Conciliação de contas contábeis.

Risk Level: LOW (apenas consulta e sugestões)

Tipos de conciliação:
- Bancária: Extrato x Razão
- Intercompany: Contas entre filiais
- Clientes/Fornecedores: Confirmação de saldos
"""

from typing import Any, Optional
from datetime import date
from decimal import Decimal
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


@dataclass
class ReconciliationItem:
    """Item de conciliação."""
    item_date: date
    description: str
    document: Optional[str]
    book_amount: Decimal
    external_amount: Decimal
    difference: Decimal
    status: str  # MATCHED, UNMATCHED_BOOK, UNMATCHED_EXTERNAL, PARTIAL
    suggested_action: Optional[str]


class AccountReconciliationTool:
    """Conciliação de contas contábeis."""
    
    name = "account_reconciliation"
    description = """
    Executa conciliação de conta contábil.
    
    Parâmetros:
    - reconciliation_type: BANK (bancária), INTERCOMPANY, CUSTOMER, SUPPLIER
    - account_code: Código da conta contábil (ex: 1.1.1.01)
    - start_date: Data inicial (YYYY-MM-DD)
    - end_date: Data final (YYYY-MM-DD)
    - bank_account_id: ID da conta bancária (para tipo BANK)
    - counterpart_branch_id: ID da filial contraparte (para tipo INTERCOMPANY)
    
    Retorna:
    - Saldo no livro vs saldo externo
    - Diferença e taxa de conciliação
    - Itens pendentes com sugestões de ação
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        reconciliation_type: str,
        account_code: str,
        start_date: str,
        end_date: str,
        bank_account_id: Optional[int] = None,
        counterpart_branch_id: Optional[int] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Executa conciliação de conta contábil.
        
        Args:
            reconciliation_type: Tipo de conciliação
            account_code: Código da conta
            start_date: Data inicial
            end_date: Data final
            bank_account_id: ID da conta bancária
            counterpart_branch_id: ID da filial contraparte
            
        Returns:
            Resultado da conciliação com itens e sugestões
        """
        period_str = f"{start_date} a {end_date}"
        
        logger.info(
            "account_reconciliation_started",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "type": reconciliation_type,
                "account": account_code,
                "period": period_str
            }
        )
        
        # Validar tipo
        valid_types = ["BANK", "INTERCOMPANY", "CUSTOMER", "SUPPLIER"]
        if reconciliation_type not in valid_types:
            return {
                "success": False,
                "error": f"Tipo inválido. Use: {', '.join(valid_types)}"
            }
        
        # Validar datas
        try:
            parsed_start = date.fromisoformat(start_date)
            parsed_end = date.fromisoformat(end_date)
        except ValueError:
            return {"success": False, "error": "Datas inválidas. Use formato YYYY-MM-DD"}
        
        if parsed_start > parsed_end:
            return {"success": False, "error": "Data inicial não pode ser maior que data final"}
        
        # Simulação de dados para demonstração
        items = [
            ReconciliationItem(
                item_date=date(2025, 1, 15),
                description="Pagamento Fornecedor ABC",
                document="NF-001234",
                book_amount=Decimal("-5000.00"),
                external_amount=Decimal("-5000.00"),
                difference=Decimal("0"),
                status="MATCHED",
                suggested_action=None
            ),
            ReconciliationItem(
                item_date=date(2025, 1, 18),
                description="Recebimento Cliente XYZ",
                document="NF-005678",
                book_amount=Decimal("8500.00"),
                external_amount=Decimal("8500.00"),
                difference=Decimal("0"),
                status="MATCHED",
                suggested_action=None
            ),
            ReconciliationItem(
                item_date=date(2025, 1, 20),
                description="Tarifa Bancária",
                document=None,
                book_amount=Decimal("0"),
                external_amount=Decimal("-45.00"),
                difference=Decimal("-45.00"),
                status="UNMATCHED_EXTERNAL",
                suggested_action="Criar lançamento de tarifa bancária"
            ),
            ReconciliationItem(
                item_date=date(2025, 1, 22),
                description="Transferência Interna",
                document="TRF-001",
                book_amount=Decimal("-10000.00"),
                external_amount=Decimal("0"),
                difference=Decimal("-10000.00"),
                status="UNMATCHED_BOOK",
                suggested_action="Verificar se transferência foi processada pelo banco"
            ),
            ReconciliationItem(
                item_date=date(2025, 1, 25),
                description="Pagamento Parcial",
                document="NF-009999",
                book_amount=Decimal("-3000.00"),
                external_amount=Decimal("-2500.00"),
                difference=Decimal("-500.00"),
                status="PARTIAL",
                suggested_action="Verificar se há desconto ou diferença cambial"
            ),
        ]
        
        # Calcular estatísticas
        matched = [i for i in items if i.status == "MATCHED"]
        unmatched_book = [i for i in items if i.status == "UNMATCHED_BOOK"]
        unmatched_external = [i for i in items if i.status == "UNMATCHED_EXTERNAL"]
        partial = [i for i in items if i.status == "PARTIAL"]
        
        book_balance = sum(i.book_amount for i in items)
        external_balance = sum(i.external_amount for i in items)
        difference = book_balance - external_balance
        
        reconciliation_rate = (len(matched) / len(items) * 100) if items else 0
        
        # Gerar sugestões
        auto_match_suggestions = []
        pending_actions = []
        
        for item in items:
            if item.suggested_action:
                pending_actions.append(
                    f"{item.item_date.isoformat()}: {item.suggested_action}"
                )
        
        if unmatched_external:
            auto_match_suggestions.append(
                f"Importar {len(unmatched_external)} transações do extrato para o razão"
            )
        
        if difference != 0:
            auto_match_suggestions.append(
                f"Diferença de R$ {abs(difference):,.2f} requer análise manual"
            )
        
        logger.info(
            "account_reconciliation_complete",
            account=account_code,
            total_items=len(items),
            matched=len(matched),
            reconciliation_rate=f"{reconciliation_rate:.1f}%"
        )
        
        return {
            "success": True,
            "reconciliation_type": reconciliation_type,
            "account_code": account_code,
            "period": period_str,
            "book_balance": float(book_balance),
            "external_balance": float(external_balance),
            "difference": float(difference),
            "total_items": len(items),
            "matched_items": len(matched),
            "unmatched_book_items": len(unmatched_book),
            "unmatched_external_items": len(unmatched_external),
            "partial_items": len(partial),
            "reconciliation_rate": round(reconciliation_rate, 2),
            "items": [
                {
                    "date": item.item_date.isoformat(),
                    "description": item.description,
                    "document": item.document,
                    "book_amount": float(item.book_amount),
                    "external_amount": float(item.external_amount),
                    "difference": float(item.difference),
                    "status": item.status,
                    "suggested_action": item.suggested_action
                }
                for item in items
            ],
            "auto_match_suggestions": auto_match_suggestions,
            "pending_actions": pending_actions,
            "message": f"Conciliação concluída: {reconciliation_rate:.1f}% das transações conciliadas"
        }
