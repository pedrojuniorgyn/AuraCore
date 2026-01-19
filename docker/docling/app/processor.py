"""
Docling Processor
=================

Encapsula a lógica de processamento de documentos usando Docling.
Provê métodos para extração de texto, tabelas e metadados.

@module docling/app/processor
@see E-Agent-Fase-D1
"""

import logging
import os
from typing import Any

logger = logging.getLogger("docling-processor")


class DoclingProcessor:
    """
    Processador de documentos usando Docling.

    Fornece métodos para:
    - Processamento completo (texto + tabelas + metadata)
    - Extração de tabelas
    - Extração de texto
    """

    def __init__(self) -> None:
        """Inicializa o processador Docling."""
        self._converter: Any = None
        self._docling_version: str = "unknown"
        self._initialize()

    def _initialize(self) -> None:
        """Inicializa o conversor Docling (lazy loading)."""
        try:
            from docling.document_converter import DocumentConverter

            self._converter = DocumentConverter()

            # Obter versão do docling
            try:
                import docling

                self._docling_version = getattr(docling, "__version__", "2.0.0+")
            except (ImportError, AttributeError):
                self._docling_version = "2.0.0+"

            logger.info(f"Docling inicializado (versão: {self._docling_version})")
        except ImportError as e:
            logger.error(f"Erro ao importar Docling: {e}")
            raise RuntimeError(
                "Docling não instalado. Verifique requirements.txt"
            ) from e

    def get_docling_version(self) -> str:
        """Retorna versão do Docling."""
        return self._docling_version

    def process_document(self, file_path: str) -> dict[str, Any]:
        """
        Processa documento completo.

        Args:
            file_path: Caminho absoluto do arquivo PDF

        Returns:
            Dict com text, tables e metadata
        """
        logger.info(f"Processando documento: {file_path}")

        # Converter documento
        result = self._converter.convert(file_path)

        # Extrair texto
        text = result.document.export_to_markdown()

        # Extrair tabelas
        tables = self._extract_tables_from_result(result)

        # Extrair metadados
        metadata = self._extract_metadata(file_path, result)

        logger.info(
            f"Documento processado: {len(text)} chars, "
            f"{len(tables)} tabelas, {metadata['page_count']} páginas"
        )

        return {
            "text": text,
            "tables": tables,
            "metadata": metadata,
        }

    def extract_tables(self, file_path: str) -> list[dict[str, Any]]:
        """
        Extrai apenas tabelas do documento.

        Args:
            file_path: Caminho absoluto do arquivo PDF

        Returns:
            Lista de tabelas extraídas
        """
        logger.info(f"Extraindo tabelas: {file_path}")

        result = self._converter.convert(file_path)
        tables = self._extract_tables_from_result(result)

        logger.info(f"Tabelas extraídas: {len(tables)}")
        return tables

    def extract_text(self, file_path: str) -> str:
        """
        Extrai apenas texto do documento.

        Args:
            file_path: Caminho absoluto do arquivo PDF

        Returns:
            Texto extraído em formato markdown
        """
        logger.info(f"Extraindo texto: {file_path}")

        result = self._converter.convert(file_path)
        text = result.document.export_to_markdown()

        logger.info(f"Texto extraído: {len(text)} chars")
        return text

    def _extract_tables_from_result(self, result: Any) -> list[dict[str, Any]]:
        """
        Extrai tabelas do resultado do Docling.

        Args:
            result: Resultado da conversão Docling

        Returns:
            Lista de tabelas formatadas
        """
        tables: list[dict[str, Any]] = []
        table_index = 0

        # Iterar sobre elementos do documento
        for element in result.document.iterate_items():
            # Verificar se é uma tabela
            if hasattr(element, "table") and element.table is not None:
                table_data = self._parse_table(element.table, table_index)
                if table_data:
                    # Tentar obter número da página
                    page_number = 1
                    if hasattr(element, "prov") and element.prov:
                        for prov in element.prov:
                            if hasattr(prov, "page_no"):
                                page_number = prov.page_no
                                break

                    table_data["page_number"] = page_number

                    # Tentar obter bounding box
                    bbox = None
                    if hasattr(element, "prov") and element.prov:
                        for prov in element.prov:
                            if hasattr(prov, "bbox") and prov.bbox:
                                bbox = {
                                    "x": float(prov.bbox.l),
                                    "y": float(prov.bbox.t),
                                    "width": float(prov.bbox.r - prov.bbox.l),
                                    "height": float(prov.bbox.b - prov.bbox.t),
                                }
                                break

                    table_data["bbox"] = bbox
                    tables.append(table_data)
                    table_index += 1

        return tables

    def _parse_table(self, table: Any, index: int) -> dict[str, Any] | None:
        """
        Parse uma tabela do Docling para formato padronizado.

        Args:
            table: Objeto tabela do Docling
            index: Índice da tabela no documento

        Returns:
            Dict com headers e rows, ou None se inválida
        """
        try:
            # Exportar tabela para DataFrame
            df = table.export_to_dataframe()

            if df.empty:
                return None

            headers = [str(col) for col in df.columns.tolist()]
            rows = [[str(cell) for cell in row] for row in df.values.tolist()]

            return {
                "index": index,
                "headers": headers,
                "rows": rows,
            }
        except Exception as e:
            logger.warning(f"Erro ao parsear tabela {index}: {e}")
            return None

    def _extract_metadata(self, file_path: str, result: Any) -> dict[str, Any]:
        """
        Extrai metadados do documento.

        Args:
            file_path: Caminho do arquivo
            result: Resultado da conversão Docling

        Returns:
            Dict com metadados
        """
        # Tamanho do arquivo
        file_size = os.path.getsize(file_path)

        # Número de páginas
        page_count = 1
        if hasattr(result.document, "pages"):
            page_count = len(result.document.pages)

        # Metadados do documento
        title = None
        author = None
        creation_date = None

        if hasattr(result.document, "metadata"):
            meta = result.document.metadata
            title = getattr(meta, "title", None)
            author = getattr(meta, "author", None)
            creation_date = getattr(meta, "creation_date", None)
            if creation_date:
                creation_date = str(creation_date)

        return {
            "page_count": page_count,
            "title": title,
            "author": author,
            "creation_date": creation_date,
            "file_size": file_size,
        }
