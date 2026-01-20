# agents/src/api/knowledge.py
"""
API endpoints para Knowledge Base / RAG.

Endpoints:
- POST /api/knowledge/query - Consulta RAG
- POST /api/knowledge/index - Indexa documento
- GET /api/knowledge/stats - Estatísticas
- GET /api/knowledge/health - Health check

@module api/knowledge
"""

import tempfile
import os
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
import structlog

from src.services.knowledge import (
    get_rag_pipeline,
    get_vector_store,
    DocumentIndexer,
    DocumentMetadata,
)

logger = structlog.get_logger()

router = APIRouter()


# ===== SCHEMAS =====


class QueryRequest(BaseModel):
    """Request para consulta RAG."""

    query: str = Field(..., description="Pergunta ou tema a pesquisar", min_length=1)
    filter_type: Optional[str] = Field(
        None, description="Filtrar por tipo (law, manual, regulation, article)"
    )
    top_k: int = Field(default=5, ge=1, le=10, description="Número de resultados")


class SourceInfo(BaseModel):
    """Informação da fonte."""

    title: str
    type: str
    score: float
    law_number: Optional[str] = None
    article: Optional[str] = None


class QueryResponse(BaseModel):
    """Response da consulta RAG."""

    success: bool
    query: str
    context: str
    sources: List[SourceInfo]
    total_results: int
    error: Optional[str] = None


class IndexResponse(BaseModel):
    """Response da indexação."""

    success: bool
    document_id: str
    chunks_indexed: int
    error: Optional[str] = None


