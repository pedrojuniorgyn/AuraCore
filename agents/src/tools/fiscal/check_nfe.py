"""
Tool para verificar NFes.

Consulta status e dados de NFes no sistema.
"""

from typing import Any, Dict

import httpx
import structlog

from src.config import get_settings

logger = structlog.get_logger()


class CheckNFeTool:
    """
    Verifica status e dados de uma NFe no sistema AuraCore.
    """
    
    name = "check_nfe"
    description = """
    Verifica uma NFe (Nota Fiscal Eletrônica) pela chave de acesso.
    
    Parâmetros:
    - chave_nfe: Chave de acesso da NFe (44 dígitos)
    
    Retorna:
    - found: Se a NFe foi encontrada no sistema
    - status: Status da NFe (autorizada, cancelada, etc.)
    - emitente: Dados do emitente
    - destinatario: Dados do destinatário
    - valores: Valores e impostos
    - vinculada_cte: Se já está vinculada a algum CTe
    
    Use para:
    - Verificar se NFe existe antes de vincular a CTe
    - Consultar valores para cálculos
    - Verificar status para operações
    """
    
    def __init__(self):
        self.settings = get_settings()
    
    async def run(self, chave_nfe: str) -> Dict[str, Any]:
        """
        Verifica a NFe pela chave de acesso.
        
        Args:
            chave_nfe: Chave de acesso (44 dígitos)
            
        Returns:
            Dados da NFe ou erro
        """
        
        # Limpar chave (remover espaços e caracteres especiais)
        chave_nfe = "".join(c for c in chave_nfe if c.isdigit())
        
        # Validar tamanho
        if len(chave_nfe) != 44:
            return {
                "success": False,
                "error": f"Chave de acesso inválida. Esperado 44 dígitos, recebido {len(chave_nfe)}.",
                "chave_informada": chave_nfe,
                "suggestion": "Verifique se a chave está completa e contém apenas números.",
            }
        
        logger.info("Checking NFe", chave=chave_nfe[:20] + "...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.settings.auracore_api_url}/api/fiscal/nfe/check/{chave_nfe}",
                )
                
                if response.status_code == 404:
                    return {
                        "success": True,
                        "found": False,
                        "chave": chave_nfe,
                        "message": "NFe não encontrada no sistema AuraCore.",
                        "suggestion": "A NFe pode ser importada via XML ou consulta SEFAZ.",
                    }
                
                if response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"Erro ao consultar NFe: {response.status_code}",
                    }
                
                nfe_data = response.json()
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Timeout ao consultar NFe",
            }
        except Exception as e:
            logger.error("NFe check failed", error=str(e))
            return {
                "success": False,
                "error": f"Erro inesperado: {str(e)}",
            }
        
        # Extrair informações relevantes
        return {
            "success": True,
            "found": True,
            "chave": chave_nfe,
            "status": nfe_data.get("status", "desconhecido"),
            "numero": nfe_data.get("numero"),
            "serie": nfe_data.get("serie"),
            "data_emissao": nfe_data.get("data_emissao"),
            "emitente": {
                "cnpj": nfe_data.get("emitente_cnpj"),
                "nome": nfe_data.get("emitente_nome"),
                "uf": nfe_data.get("emitente_uf"),
            },
            "destinatario": {
                "cnpj": nfe_data.get("destinatario_cnpj"),
                "nome": nfe_data.get("destinatario_nome"),
                "uf": nfe_data.get("destinatario_uf"),
            },
            "valores": {
                "total": nfe_data.get("valor_total"),
                "produtos": nfe_data.get("valor_produtos"),
                "frete": nfe_data.get("valor_frete"),
                "icms": nfe_data.get("icms_total"),
                "pis": nfe_data.get("pis_total"),
                "cofins": nfe_data.get("cofins_total"),
            },
            "vinculada_cte": nfe_data.get("cte_vinculado"),
            "observacoes": nfe_data.get("observacoes"),
        }
