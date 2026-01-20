"""
Ponte entre Agentes Agno e MCP Server do AuraCore.

Permite que os agentes acessem os 9 tools MCP existentes:
- check_cursor_issues
- validate_code
- check_compliance
- get_contract
- search_patterns
- get_epic_status
- register_correction
- propose_pattern
- ping
"""

from typing import Any

from src.integrations.auracore_client import AuracoreClient
from src.core.observability import get_logger

logger = get_logger(__name__)


class MCPBridge:
    """
    Cliente para comunicação com MCP Server do AuraCore.
    
    O MCP Server roda localmente no Cursor, mas podemos
    acessar os contratos e padrões via API quando necessário.
    """
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def get_contract(self, contract_id: str) -> dict[str, Any]:
        """
        Consulta contrato da knowledge base.
        
        Contratos disponíveis:
        - verify-before-code
        - type-safety
        - code-consistency
        - mcp-enforcement-rules
        - api-contract
        - etc.
        
        Args:
            contract_id: ID do contrato
            
        Returns:
            Contrato completo com regras
        """
        try:
            # Buscar via knowledge search (contratos são indexados)
            results = await self.client.search_knowledge(
                query=f"contract {contract_id}",
                collection="auracore_contracts",
                top_k=1
            )
            
            if results:
                return results[0]
            
            return {"error": f"Contrato {contract_id} não encontrado"}
            
        except Exception as e:
            logger.error(f"Erro ao buscar contrato: {e}")
            return {"error": str(e)}
    
    async def search_patterns(
        self,
        query: str,
        status: str = "approved"
    ) -> list[dict[str, Any]]:
        """
        Busca padrões na knowledge base.
        
        Args:
            query: Termo de busca
            status: 'approved', 'proposed', ou 'all'
            
        Returns:
            Lista de padrões encontrados
        """
        try:
            results = await self.client.search_knowledge(
                query=f"pattern {query} status:{status}",
                collection="auracore_patterns",
                top_k=5
            )
            return results
            
        except Exception as e:
            logger.error(f"Erro ao buscar padrões: {e}")
            return []
    
    async def get_fiscal_rules(
        self,
        topic: str
    ) -> list[dict[str, Any]]:
        """
        Busca regras fiscais específicas.
        
        Tópicos:
        - icms: Alíquotas ICMS por UF
        - pis_cofins: Regras PIS/COFINS
        - reforma_2026: IBS/CBS
        - sped: Layouts SPED
        
        Args:
            topic: Tópico fiscal
            
        Returns:
            Regras e legislação relacionadas
        """
        try:
            results = await self.client.search_knowledge(
                query=f"fiscal {topic} legislação alíquota",
                collection="auracore_knowledge",
                top_k=10
            )
            return results
            
        except Exception as e:
            logger.error(f"Erro ao buscar regras fiscais: {e}")
            return []
    
    async def validate_fiscal_operation(
        self,
        operation_type: str,
        data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Valida operação fiscal contra regras da knowledge base.
        
        Args:
            operation_type: 'nfe', 'cte', 'mdfe', 'sped'
            data: Dados da operação
            
        Returns:
            Resultado da validação com warnings/errors
        """
        # Buscar regras aplicáveis
        rules = await self.get_fiscal_rules(operation_type)
        
        validation_result = {
            "valid": True,
            "warnings": [],
            "errors": [],
            "rules_applied": len(rules)
        }
        
        # Validações básicas por tipo
        if operation_type == "cte":
            if not data.get("cfop"):
                validation_result["errors"].append("CFOP obrigatório")
                validation_result["valid"] = False
            
            if not data.get("uf_origem") or not data.get("uf_destino"):
                validation_result["errors"].append("UF origem/destino obrigatórios")
                validation_result["valid"] = False
        
        elif operation_type == "nfe":
            if not data.get("chave_acesso") or len(data.get("chave_acesso", "")) != 44:
                validation_result["errors"].append("Chave de acesso deve ter 44 dígitos")
                validation_result["valid"] = False
        
        return validation_result