class StatsResponse(BaseModel):
    """Estatísticas da knowledge base."""

    collection_name: str
    total_documents: int
    status: str
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check da knowledge base."""

    status: str
    embedding_service: str
    vector_store: str
    details: Optional[str] = None


# ===== ENDPOINTS =====


@router.post("/query", response_model=QueryResponse)
async def query_knowledge(request: QueryRequest) -> QueryResponse:
    """
    Consulta a base de conhecimento usando RAG.

    Args:
        request: Pergunta e filtros

    Returns:
        Contexto relevante e fontes
    """
    logger.info("knowledge_query", query=request.query[:50])

    try:
        rag = get_rag_pipeline()
        result = await rag.retrieve(
            query=request.query,
            filter_type=request.filter_type,
            top_k=request.top_k
        )

        sources = [
            SourceInfo(
                title=s.get("title", "Documento"),
                type=s.get("type", "unknown"),
                score=round(s.get("score", 0), 3),
                law_number=s.get("law"),
                article=s.get("article")
            )
            for s in result.sources
        ]

        return QueryResponse(
            success=True,
            query=request.query,
            context=result.context,
            sources=sources,
            total_results=result.total_results
        )

    except Exception as e:
        logger.error("knowledge_query_error", error=str(e))
        return QueryResponse(
            success=False,
            query=request.query,
            context="",
            sources=[],
            total_results=0,
            error=str(e)
        )


@router.post("/index", response_model=IndexResponse)
async def index_document(
    file: UploadFile = File(..., description="Arquivo PDF para indexar"),
    title: str = Form(..., description="Título do documento"),
    doc_type: str = Form(default="other", description="Tipo: law, manual, regulation, article, other"),
    law_number: Optional[str] = Form(default=None, description="Número da lei (ex: LC 87/96)"),
    year: Optional[int] = Form(default=None, description="Ano do documento")
) -> IndexResponse:
    """
    Indexa um documento PDF na knowledge base.

    Args:
        file: Arquivo PDF
        title: Título do documento
        doc_type: Tipo (law, manual, regulation, article, other)
        law_number: Número da lei (opcional)
        year: Ano (opcional)

    Returns:
        Resultado da indexação
    """
    logger.info("knowledge_index", filename=file.filename, title=title)

    # Validar tipo
    valid_types = {"law", "manual", "regulation", "article", "other"}
    if doc_type not in valid_types:
        doc_type = "other"

    try:
        # Ler conteúdo do arquivo
        content = await file.read()

        if not content:
            return IndexResponse(
                success=False,
                document_id="",
                chunks_indexed=0,
                error="Arquivo vazio"
            )

        # Criar metadata
        metadata = DocumentMetadata(
            title=title,
            type=doc_type,  # type: ignore
            law_number=law_number,
            year=year,
            source=file.filename
        )

        # Salvar temporariamente
        suffix = ".pdf"
        if file.filename:
            suffix = os.path.splitext(file.filename)[1] or ".pdf"

        tmp_path = ""
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            # Indexar
            indexer = DocumentIndexer()
            result = await indexer.index_pdf(tmp_path, metadata)

            return IndexResponse(
                success=result.success,
                document_id=result.document_id,
                chunks_indexed=result.chunks_indexed,
                error=result.error
            )

        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        logger.error("knowledge_index_error", error=str(e))
        return IndexResponse(
            success=False,
            document_id="",
            chunks_indexed=0,
            error=str(e)
        )


@router.post("/index/text", response_model=IndexResponse)
async def index_text(
    content: str = Form(..., description="Conteúdo textual a indexar"),
    title: str = Form(..., description="Título do documento"),
    doc_type: str = Form(default="other", description="Tipo: law, manual, regulation, article, other"),
    law_number: Optional[str] = Form(default=None, description="Número da lei"),
    year: Optional[int] = Form(default=None, description="Ano do documento")
) -> IndexResponse:
    """
    Indexa texto diretamente na knowledge base.

    Args:
        content: Conteúdo textual
        title: Título
        doc_type: Tipo
        law_number: Número da lei
        year: Ano

    Returns:
        Resultado da indexação
    """
    logger.info("knowledge_index_text", title=title, length=len(content))

    # Validar tipo
    valid_types = {"law", "manual", "regulation", "article", "other"}
    if doc_type not in valid_types:
        doc_type = "other"

    try:
        metadata = DocumentMetadata(
            title=title,
            type=doc_type,  # type: ignore
            law_number=law_number,
            year=year,
            source="text_input"
        )

        indexer = DocumentIndexer()
        result = await indexer.index_text(content, metadata)

        return IndexResponse(
            success=result.success,
            document_id=result.document_id,
            chunks_indexed=result.chunks_indexed,
            error=result.error
        )

    except Exception as e:
        logger.error("knowledge_index_text_error", error=str(e))
        return IndexResponse(
            success=False,
            document_id="",
            chunks_indexed=0,
            error=str(e)
        )


@router.get("/stats", response_model=StatsResponse)
async def get_stats() -> StatsResponse:
    """Retorna estatísticas da knowledge base."""
    try:
        store = get_vector_store()
        stats = await store.get_stats()

        return StatsResponse(
            collection_name=stats.get("name", "unknown"),
            total_documents=stats.get("count", 0),
            status="healthy"
        )
    except Exception as e:
        logger.error("knowledge_stats_error", error=str(e))
        return StatsResponse(
            collection_name="unknown",
            total_documents=0,
            status="error",
            error=str(e)
        )


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check da knowledge base."""
    from src.services.knowledge import get_embedding_service

    embedding_status = "unavailable"
    vector_status = "unavailable"
    details: List[str] = []

    try:
        # Verificar embedding service
        embed_svc = get_embedding_service()
        if embed_svc.is_available():
            embedding_status = "available"
        else:
            details.append(f"Embedding provider '{embed_svc.config.provider}' not configured")

        # Verificar vector store
        store = get_vector_store()
        if store.is_available():
            vector_status = "available"
        else:
            details.append("ChromaDB not available")

        # Status geral
        if embedding_status == "available" and vector_status == "available":
            status = "healthy"
        elif embedding_status == "available" or vector_status == "available":
            status = "degraded"
        else:
            status = "unhealthy"

        return HealthResponse(
            status=status,
            embedding_service=embedding_status,
            vector_store=vector_status,
            details="; ".join(details) if details else None
        )

    except Exception as e:
        logger.error("knowledge_health_error", error=str(e))
        return HealthResponse(
            status="error",
            embedding_service="unknown",
            vector_store="unknown",
            details=str(e)
        )
