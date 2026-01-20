"""
Tool para consultar legislação via RAG (Knowledge Module).

Integra com o ChromaDB já existente no AuraCore.
"""

from typing import Any, Dict, List, Optional

import httpx
import structlog

from src.config import get_settings
from src.core.observability import ObservabilityMiddleware

logger = structlog.get_logger()


class QueryLegislationTool:
    """
    Consulta a base de conhecimento de legislação fiscal brasileira.
    
    Integra com o Knowledge Module do AuraCore (ChromaDB + Gemini Embeddings).
    """
    
    name = "query_legislation"
    description = """
    Consulta a base de conhecimento de legislação fiscal brasileira.
    
    Use esta ferramenta SEMPRE que precisar responder sobre:
    - ICMS (Lei Kandir, alíquotas, DIFAL, benefícios fiscais)
    - Reforma Tributária 2026 (IBS, CBS, período de transição)
    - PIS/COFINS (regimes cumulativo e não-cumulativo)
    - Documentos eletrônicos (CTe, NFe, MDFe)
    
    Parâmetros:
    - query: Pergunta ou tema a pesquisar
    - legislation_types: Filtro opcional por tipo (ICMS, PIS_COFINS, REFORMA_2026)
    - top_k: Número de resultados (padrão: 5)
    
    Retorna trechos relevantes da legislação com score de relevância.
    SEMPRE cite a fonte nas suas respostas.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.observability = ObservabilityMiddleware()
    
    async def run(
        self,
        query: str,
        legislation_types: Optional[List[str]] = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Executa consulta na base de conhecimento.
        
        Args:
            query: Pergunta ou tema a pesquisar
            legislation_types: Filtro por tipo de legislação
            top_k: Número máximo de resultados
            
        Returns:
            Resultados da busca com conteúdo e metadados
        """
        
        logger.info(
            "Querying legislation knowledge base",
            query=query[:100],
            legislation_types=legislation_types,
            top_k=top_k,
        )
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Construir payload
                payload = {
                    "query": query,
                    "top_k": top_k,
                    "min_score": 0.35,  # Threshold de relevância
                }
                
                if legislation_types:
                    payload["filters"] = {
                        "legislationType": {"$in": legislation_types}
                    }
                
                # Chamar API do Knowledge Module
                response = await client.post(
                    self.settings.knowledge_api_url,
                    json=payload,
                )
                
                if response.status_code != 200:
                    self.observability.record_knowledge_query("error")
                    logger.error(
                        "Knowledge API error",
                        status_code=response.status_code,
                        response=response.text[:200],
                    )
                    return {
                        "success": False,
                        "error": f"Erro ao consultar base de conhecimento: {response.status_code}",
                        "suggestion": "Tente reformular a pergunta ou consulte a documentação original.",
                    }
                
                data = response.json()
                
                if not data.get("success"):
                    self.observability.record_knowledge_query("error")
                    return {
                        "success": False,
                        "error": data.get("error", "Erro desconhecido"),
                    }
                
                results = data.get("data", {}).get("results", [])
                self.observability.record_knowledge_query("success")
                
                # Formatar resultados para o agente
                formatted_results = []
                for r in results:
                    metadata = r.get("metadata", {})
                    formatted_results.append({
                        "content": r.get("content", ""),
                        "source": metadata.get("title", "Documento não identificado"),
                        "type": metadata.get("legislationType", ""),
                        "section": metadata.get("section", ""),
                        "relevance_score": round(r.get("score", 0) * 100, 1),
                    })
                
                logger.info(
                    "Knowledge query completed",
                    results_count=len(formatted_results),
                    top_score=formatted_results[0]["relevance_score"] if formatted_results else 0,
                )
                
                return {
                    "success": True,
                    "query": query,
                    "total_results": len(formatted_results),
                    "results": formatted_results,
                    "note": (
                        "Use estes trechos para fundamentar sua resposta. "
                        "Sempre cite a fonte (source) ao usar a informação."
                    ),
                }
                
        except httpx.TimeoutException:
            self.observability.record_knowledge_query("timeout")
            logger.error("Knowledge API timeout", query=query[:50])
            return {
                "success": False,
                "error": "Timeout ao consultar base de conhecimento",
                "suggestion": "Tente novamente em alguns segundos.",
            }
        except Exception as e:
            self.observability.record_knowledge_query("error")
            logger.error("Knowledge query failed", error=str(e))
            return {
                "success": False,
                "error": f"Erro inesperado: {str(e)}",
            }
