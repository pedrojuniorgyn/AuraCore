"""
Tool para validar CTe antes da autorização.

Verifica campos obrigatórios, CFOP, valores e vinculações.
"""

from typing import Any, Dict, List

import httpx
import structlog

from src.config import get_settings

logger = structlog.get_logger()


class ValidateCTeTool:
    """
    Valida um CTe (Conhecimento de Transporte Eletrônico) antes de enviar para autorização.
    
    Verifica:
    - Dados obrigatórios preenchidos
    - CFOP compatível com operação
    - Valores de impostos calculados corretamente
    - NFes vinculadas existentes
    - Tomador e remetente válidos
    """
    
    name = "validate_cte"
    description = """
    Valida um CTe antes de enviar para autorização na SEFAZ.
    
    Parâmetros:
    - cte_id: ID do CTe no sistema AuraCore
    
    Retorna:
    - valid: Se o CTe está válido para autorização
    - errors: Lista de erros que impedem autorização
    - warnings: Lista de alertas (não impedem, mas merecem atenção)
    - summary: Resumo dos dados do CTe
    - recommendation: Recomendação de ação
    
    Use SEMPRE antes de autorizar um CTe para evitar rejeições.
    """
    
    def __init__(self):
        self.settings = get_settings()
    
    async def run(self, cte_id: str) -> Dict[str, Any]:
        """
        Executa a validação do CTe.
        
        Args:
            cte_id: ID do CTe no sistema
            
        Returns:
            Resultado da validação com erros e warnings
        """
        
        logger.info("Validating CTe", cte_id=cte_id)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Buscar dados do CTe na API do AuraCore
                response = await client.get(
                    f"{self.settings.auracore_api_url}/api/fiscal/cte/{cte_id}",
                )
                
                if response.status_code == 404:
                    return {
                        "success": False,
                        "valid": False,
                        "error": f"CTe não encontrado: {cte_id}",
                        "suggestion": "Verifique se o ID está correto",
                    }
                
                if response.status_code != 200:
                    return {
                        "success": False,
                        "valid": False,
                        "error": f"Erro ao buscar CTe: {response.status_code}",
                    }
                
                cte_data = response.json()
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "valid": False,
                "error": "Timeout ao buscar dados do CTe",
            }
        except Exception as e:
            logger.error("CTe validation failed", error=str(e))
            return {
                "success": False,
                "valid": False,
                "error": f"Erro inesperado: {str(e)}",
            }
        
        # Executar validações
        errors: List[str] = []
        warnings: List[str] = []
        
        # Validar campos obrigatórios
        required_fields = [
            ("emitente", "Emitente"),
            ("emitente_cnpj", "CNPJ do Emitente"),
            ("tomador", "Tomador"),
            ("tomador_cnpj", "CNPJ/CPF do Tomador"),
            ("remetente", "Remetente"),
            ("destinatario", "Destinatário"),
            ("valor_total", "Valor Total"),
            ("cfop", "CFOP"),
            ("uf_origem", "UF de Origem"),
            ("uf_destino", "UF de Destino"),
        ]
        
        for field, label in required_fields:
            value = cte_data.get(field)
            if not value or (isinstance(value, str) and not value.strip()):
                errors.append(f"❌ {label} não preenchido")
        
        # Validar CFOP
        cfop = cte_data.get("cfop", "")
        uf_origem = cte_data.get("uf_origem", "")
        uf_destino = cte_data.get("uf_destino", "")
        
        if cfop and uf_origem and uf_destino:
            is_interestadual = uf_origem.upper() != uf_destino.upper()
            
            if is_interestadual:
                if not cfop.startswith("6"):
                    errors.append(
                        f"❌ CFOP {cfop} inválido para operação interestadual "
                        f"({uf_origem}→{uf_destino}). Deve iniciar com 6."
                    )
            else:
                if not cfop.startswith("5"):
                    errors.append(
                        f"❌ CFOP {cfop} inválido para operação interna ({uf_origem}). "
                        f"Deve iniciar com 5."
                    )
        
        # Validar valores de ICMS
        valor_total = cte_data.get("valor_total", 0)
        icms = cte_data.get("icms", 0)
        aliquota = cte_data.get("aliquota_icms", 0)
        
        if valor_total and aliquota:
            base_calculo = cte_data.get("base_calculo_icms", valor_total)
            icms_esperado = base_calculo * (aliquota / 100)
            diferenca = abs(icms - icms_esperado)
            
            if diferenca > 0.01:  # Tolerância de 1 centavo
                errors.append(
                    f"❌ ICMS informado (R$ {icms:,.2f}) difere do calculado "
                    f"(R$ {icms_esperado:,.2f}). Diferença: R$ {diferenca:,.2f}"
                )
        
        # Validar NFes vinculadas
        nfes = cte_data.get("nfes_vinculadas", [])
        if not nfes:
            warnings.append("⚠️ Nenhuma NFe vinculada ao CTe")
        else:
            # Verificar se NFes existem
            for nfe in nfes:
                if not nfe.get("chave"):
                    warnings.append(f"⚠️ NFe sem chave de acesso: {nfe.get('id', 'N/A')}")
        
        # Validar peso
        peso_total = cte_data.get("peso_total", 0)
        if peso_total <= 0:
            warnings.append("⚠️ Peso total não informado ou zerado")
        
        # Validar valor mínimo
        if valor_total and valor_total < 1.0:
            warnings.append(f"⚠️ Valor total muito baixo: R$ {valor_total:,.2f}")
        
        # Resultado
        is_valid = len(errors) == 0
        
        logger.info(
            "CTe validation completed",
            cte_id=cte_id,
            valid=is_valid,
            errors_count=len(errors),
            warnings_count=len(warnings),
        )
        
        return {
            "success": True,
            "valid": is_valid,
            "cte_id": cte_id,
            "errors": errors,
            "warnings": warnings,
            "summary": {
                "numero": cte_data.get("numero"),
                "serie": cte_data.get("serie"),
                "emitente": cte_data.get("emitente_nome"),
                "tomador": cte_data.get("tomador_nome"),
                "remetente": cte_data.get("remetente_nome"),
                "destinatario": cte_data.get("destinatario_nome"),
                "uf_origem": uf_origem,
                "uf_destino": uf_destino,
                "cfop": cfop,
                "valor_total": valor_total,
                "icms": icms,
                "aliquota": aliquota,
                "nfes_count": len(nfes),
            },
            "recommendation": (
                "✅ CTe válido para autorização. Prossiga com o envio."
                if is_valid
                else "❌ Corrija os erros listados antes de autorizar."
            ),
        }
