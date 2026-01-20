# agents/src/services/knowledge/document_indexer.py
"""
Indexador de documentos para a base de conhecimento.

Suporta:
- PDFs de legislação
- Arquivos de texto/markdown
- Chunking inteligente
"""

import os
import hashlib
from typing import List, Optional, Literal
from dataclasses import dataclass
from pathlib import Path
import structlog

from .embedding_service import EmbeddingService, get_embedding_service
from .vector_store import VectorStore, get_vector_store
from ..document_processing import DoclingProcessor, get_docling_processor

logger = structlog.get_logger()


@dataclass
class IndexingConfig:
    """Configuração de indexação."""
    chunk_size: int = 1000  # Caracteres por chunk
    chunk_overlap: int = 200  # Sobreposição entre chunks
    min_chunk_size: int = 100  # Tamanho mínimo


@dataclass
class DocumentMetadata:
    """Metadados do documento."""
    title: str
    type: Literal["law", "manual", "regulation", "article", "other"]
    source: Optional[str] = None
    law_number: Optional[str] = None
    article: Optional[str] = None
    year: Optional[int] = None
    organization_id: Optional[int] = None  # Para documentos específicos de org


@dataclass
class IndexingResult:
    """Resultado da indexação."""
    success: bool
    document_id: str
    chunks_indexed: int
    error: Optional[str] = None


