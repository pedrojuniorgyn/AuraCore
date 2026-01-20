"""
Processador base usando Docling.

Docling é uma biblioteca da IBM para extração de dados de PDFs
com alta precisão em tabelas (97.9%).

Suporta:
- PDF (com OCR)
- Imagens (PNG, JPG)
- DOCX
- HTML
"""

import os
import tempfile
from typing import Optional, List, Literal
from dataclasses import dataclass, field
from pathlib import Path

from src.core.observability import get_logger

logger = get_logger(__name__)

# Tentar importar Docling
try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False
    DocumentConverter = None
    InputFormat = None
    PdfPipelineOptions = None
    logger.warning("Docling not available. Install with: pip install docling")


@dataclass
class ProcessedDocument:
    """Resultado do processamento de documento."""
    success: bool
    text: str
    markdown: str
    tables: List[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    error: Optional[str] = None
    extracted_data: Optional[dict] = None


@dataclass
class ProcessingOptions:
    """Opções de processamento."""
    output_format: Literal["text", "markdown", "json"] = "markdown"
    extract_tables: bool = True
    extract_images: bool = False
    ocr_enabled: bool = True
    language: str = "por"  # Português


class DoclingProcessor:
    """
    Processador de documentos usando Docling.
    
    Uso:
        processor = DoclingProcessor()
        result = await processor.process_file("/path/to/document.pdf")
    """
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        Inicializa o processador.
        
        Args:
            cache_dir: Diretório para cache de modelos
        """
        self.cache_dir = cache_dir or os.getenv(
            "DOCLING_CACHE_DIR", 
            "/tmp/docling_cache"
        )
        self._converter: Optional[DocumentConverter] = None
        
        # Criar diretório de cache
        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info(
            "docling_processor_initialized",
            extra={
                "cache_dir": self.cache_dir,
                "available": DOCLING_AVAILABLE
            }
        )
    
    def _get_converter(self) -> "DocumentConverter":
        """Retorna converter (lazy initialization)."""
        if not DOCLING_AVAILABLE:
            raise RuntimeError("Docling não está instalado")
        
        if self._converter is None:
            # Configurar pipeline para PDFs
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True
            pipeline_options.do_table_structure = True
            
            self._converter = DocumentConverter(
                allowed_formats=[InputFormat.PDF, InputFormat.IMAGE],
                pipeline_options=pipeline_options
            )
        
        return self._converter
    
    async def process_file(
        self,
        file_path: str,
        options: Optional[ProcessingOptions] = None
    ) -> ProcessedDocument:
        """
        Processa um arquivo de documento.
        
        Args:
            file_path: Caminho do arquivo
            options: Opções de processamento
            
        Returns:
            ProcessedDocument com texto extraído e tabelas
        """
        options = options or ProcessingOptions()
        
        logger.info("processing_document", extra={"file_path": file_path})
        
        if not DOCLING_AVAILABLE:
            return ProcessedDocument(
                success=False,
                text="",
                markdown="",
                tables=[],
                metadata={},
                error="Docling não está instalado. Execute: pip install docling"
            )
        
        if not os.path.exists(file_path):
            return ProcessedDocument(
                success=False,
                text="",
                markdown="",
                tables=[],
                metadata={},
                error=f"Arquivo não encontrado: {file_path}"
            )
        
        try:
            converter = self._get_converter()
            
            # Processar documento
            result = converter.convert(file_path)
            
            # Extrair texto
            text = result.document.export_to_text()
            markdown = result.document.export_to_markdown()
            
            # Extrair tabelas
            tables = []
            if options.extract_tables:
                for table in result.document.tables:
                    table_data = {
                        "rows": len(table.data),
                        "cols": len(table.data[0]) if table.data else 0,
                        "data": table.data,
                    }
                    if hasattr(table, 'caption'):
                        table_data["caption"] = table.caption
                    tables.append(table_data)
            
            # Metadados
            metadata = {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "tables_count": len(tables),
                "text_length": len(text)
            }
            if hasattr(result.document, 'num_pages'):
                metadata["pages"] = result.document.num_pages
            
            logger.info(
                "document_processed",
                extra={
                    "file_path": file_path,
                    "pages": metadata.get("pages"),
                    "tables": len(tables),
                    "text_length": len(text)
                }
            )
            
            return ProcessedDocument(
                success=True,
                text=text,
                markdown=markdown,
                tables=tables,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(
                "document_processing_error",
                extra={"file_path": file_path, "error": str(e)}
            )
            return ProcessedDocument(
                success=False,
                text="",
                markdown="",
                tables=[],
                metadata={"file_path": file_path},
                error=str(e)
            )
    
    async def process_bytes(
        self,
        content: bytes,
        filename: str,
        options: Optional[ProcessingOptions] = None
    ) -> ProcessedDocument:
        """
        Processa documento a partir de bytes.
        
        Args:
            content: Conteúdo do arquivo em bytes
            filename: Nome do arquivo (para determinar tipo)
            options: Opções de processamento
            
        Returns:
            ProcessedDocument
        """
        # Salvar em arquivo temporário
        suffix = Path(filename).suffix
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            return await self.process_file(tmp_path, options)
        finally:
            # Limpar arquivo temporário
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Singleton
_processor: Optional[DoclingProcessor] = None


def get_docling_processor() -> DoclingProcessor:
    """Retorna instância singleton do processador."""
    global _processor
    if _processor is None:
        _processor = DoclingProcessor()
    return _processor
