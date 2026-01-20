"""Serviço de processamento de documentos com Docling."""

from src.services.document_processing.docling_processor import (
    DoclingProcessor,
    ProcessedDocument,
    ProcessingOptions,
    get_docling_processor,
)
from src.services.document_processing.danfe_extractor import (
    DanfeExtractor,
    DanfeData,
    DanfeExtractionResult,
)
from src.services.document_processing.dacte_extractor import (
    DacteExtractor,
    DacteData,
    DacteExtractionResult,
)

__all__ = [
    # Docling Processor
    "DoclingProcessor",
    "ProcessedDocument",
    "ProcessingOptions",
    "get_docling_processor",
    # DANFe Extractor
    "DanfeExtractor",
    "DanfeData",
    "DanfeExtractionResult",
    # DACTe Extractor
    "DacteExtractor",
    "DacteData",
    "DacteExtractionResult",
]