class DocumentIndexer:
    """
    Indexador de documentos para RAG.
    
    Uso:
        indexer = DocumentIndexer()
        
        # Indexar PDF
        result = await indexer.index_pdf(
            file_path="/path/to/lei_kandir.pdf",
            metadata=DocumentMetadata(
                title="Lei Kandir - LC 87/96",
                type="law",
                law_number="LC 87/96",
                year=1996
            )
        )
        
        # Indexar texto
        result = await indexer.index_text(
            content="Art. 1º Compete aos Estados...",
            metadata=DocumentMetadata(...)
        )
    """
    
    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store: Optional[VectorStore] = None,
        docling: Optional[DoclingProcessor] = None,
        config: Optional[IndexingConfig] = None
    ):
        self.embeddings = embedding_service or get_embedding_service()
        self.vector_store = vector_store or get_vector_store()
        self.docling = docling or get_docling_processor()
        self.config = config or IndexingConfig()
        
        logger.info("document_indexer_initialized")
    
    def _generate_doc_id(self, content: str, metadata: DocumentMetadata) -> str:
        """Gera ID único para documento."""
        hash_input = f"{metadata.title}:{metadata.type}:{content[:100]}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    def _chunk_text(self, text: str) -> List[str]:
        """
        Divide texto em chunks com sobreposição.
        
        Estratégia:
        - Tenta quebrar em parágrafos
        - Se parágrafo muito grande, quebra por sentenças
        - Mantém sobreposição para contexto
        """
        chunks: List[str] = []
        
        # Primeiro, dividir por parágrafos duplos
        paragraphs = text.split('\n\n')
        
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # Se parágrafo cabe no chunk atual
            if len(current_chunk) + len(para) <= self.config.chunk_size:
                current_chunk += "\n\n" + para if current_chunk else para
            else:
                # Salvar chunk atual se tiver tamanho mínimo
                if len(current_chunk) >= self.config.min_chunk_size:
                    chunks.append(current_chunk.strip())
                
                # Se parágrafo é muito grande, dividir
                if len(para) > self.config.chunk_size:
                    # Dividir por sentenças
                    sentences = para.replace('. ', '.\n').split('\n')
                    current_chunk = ""
                    
                    for sent in sentences:
                        if len(current_chunk) + len(sent) <= self.config.chunk_size:
                            current_chunk += " " + sent if current_chunk else sent
                        else:
                            if len(current_chunk) >= self.config.min_chunk_size:
                                chunks.append(current_chunk.strip())
                            current_chunk = sent
                else:
                    # Iniciar novo chunk com overlap
                    if chunks:
                        # Pegar final do chunk anterior como overlap
                        overlap = chunks[-1][-self.config.chunk_overlap:]
                        current_chunk = overlap + "\n\n" + para
                    else:
                        current_chunk = para
        
        # Adicionar último chunk
        if current_chunk and len(current_chunk) >= self.config.min_chunk_size:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    async def index_pdf(
        self,
        file_path: str,
        metadata: DocumentMetadata
    ) -> IndexingResult:
        """
        Indexa documento PDF.
        
        Args:
            file_path: Caminho do arquivo PDF
            metadata: Metadados do documento
            
        Returns:
            IndexingResult
        """
        logger.info("indexing_pdf", file_path=file_path, title=metadata.title)
        
        if not os.path.exists(file_path):
            return IndexingResult(
                success=False,
                document_id="",
                chunks_indexed=0,
                error=f"Arquivo não encontrado: {file_path}"
            )
        
        # Extrair texto com Docling
        doc_result = await self.docling.process_file(file_path)
        
        if not doc_result.success:
            return IndexingResult(
                success=False,
                document_id="",
                chunks_indexed=0,
                error=doc_result.error
            )
        
        # Indexar o texto extraído
        return await self.index_text(doc_result.text, metadata)
    
    async def index_text(
        self,
        content: str,
        metadata: DocumentMetadata
    ) -> IndexingResult:
        """
        Indexa texto direto.
        
        Args:
            content: Conteúdo textual
            metadata: Metadados
            
        Returns:
            IndexingResult
        """
        logger.info("indexing_text", title=metadata.title, length=len(content))
        
        if not content.strip():
            return IndexingResult(
                success=False,
                document_id="",
                chunks_indexed=0,
                error="Conteúdo vazio"
            )
        
        # Gerar ID do documento
        doc_id = self._generate_doc_id(content, metadata)
        
        # Dividir em chunks
        chunks = self._chunk_text(content)
        
        if not chunks:
            return IndexingResult(
                success=False,
                document_id=doc_id,
                chunks_indexed=0,
                error="Nenhum chunk gerado"
            )
        
        logger.info("chunks_created", count=len(chunks))
        
        # Gerar embeddings
        embeddings = await self.embeddings.embed_texts(chunks)
        
        # Preparar IDs e metadados para cada chunk
        chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        chunk_metadatas = [
            {
                "title": metadata.title,
                "type": metadata.type,
                "source": metadata.source,
                "law_number": metadata.law_number,
                "article": metadata.article,
                "year": metadata.year,
                "organization_id": metadata.organization_id,
                "document_id": doc_id,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
            for i in range(len(chunks))
        ]
        
        # Adicionar ao vector store
        await self.vector_store.add_documents(
            ids=chunk_ids,
            contents=chunks,
            embeddings=embeddings,
            metadatas=chunk_metadatas
        )
        
        logger.info(
            "document_indexed",
            doc_id=doc_id,
            chunks=len(chunks)
        )
        
        return IndexingResult(
            success=True,
            document_id=doc_id,
            chunks_indexed=len(chunks)
        )
    
    async def index_directory(
        self,
        directory: str,
        doc_type: Literal["law", "manual", "regulation", "article", "other"],
        recursive: bool = True
    ) -> List[IndexingResult]:
        """
        Indexa todos os PDFs de um diretório.
        
        Args:
            directory: Caminho do diretório
            doc_type: Tipo dos documentos
            recursive: Buscar em subdiretórios
            
        Returns:
            Lista de IndexingResult
        """
        results: List[IndexingResult] = []
        path = Path(directory)
        
        pattern = "**/*.pdf" if recursive else "*.pdf"
        
        for pdf_file in path.glob(pattern):
            metadata = DocumentMetadata(
                title=pdf_file.stem,
                type=doc_type,
                source=str(pdf_file)
            )
            
            result = await self.index_pdf(str(pdf_file), metadata)
            results.append(result)
        
        logger.info(
            "directory_indexed",
            directory=directory,
            files=len(results),
            successful=sum(1 for r in results if r.success)
        )
        
        return results
