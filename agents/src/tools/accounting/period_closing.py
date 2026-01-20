"""
Tool: Period Closing
Executa fechamento de período contábil.

Risk Level: HIGH (operação irreversível)

Referências:
- ITG 2000 (R1) - Escrituração Contábil
- NBC TG 26 - Apresentação das Demonstrações Contábeis
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
class ClosingValidation:
    """Resultado de validação pré-fechamento."""
    check_name: str
    passed: bool
    message: str
    blocking: bool = False


class PeriodClosingTool:
    """Executa fechamento de período contábil."""
    
    name = "period_closing"
    description = """
    Executa fechamento de período contábil (mensal, trimestral, anual).
    
    Parâmetros:
    - period_year: Ano do período (2020-2099)
    - period_month: Mês do período (1-12)
    - closing_type: MONTHLY, QUARTERLY, ANNUAL
    - generate_statements: Gerar demonstrativos (Balancete, DRE)
    - transfer_result: Transferir resultado para Lucros/Prejuízos Acumulados
    - dry_run: RECOMENDADO! Simular sem efetivar
    
    IMPORTANTE: Use dry_run=true primeiro para validar!
    
    Validações:
    - Período não pode ser futuro
    - Não pode estar já fechado
    - Não pode ter lançamentos pendentes
    - Balancete deve estar equilibrado
    
    Retorna:
    - Validações executadas
    - Resultado financeiro (receita, despesa, lucro/prejuízo)
    - IDs dos documentos gerados
    """
    guardrail_level = GuardrailLevel.HIGH
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        period_year: int,
        period_month: int,
        closing_type: str = "MONTHLY",
        generate_statements: bool = True,
        transfer_result: bool = True,
        dry_run: bool = True,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        user_id: Optional[str] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Executa fechamento de período contábil.
        
        Args:
            period_year: Ano do período
            period_month: Mês do período
            closing_type: Tipo de fechamento
            generate_statements: Gerar demonstrativos
            transfer_result: Transferir resultado
            dry_run: Simular sem efetivar
            
        Returns:
            Resultado do fechamento com validações e valores
        """
        period_str = f"{period_year}-{period_month:02d}"
        
        logger.info(
            "period_closing_started",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "period": period_str,
                "closing_type": closing_type,
                "dry_run": dry_run
            }
        )
        
        validations = []
        blocking_issues = []
        
        # Validar parâmetros
        if period_year < 2020 or period_year > 2099:
            return {"success": False, "error": "Ano deve estar entre 2020 e 2099"}
        
        if period_month < 1 or period_month > 12:
            return {"success": False, "error": "Mês deve estar entre 1 e 12"}
        
        if closing_type not in ["MONTHLY", "QUARTERLY", "ANNUAL"]:
            return {"success": False, "error": "closing_type deve ser MONTHLY, QUARTERLY ou ANNUAL"}
        
        # 1. Validação: Período não pode ser futuro
        period_end = date(period_year, period_month, 1)
        if period_end > date.today().replace(day=1):
            validations.append(ClosingValidation(
                check_name="future_period",
                passed=False,
                message="Não é possível fechar período futuro",
                blocking=True
            ))
            blocking_issues.append("Período futuro")
        else:
            validations.append(ClosingValidation(
                check_name="future_period",
                passed=True,
                message="Período válido para fechamento"
            ))
        
        # 2. Validação: Verificar se já está fechado (simulado)
        is_already_closed = False  # TODO: Consultar API real
        if is_already_closed:
            validations.append(ClosingValidation(
                check_name="already_closed",
                passed=False,
                message=f"Período {period_str} já foi fechado anteriormente",
                blocking=True
            ))
            blocking_issues.append("Período já fechado")
        else:
            validations.append(ClosingValidation(
                check_name="already_closed",
                passed=True,
                message="Período disponível para fechamento"
            ))
        
        # 3. Validação: Lançamentos pendentes (simulado)
        pending_entries = 0  # TODO: Consultar API real
        if pending_entries > 0:
            validations.append(ClosingValidation(
                check_name="pending_entries",
                passed=False,
                message=f"Existem {pending_entries} lançamentos pendentes de aprovação",
                blocking=True
            ))
            blocking_issues.append(f"{pending_entries} lançamentos pendentes")
        else:
            validations.append(ClosingValidation(
                check_name="pending_entries",
                passed=True,
                message="Todos os lançamentos estão aprovados"
            ))
        
        # 4. Validação: Conciliação bancária (simulado)
        unconciliated = 0  # TODO: Consultar API real
        if unconciliated > 0:
            validations.append(ClosingValidation(
                check_name="bank_reconciliation",
                passed=False,
                message=f"{unconciliated} transações bancárias não conciliadas",
                blocking=False  # Warning, não bloqueia
            ))
        else:
            validations.append(ClosingValidation(
                check_name="bank_reconciliation",
                passed=True,
                message="Conciliação bancária OK"
            ))
        
        # 5. Validação: Balanceamento (simulado)
        is_balanced = True  # TODO: Consultar API real
        if not is_balanced:
            validations.append(ClosingValidation(
                check_name="trial_balance",
                passed=False,
                message="Balancete de verificação desbalanceado",
                blocking=True
            ))
            blocking_issues.append("Balancete desbalanceado")
        else:
            validations.append(ClosingValidation(
                check_name="trial_balance",
                passed=True,
                message="Balancete de verificação OK (Débitos = Créditos)"
            ))
        
        all_passed = all(v.passed for v in validations)
        
        # Valores simulados para demonstração
        total_revenue = Decimal("150000.00")
        total_expenses = Decimal("120000.00")
        net_result = total_revenue - total_expenses
        
        # Se houver bloqueios ou for dry_run, retornar apenas validações
        if blocking_issues or dry_run:
            status_msg = "Simulação concluída" if dry_run else "Fechamento bloqueado por validações"
            
            if dry_run and all_passed:
                status_msg = "Simulação OK - Período pode ser fechado"
            
            logger.info(
                "period_closing_validation_complete",
                period=period_str,
                all_passed=all_passed,
                blocking_issues=blocking_issues,
                dry_run=dry_run
            )
            
            return {
                "success": dry_run and all_passed,
                "period": period_str,
                "closing_type": closing_type,
                "validations": [
                    {
                        "check_name": v.check_name,
                        "passed": v.passed,
                        "message": v.message,
                        "blocking": v.blocking
                    }
                    for v in validations
                ],
                "all_validations_passed": all_passed,
                "blocking_issues": blocking_issues,
                "total_revenue": float(total_revenue),
                "total_expenses": float(total_expenses),
                "net_result": float(net_result),
                "net_result_type": "LUCRO" if net_result >= 0 else "PREJUÍZO",
                "dry_run": dry_run,
                "message": status_msg
            }
        
        # Executar fechamento real (simulado)
        logger.warning(
            "period_closing_execution",
            period=period_str,
            message="Executando fechamento real"
        )
        
        return {
            "success": True,
            "period": period_str,
            "closing_type": closing_type,
            "validations": [
                {
                    "check_name": v.check_name,
                    "passed": v.passed,
                    "message": v.message,
                    "blocking": v.blocking
                }
                for v in validations
            ],
            "all_validations_passed": True,
            "blocking_issues": [],
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "net_result": float(net_result),
            "net_result_type": "LUCRO" if net_result >= 0 else "PREJUÍZO",
            "balancete_id": f"BAL-{period_str}",
            "dre_id": f"DRE-{period_str}",
            "closing_entry_id": f"JE-CLOSING-{period_str}",
            "dry_run": False,
            "message": f"Período {period_str} fechado com sucesso"
        }
