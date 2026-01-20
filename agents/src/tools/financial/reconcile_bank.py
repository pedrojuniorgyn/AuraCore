"""
Tool para conciliação bancária automática.

Compara extratos importados com lançamentos do sistema.
"""

from typing import Any, Optional
from datetime import date
from enum import Enum

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class MatchType(str, Enum):
    """Tipos de match na conciliação."""
    EXACT = "exact"
    PARTIAL = "partial"
    SUGGESTED = "suggested"
    UNMATCHED = "unmatched"


class ReconcileBankTool:
    """Conciliação bancária automática."""
    
    name = "reconcile_bank"
    description = "Concilia extrato bancário com lançamentos, sugerindo matches automáticos"
    guardrail_level = GuardrailLevel.MEDIUM  # Pode modificar dados se auto_reconcile=True
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def execute(
        self,
        organization_id: int,
        branch_id: int,
        user_id: str,
        bank_account_id: str,
        statement_date: Optional[date] = None,
        auto_reconcile: bool = False,
        tolerance_days: int = 2,
        tolerance_amount: float = 0.10,
        **kwargs
    ) -> dict[str, Any]:
        """
        Executa conciliação bancária.
        
        Args:
            bank_account_id: ID da conta bancária
            statement_date: Data do extrato
            auto_reconcile: Se True, concilia matches exatos automaticamente
            tolerance_days: Tolerância de dias para match
            tolerance_amount: Tolerância de valor (R$)
            
        Returns:
            Matches encontrados e estatísticas
        """
        logger.info(
            f"Iniciando reconcile_bank",
            extra={
                "org_id": organization_id,
                "bank_account_id": bank_account_id,
                "auto_reconcile": auto_reconcile
            }
        )
        
        ref_date = statement_date or date.today()
        
        # Buscar extrato importado (não conciliado)
        statement = await self._fetch_statement(
            organization_id, branch_id, bank_account_id, ref_date
        )
        
        # Buscar lançamentos do sistema (não conciliados)
        system_entries = await self._fetch_system_entries(
            organization_id, branch_id, bank_account_id, ref_date
        )
        
        # Executar matching
        matches = self._match_entries(
            statement, system_entries, tolerance_days, tolerance_amount
        )
        
        # Auto-conciliar se solicitado
        reconciled = 0
        if auto_reconcile:
            exact_matches = [m for m in matches if m["match_type"] == MatchType.EXACT]
            reconciled = await self._auto_reconcile(
                organization_id, branch_id, user_id, exact_matches
            )
        
        # Estatísticas
        stats = self._calculate_stats(matches, statement, system_entries)
        
        return {
            "bank_account_id": bank_account_id,
            "reference_date": ref_date.isoformat(),
            "statement_count": len(statement),
            "system_count": len(system_entries),
            "matches": matches,
            "statistics": stats,
            "auto_reconciled": reconciled,
            "pending_review": [
                m for m in matches
                if m["match_type"] in [MatchType.SUGGESTED, MatchType.UNMATCHED]
            ]
        }
    
    async def _fetch_statement(
        self, org_id: int, branch_id: int, bank_id: str, ref_date: date
    ) -> list[dict]:
        """Busca entradas do extrato."""
        try:
            result = await self.client.get(
                "/api/financial/bank-statements",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "bankAccountId": bank_id,
                    "date": ref_date.isoformat(),
                    "reconciled": False
                }
            )
            return result.get("items", [])
        except Exception as e:
            logger.error(f"Erro ao buscar extrato: {e}")
            return []
    
    async def _fetch_system_entries(
        self, org_id: int, branch_id: int, bank_id: str, ref_date: date
    ) -> list[dict]:
        """Busca lançamentos do sistema."""
        try:
            result = await self.client.get(
                "/api/financial/bank-entries",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "bankAccountId": bank_id,
                    "dateStart": ref_date.isoformat(),
                    "reconciled": False
                }
            )
            return result.get("items", [])
        except Exception as e:
            logger.error(f"Erro ao buscar lançamentos: {e}")
            return []
    
    def _match_entries(
        self,
        statement: list[dict],
        system: list[dict],
        tol_days: int,
        tol_amount: float
    ) -> list[dict]:
        """Encontra correspondências."""
        matches = []
        used_ids = set()
        
        for stmt in statement:
            stmt_amt = stmt.get("amount", 0)
            stmt_date = stmt.get("date", "")[:10]
            
            best_match = None
            best_type = MatchType.UNMATCHED
            
            for sys in system:
                if sys.get("id") in used_ids:
                    continue
                
                sys_amt = sys.get("amount", 0)
                sys_date = sys.get("date", "")[:10]
                
                # Calcular diferenças
                amt_diff = abs(stmt_amt - sys_amt)
                try:
                    date_diff = abs((
                        date.fromisoformat(stmt_date) - 
                        date.fromisoformat(sys_date)
                    ).days)
                except ValueError:
                    continue
                
                # Classificar match
                if amt_diff <= 0.01 and date_diff == 0:
                    match_type = MatchType.EXACT
                elif amt_diff <= tol_amount and date_diff <= tol_days:
                    match_type = MatchType.PARTIAL
                elif amt_diff <= tol_amount * 10 and date_diff <= tol_days * 2:
                    match_type = MatchType.SUGGESTED
                else:
                    continue
                
                if best_match is None or match_type.value < best_type.value:
                    best_match = sys
                    best_type = match_type
            
            matches.append({
                "statement_entry": stmt,
                "system_entry": best_match,
                "match_type": best_type,
                "confidence": {
                    MatchType.EXACT: 1.0,
                    MatchType.PARTIAL: 0.8,
                    MatchType.SUGGESTED: 0.5,
                    MatchType.UNMATCHED: 0.0
                }.get(best_type, 0.0)
            })
            
            if best_match:
                used_ids.add(best_match.get("id"))
        
        return matches
    
    async def _auto_reconcile(
        self, org_id: int, branch_id: int, user_id: str, matches: list[dict]
    ) -> int:
        """Concilia automaticamente matches exatos."""
        count = 0
        for m in matches:
            if not m.get("system_entry"):
                continue
            try:
                await self.client.post(
                    "/api/financial/reconcile",
                    data={
                        "organizationId": org_id,
                        "branchId": branch_id,
                        "statementEntryId": m["statement_entry"].get("id"),
                        "systemEntryId": m["system_entry"].get("id"),
                        "reconciledBy": user_id
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Erro na conciliação automática: {e}")
        return count
    
    def _calculate_stats(
        self, matches: list[dict], statement: list[dict], system: list[dict]
    ) -> dict:
        """Calcula estatísticas."""
        exact = sum(1 for m in matches if m["match_type"] == MatchType.EXACT)
        partial = sum(1 for m in matches if m["match_type"] == MatchType.PARTIAL)
        unmatched = sum(1 for m in matches if m["match_type"] == MatchType.UNMATCHED)
        
        stmt_total = sum(e.get("amount", 0) for e in statement)
        sys_total = sum(e.get("amount", 0) for e in system)
        
        return {
            "exact_matches": exact,
            "partial_matches": partial,
            "unmatched": unmatched,
            "match_rate": round(exact / len(statement) * 100, 1) if statement else 0,
            "statement_total": round(stmt_total, 2),
            "system_total": round(sys_total, 2),
            "difference": round(stmt_total - sys_total, 2)
        }
