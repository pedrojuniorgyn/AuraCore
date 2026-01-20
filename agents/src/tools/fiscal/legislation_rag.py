# agents/src/tools/fiscal/legislation_rag.py
"""
Tool: Legislation RAG
Consulta a base de conhecimento de legislação fiscal.

Risk Level: LOW (apenas leitura)

Usa o RAG Pipeline local (ChromaDB + Embeddings).
"""

from typing import Any, Dict, List, Optional

import structlog

from src.services.knowledge import get_rag_pipeline, RAGPipeline

logger = structlog.get_logger()


class LegislationRAGTool:
    """
    Consulta a base de conhecimento de legislação fiscal brasileira usando RAG local.
    
    Usa ChromaDB para busca semântica e retorna contexto relevante.
    
    Legislação disponível:
    - ICMS (Lei Kandir - LC 87/96)
    - PIS/COFINS (Leis 10.637/02 e 10.833/03)
    - Reforma Tributária (IBS, CBS - EC 132/2023)
    - SPED Fiscal
    - NFe, CTe, MDFe
    """
    
    name = "legislation_rag"
    description = """
    Consulta a base de conhecimento de legislação fiscal brasileira usando RAG.
    
    Use esta ferramenta SEMPRE que precisar responder sobre:
    - ICMS (Lei Kandir, alíquotas, DIFAL, benefícios fiscais)
    - Reforma Tributária 2026 (IBS, CBS, período de transição)
    - PIS/COFINS (regimes cumulativo e não-cumulativo)
    - Documentos eletrônicos (CTe, NFe, MDFe)
    - SPED Fiscal e Contribuições
    
    Parâmetros:
    - query: Pergunta ou tema a pesquisar
    - filter_type: Filtro opcional (law, manual, regulation, article)
    - top_k: Número de resultados (1-10, padrão: 5)
    
    Retorna:
    - context: Trechos relevantes da legislação
    - sources: Fontes consultadas com score de relevância
    
    IMPORTANTE: SEMPRE cite a fonte nas suas respostas.
    """
    
    def __init__(self, rag_pipeline: Optional[RAGPipeline] = None):
        """
        Inicializa a tool.
        
        Args:
            rag_pipeline: Pipeline RAG (opcional, usa singleton)
        """
        self._rag = rag_pipeline
    
    @property
    def rag(self) -> RAGPipeline:
        """Retorna o pipeline RAG (lazy loading)."""
        if self._rag is None:
            self._rag = get_rag_pipeline()
        return self._rag
    
    async def run(
        self,
        query: str,
        filter_type: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Executa consulta na base de conhecimento.
        
        Args:
            query: Pergunta ou tema a pesquisar
            filter_type: Filtro por tipo de documento
            top_k: Número máximo de resultados
            
        Returns:
            Resultados da busca com conteúdo e metadados
        """
        logger.info(
            "legislation_rag_query",
            query=query[:100] if query else "",
            filter_type=filter_type,
            top_k=top_k,
        )
        
        if not query or not query.strip():
            return {
                "success": False,
                "error": "Query não pode ser vazia",
                "query": query,
                "context": "",
                "sources": [],
            }
        
        try:
            # Validar filter_type
            valid_types = {"law", "manual", "regulation", "article", "other"}
            if filter_type and filter_type not in valid_types:
                filter_type = None
            
            # Clamp top_k entre 1 e 10
            top_k = max(1, min(10, top_k))
            
            # Executar busca RAG
            result = await self.rag.retrieve(
                query=query,
                filter_type=filter_type,
                top_k=top_k
            )
            
            # Formatar fontes
            sources: List[Dict[str, Any]] = []
            for source in result.sources:
                sources.append({
                    "title": source.get("title", "Documento"),
                    "type": source.get("type", "unknown"),
                    "law_number": source.get("law"),
                    "article": source.get("article"),
                    "relevance_score": round(source.get("score", 0) * 100, 1),
                })
            
            if not result.context:
                logger.info("legislation_rag_no_results", query=query[:50])
                return {
                    "success": True,
                    "query": query,
                    "context": "",
                    "sources": [],
                    "total_results": 0,
                    "message": (
                        "Nenhuma informação encontrada na base de conhecimento. "
                        "Tente reformular a pergunta ou consulte a documentação original."
                    ),
                }
            
            logger.info(
                "legislation_rag_success",
                query=query[:50],
                results_count=len(sources),
                top_score=sources[0]["relevance_score"] if sources else 0,
            )
            
            return {
                "success": True,
                "query": query,
                "context": result.context,
                "sources": sources,
                "total_results": result.total_results,
                "formatted_context": result.format_for_prompt(),
                "note": (
                    "Use estes trechos para fundamentar sua resposta. "
                    "SEMPRE cite a fonte (title) ao usar a informação."
                ),
            }
            
        except Exception as e:
            logger.error("legislation_rag_error", error=str(e), query=query[:50])
            return {
                "success": False,
                "error": f"Erro na consulta RAG: {str(e)}",
                "query": query,
                "context": "",
                "sources": [],
                "suggestion": "Verifique se o ChromaDB está disponível e tente novamente.",
            }
