"""
Docling FastAPI Server
======================

Servidor FastAPI que expõe endpoints para processamento de documentos
usando a biblioteca Docling da IBM.

Endpoints:
- POST /process: Processa PDF completo (texto + tabelas + metadata)
- POST /extract-tables: Extrai apenas tabelas
- POST /extract-text: Extrai apenas texto
- GET /health: Health check

@module docling/app/main
@see E-Agent-Fase-D1
"""

import logging
import os
import time
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .processor import DoclingProcessor

# ============================================================================
# LOGGING
# ============================================================================

log_level = os.getenv("DOCLING_LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("docling-service")

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="AuraCore Docling Service",
    description="Serviço de processamento de documentos fiscais (DANFe, DACTe) usando Docling",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Processor singleton
processor = DoclingProcessor()

# Track startup time for uptime calculation
startup_time = time.time()


# ============================================================================
# MODELS - Request
# ============================================================================


class ProcessRequest(BaseModel):
    """Requisição de processamento de documento."""

    file_path: str = Field(
        ...,
        description="Caminho do arquivo PDF dentro do volume /app/uploads",
        examples=["documents/danfe_001.pdf"],
    )


# ============================================================================
# MODELS - Response
# ============================================================================


class BoundingBox(BaseModel):
    """Bounding box de elemento na página."""

    x: float
    y: float
    width: float
    height: float


class ExtractedTable(BaseModel):
    """Tabela extraída do documento."""

    index: int = Field(..., description="Índice da tabela no documento")
    headers: list[str] = Field(default_factory=list, description="Cabeçalhos da tabela")
    rows: list[list[str]] = Field(default_factory=list, description="Linhas da tabela")
    page_number: int = Field(..., description="Número da página")
    bbox: Optional[BoundingBox] = Field(None, description="Posição na página")


class DocumentMetadata(BaseModel):
    """Metadados do documento."""

    page_count: int = Field(..., description="Número de páginas")
    title: Optional[str] = Field(None, description="Título do documento")
    author: Optional[str] = Field(None, description="Autor do documento")
    creation_date: Optional[str] = Field(None, description="Data de criação")
    file_size: int = Field(..., description="Tamanho do arquivo em bytes")


class ProcessResponse(BaseModel):
    """Resposta de processamento completo."""

    text: str = Field(..., description="Texto extraído do documento")
    tables: list[ExtractedTable] = Field(
        default_factory=list, description="Tabelas extraídas"
    )
    metadata: DocumentMetadata = Field(..., description="Metadados do documento")
    processing_time_ms: int = Field(..., description="Tempo de processamento em ms")


class ExtractTablesResponse(BaseModel):
    """Resposta de extração de tabelas."""

    tables: list[ExtractedTable] = Field(
        default_factory=list, description="Tabelas extraídas"
    )
    processing_time_ms: int = Field(..., description="Tempo de processamento em ms")


class ExtractTextResponse(BaseModel):
    """Resposta de extração de texto."""

    text: str = Field(..., description="Texto extraído")
    processing_time_ms: int = Field(..., description="Tempo de processamento em ms")


class HealthResponse(BaseModel):
    """Resposta de health check."""

    status: str = Field(..., description="Status do serviço", examples=["healthy"])
    version: str = Field(..., description="Versão do serviço")
    uptime: float = Field(..., description="Tempo online em segundos")
    docling_version: str = Field(..., description="Versão do Docling")


class ErrorResponse(BaseModel):
    """Resposta de erro."""

    error: str = Field(..., description="Mensagem de erro")
    detail: Optional[str] = Field(None, description="Detalhes adicionais")


# ============================================================================
# ENDPOINTS
# ============================================================================


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """
    Verifica saúde do serviço.

    Retorna status, versão e uptime do serviço.
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime=time.time() - startup_time,
        docling_version=processor.get_docling_version(),
    )


@app.post(
    "/process",
    response_model=ProcessResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Arquivo não encontrado"},
        500: {"model": ErrorResponse, "description": "Erro de processamento"},
    },
    tags=["Processing"],
)
async def process_document(request: ProcessRequest) -> ProcessResponse:
    """
    Processa documento PDF completo.

    Extrai texto, tabelas e metadados do documento.
    Ideal para importação completa de DANFe/DACTe.
    """
    start_time = time.time()

    # Validar e resolver path
    full_path = _resolve_file_path(request.file_path)

    try:
        result = processor.process_document(full_path)
        processing_time_ms = int((time.time() - start_time) * 1000)

        return ProcessResponse(
            text=result["text"],
            tables=[
                ExtractedTable(
                    index=t["index"],
                    headers=t["headers"],
                    rows=t["rows"],
                    page_number=t["page_number"],
                    bbox=BoundingBox(**t["bbox"]) if t.get("bbox") else None,
                )
                for t in result["tables"]
            ],
            metadata=DocumentMetadata(**result["metadata"]),
            processing_time_ms=processing_time_ms,
        )
    except Exception as e:
        logger.exception(f"Erro ao processar documento: {full_path}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post(
    "/extract-tables",
    response_model=ExtractTablesResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Arquivo não encontrado"},
        500: {"model": ErrorResponse, "description": "Erro de processamento"},
    },
    tags=["Processing"],
)
async def extract_tables(request: ProcessRequest) -> ExtractTablesResponse:
    """
    Extrai apenas tabelas do documento.

    Otimizado para quando apenas dados tabulares são necessários.
    """
    start_time = time.time()

    full_path = _resolve_file_path(request.file_path)

    try:
        tables = processor.extract_tables(full_path)
        processing_time_ms = int((time.time() - start_time) * 1000)

        return ExtractTablesResponse(
            tables=[
                ExtractedTable(
                    index=t["index"],
                    headers=t["headers"],
                    rows=t["rows"],
                    page_number=t["page_number"],
                    bbox=BoundingBox(**t["bbox"]) if t.get("bbox") else None,
                )
                for t in tables
            ],
            processing_time_ms=processing_time_ms,
        )
    except Exception as e:
        logger.exception(f"Erro ao extrair tabelas: {full_path}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post(
    "/extract-text",
    response_model=ExtractTextResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Arquivo não encontrado"},
        500: {"model": ErrorResponse, "description": "Erro de processamento"},
    },
    tags=["Processing"],
)
async def extract_text(request: ProcessRequest) -> ExtractTextResponse:
    """
    Extrai apenas texto do documento.

    Otimizado para quando apenas texto corrido é necessário.
    """
    start_time = time.time()

    full_path = _resolve_file_path(request.file_path)

    try:
        text = processor.extract_text(full_path)
        processing_time_ms = int((time.time() - start_time) * 1000)

        return ExtractTextResponse(
            text=text,
            processing_time_ms=processing_time_ms,
        )
    except Exception as e:
        logger.exception(f"Erro ao extrair texto: {full_path}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ============================================================================
# HELPERS
# ============================================================================


def _resolve_file_path(file_path: str) -> str:
    """
    Resolve e valida caminho do arquivo.

    Args:
        file_path: Caminho relativo dentro de /app/uploads

    Returns:
        Caminho absoluto validado

    Raises:
        HTTPException: Se arquivo não existir
    """
    # Prevenir path traversal
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(
            status_code=400,
            detail="Caminho inválido: não permitido path traversal",
        )

    full_path = os.path.join("/app/uploads", file_path)

    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo não encontrado: {file_path}",
        )

    if not os.path.isfile(full_path):
        raise HTTPException(
            status_code=400,
            detail=f"Caminho não é um arquivo: {file_path}",
        )

    return full_path


# ============================================================================
# STARTUP / SHUTDOWN
# ============================================================================


@app.on_event("startup")
async def startup_event() -> None:
    """Evento de inicialização do servidor."""
    logger.info("🚀 Docling Service iniciando...")
    logger.info(f"📦 Docling version: {processor.get_docling_version()}")
    logger.info("✅ Serviço pronto para receber requisições")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Evento de encerramento do servidor."""
    logger.info("🛑 Docling Service encerrando...")
