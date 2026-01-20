"""
Tool: Journal Entry Generator
Gera lançamentos contábeis seguindo o método das partidas dobradas.

Risk Level: MEDIUM (cria registros)

Referências:
- ITG 2000 (R1) - Escrituração Contábil
- CPC 00 - Estrutura Conceitual
"""

import re
from typing import Any, Optional
from datetime import date, datetime
from decimal import Decimal
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


@dataclass
class JournalEntryLine:
    """Linha de lançamento contábil."""
    account_code: str
    account_name: Optional[str]
    debit_amount: Decimal
    credit_amount: Decimal
    cost_center_id: Optional[int]
    memo: Optional[str]


class JournalEntryGeneratorTool:
    """Gera lançamentos contábeis no método partidas dobradas."""
    
    name = "journal_entry_generator"
    description = """
    Gera lançamento contábil seguindo o método das partidas dobradas.
    
    Parâmetros:
    - entry_date: Data do lançamento (YYYY-MM-DD)
    - description: Descrição/histórico do lançamento
    - document_type: Tipo (NFE, CTE, PAYMENT, RECEIPT, MANUAL, PROVISION, ADJUSTMENT)
    - document_id: ID do documento relacionado (opcional)
    - lines: Lista de linhas com account_code, debit_amount, credit_amount
    
    Validações:
    - Total de débitos DEVE ser igual ao total de créditos
    - Cada linha deve ter débito OU crédito (não ambos)
    - Códigos de conta no formato padrão (1.1.1.01)
    
    Retorna:
    - entry_id e entry_number se sucesso
    - validation_errors se houver problemas
    """
    guardrail_level = GuardrailLevel.MEDIUM
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        entry_date: str,
        description: str,
        document_type: str,
        lines: list[dict],
        document_id: Optional[str] = None,
        reference: Optional[str] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        user_id: Optional[str] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Gera lançamento contábil.
        
        Args:
            entry_date: Data do lançamento
            description: Descrição/histórico
            document_type: Tipo de documento
            lines: Linhas do lançamento
            document_id: ID do documento relacionado
            reference: Referência externa
            
        Returns:
            Resultado da operação com entry_id ou errors
        """
        logger.info(
            "Iniciando journal_entry_generator",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "document_type": document_type,
                "lines_count": len(lines)
            }
        )
        
        validation_errors = []
        warnings = []
        
        # Parse date
        try:
            parsed_date = date.fromisoformat(entry_date)
        except ValueError:
            return {"success": False, "error": f"Data inválida: {entry_date}. Use formato YYYY-MM-DD"}
        
        # Parse lines
        parsed_lines = []
        for i, line in enumerate(lines, 1):
            debit = Decimal(str(line.get("debit_amount", 0) or 0))
            credit = Decimal(str(line.get("credit_amount", 0) or 0))
            
            parsed_lines.append(JournalEntryLine(
                account_code=line.get("account_code", ""),
                account_name=line.get("account_name"),
                debit_amount=debit,
                credit_amount=credit,
                cost_center_id=line.get("cost_center_id"),
                memo=line.get("memo")
            ))
        
        # Validações
        if len(parsed_lines) < 2:
            validation_errors.append("Lançamento deve ter no mínimo 2 linhas")
        
        # 1. Calcular totais
        total_debit = sum(l.debit_amount for l in parsed_lines)
        total_credit = sum(l.credit_amount for l in parsed_lines)
        
        # 2. Validar balanceamento
        is_balanced = total_debit == total_credit
        if not is_balanced:
            diff = abs(total_debit - total_credit)
            validation_errors.append(
                f"Lançamento desbalanceado: Débito=R$ {total_debit:,.2f}, "
                f"Crédito=R$ {total_credit:,.2f}, Diferença=R$ {diff:,.2f}"
            )
        
        # 3. Validar linhas individuais
        for i, line in enumerate(parsed_lines, 1):
            # Cada linha deve ter débito OU crédito
            if line.debit_amount > 0 and line.credit_amount > 0:
                validation_errors.append(
                    f"Linha {i}: Não pode ter débito e crédito simultaneamente"
                )
            
            if line.debit_amount == 0 and line.credit_amount == 0:
                validation_errors.append(
                    f"Linha {i}: Deve ter débito ou crédito informado"
                )
            
            # Validar formato do código da conta
            if not self._validate_account_code(line.account_code):
                validation_errors.append(
                    f"Linha {i}: Código de conta inválido '{line.account_code}'"
                )
        
        # 4. Validar data
        if parsed_date > date.today():
            warnings.append("Data do lançamento é futura - verifique se é intencional")
        
        # 5. Se houver erros, retornar sem criar
        if validation_errors:
            logger.warning(
                "journal_entry_validation_failed",
                errors=validation_errors
            )
            return {
                "success": False,
                "total_debit": float(total_debit),
                "total_credit": float(total_credit),
                "is_balanced": is_balanced,
                "validation_errors": validation_errors,
                "warnings": warnings,
                "message": "Validação falhou - lançamento não criado"
            }
        
        # 6. Gerar lançamento (simular - em produção, chama API do AuraCore)
        entry_id = f"JE-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        entry_number = f"{parsed_date.year}-{entry_id[-6:]}"
        
        logger.info(
            "journal_entry_generated",
            entry_id=entry_id,
            entry_number=entry_number,
            total_debit=float(total_debit),
            total_credit=float(total_credit)
        )
        
        return {
            "success": True,
            "entry_id": entry_id,
            "entry_number": entry_number,
            "entry_date": entry_date,
            "description": description,
            "document_type": document_type,
            "document_id": document_id,
            "total_debit": float(total_debit),
            "total_credit": float(total_credit),
            "is_balanced": True,
            "lines_count": len(parsed_lines),
            "validation_errors": [],
            "warnings": warnings,
            "message": f"Lançamento {entry_number} criado com sucesso"
        }
    
    def _validate_account_code(self, code: str) -> bool:
        """
        Valida formato do código de conta contábil.
        
        Formatos aceitos:
        - 1.1.1.01 (Plano de contas tradicional)
        - 1.01.001.0001 (SPED)
        """
        if not code:
            return False
        # Padrão flexível: dígitos separados por pontos
        pattern = r'^\d+(\.\d+)+$'
        return bool(re.match(pattern, code))
