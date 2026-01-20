"""
Guardrails para operações sensíveis.

Define níveis de risco e regras de aprovação para tools.
Implementa Human-in-the-Loop para operações críticas.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

import structlog

from src.config import get_settings

logger = structlog.get_logger()


class RiskLevel(str, Enum):
    """Níveis de risco para operações."""
    
    LOW = "low"           # Consultas, relatórios
    MEDIUM = "medium"     # Criação de registros
    HIGH = "high"         # Alterações financeiras
    CRITICAL = "critical" # Operações fiscais, pagamentos


# Alias para compatibilidade com tools
GuardrailLevel = RiskLevel


@dataclass
class Guardrail:
    """Define um guardrail para uma operação."""
    
    risk_level: RiskLevel
    requires_approval: bool
    max_value: Optional[float] = None
    allowed_roles: Optional[List[str]] = None
    description: str = ""


# =============================================================================
# MAPEAMENTO DE TOOLS PARA GUARDRAILS
# =============================================================================

TOOL_GUARDRAILS: Dict[str, Guardrail] = {
    # -------------------------------------------------------------------------
    # BAIXO RISCO - Operações de leitura, consultas
    # -------------------------------------------------------------------------
    "query_legislation": Guardrail(
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Consulta à base de conhecimento de legislação",
    ),
    "calculate_icms": Guardrail(
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Cálculo de ICMS (simulação)",
    ),
    "simulate_tax": Guardrail(
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Simulação de carga tributária",
    ),
    "check_nfe": Guardrail(
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Verificação de NFe",
    ),
    "track_delivery": Guardrail(
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Rastreamento de entrega",
    ),
    "get_cashflow": Guardrail(
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Consulta de fluxo de caixa",
    ),
    
    # -------------------------------------------------------------------------
    # MÉDIO RISCO - Criação de registros, alterações reversíveis
    # -------------------------------------------------------------------------
    "create_cte_draft": Guardrail(
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Criação de rascunho de CTe",
    ),
    "validate_cte": Guardrail(
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Validação de CTe antes de autorizar",
    ),
    "schedule_maintenance": Guardrail(
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Agendamento de manutenção",
    ),
    "create_proposal": Guardrail(
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Criação de proposta comercial",
    ),
    
    # -------------------------------------------------------------------------
    # ALTO RISCO - Alterações financeiras, emissão de documentos
    # -------------------------------------------------------------------------
    "authorize_cte": Guardrail(
        risk_level=RiskLevel.HIGH,
        requires_approval=True,
        max_value=100000.00,
        allowed_roles=["fiscal_admin", "fiscal_supervisor", "manager", "admin"],
        description="Autorização de CTe na SEFAZ",
    ),
    "create_payment": Guardrail(
        risk_level=RiskLevel.HIGH,
        requires_approval=True,
        max_value=50000.00,
        allowed_roles=["financial_admin", "financial_supervisor", "manager", "admin"],
        description="Criação de pagamento",
    ),
    "cancel_cte": Guardrail(
        risk_level=RiskLevel.HIGH,
        requires_approval=True,
        allowed_roles=["fiscal_admin", "manager", "admin"],
        description="Cancelamento de CTe",
    ),
    
    # -------------------------------------------------------------------------
    # CRÍTICO - Sempre requer aprovação humana
    # -------------------------------------------------------------------------
    "generate_sped": Guardrail(
        risk_level=RiskLevel.CRITICAL,
        requires_approval=True,
        allowed_roles=["fiscal_admin", "cfo", "admin"],
        description="Geração de arquivo SPED",
    ),
    "close_accounting_period": Guardrail(
        risk_level=RiskLevel.CRITICAL,
        requires_approval=True,
        allowed_roles=["accounting_admin", "cfo", "admin"],
        description="Fechamento de período contábil",
    ),
    "bulk_payment": Guardrail(
        risk_level=RiskLevel.CRITICAL,
        requires_approval=True,
        allowed_roles=["financial_admin", "cfo", "admin"],
        description="Pagamento em lote",
    ),
}


class GuardrailMiddleware:
    """
    Middleware para aplicar guardrails em tools.
    
    Verifica:
    - Permissões do usuário (role)
    - Limites de valor
    - Necessidade de aprovação
    """
    
    def __init__(self):
        self.settings = get_settings()
    
    async def check(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        user_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Verifica se a operação é permitida.
        
        Args:
            tool_name: Nome do tool
            tool_input: Parâmetros do tool
            user_context: Contexto do usuário (role, permissions)
            
        Returns:
            Status da verificação com detalhes
        """
        
        # Se guardrails desabilitados, permitir tudo
        if not self.settings.enable_guardrails:
            return {"status": "approved", "guardrails_disabled": True}
        
        guardrail = TOOL_GUARDRAILS.get(tool_name)
        
        if not guardrail:
            # Tool sem guardrail definido - log warning mas permite
            logger.warning(
                "Tool without guardrail definition",
                tool=tool_name,
            )
            return {
                "status": "approved",
                "warning": f"Tool '{tool_name}' não tem guardrail definido",
            }
        
        user_role = user_context.get("role", "")
        
        # Verificar role permitida
        if guardrail.allowed_roles:
            if user_role not in guardrail.allowed_roles:
                logger.warning(
                    "Permission denied by guardrail",
                    tool=tool_name,
                    user_role=user_role,
                    required_roles=guardrail.allowed_roles,
                )
                return {
                    "status": "denied",
                    "reason": f"Permissão negada. Role '{user_role}' não autorizada.",
                    "required_roles": guardrail.allowed_roles,
                    "risk_level": guardrail.risk_level.value,
                }
        
        # Verificar limite de valor
        if guardrail.max_value:
            value = (
                tool_input.get("valor") or 
                tool_input.get("value") or 
                tool_input.get("amount") or 
                0
            )
            if isinstance(value, (int, float)) and value > guardrail.max_value:
                logger.info(
                    "Value exceeds guardrail limit",
                    tool=tool_name,
                    value=value,
                    limit=guardrail.max_value,
                )
                return {
                    "status": "pending_approval",
                    "reason": f"Valor R$ {value:,.2f} excede limite de R$ {guardrail.max_value:,.2f}",
                    "approval_required": True,
                    "risk_level": guardrail.risk_level.value,
                    "approval_request": {
                        "tool": tool_name,
                        "value": value,
                        "limit": guardrail.max_value,
                        "user": user_context.get("user_id"),
                        "org": user_context.get("org_id"),
                    },
                }
        
        # Verificar se requer aprovação
        if guardrail.requires_approval:
            logger.info(
                "Operation requires approval",
                tool=tool_name,
                risk_level=guardrail.risk_level.value,
            )
            return {
                "status": "pending_approval",
                "reason": f"Operação '{tool_name}' requer aprovação",
                "risk_level": guardrail.risk_level.value,
                "description": guardrail.description,
                "approval_request": {
                    "tool": tool_name,
                    "input": tool_input,
                    "user": user_context.get("user_id"),
                    "org": user_context.get("org_id"),
                },
            }
        
        # Operação aprovada
        return {
            "status": "approved",
            "risk_level": guardrail.risk_level.value,
        }
    
    def get_guardrail(self, tool_name: str) -> Optional[Guardrail]:
        """Retorna guardrail de um tool específico."""
        return TOOL_GUARDRAILS.get(tool_name)
    
    def list_guardrails(self) -> Dict[str, dict]:
        """Lista todos os guardrails definidos."""
        return {
            name: {
                "risk_level": g.risk_level.value,
                "requires_approval": g.requires_approval,
                "max_value": g.max_value,
                "allowed_roles": g.allowed_roles,
                "description": g.description,
            }
            for name, g in TOOL_GUARDRAILS.items()
        }
