# agents/tests/services/test_knowledge.py
"""
Testes dos serviços de knowledge base (RAG).
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from src.services.knowledge.embedding_service import EmbeddingService, EmbeddingConfig
from src.services.knowledge.vector_store import VectorStore, VectorStoreConfig, SearchResult
from src.services.knowledge.rag_pipeline import RAGPipeline, RAGConfig, RAGResult
from src.services.knowledge.document_indexer import DocumentIndexer, DocumentMetadata, IndexingConfig


class TestEmbeddingService:
    """Testes do serviço de embeddings."""
    
    @pytest.fixture
    def service(self):
        """Cria serviço para testes."""
        return EmbeddingService()
    
    @pytest.mark.unit
    def test_default_config(self, service):
        """Verifica configuração padrão."""
        assert service.config.provider == "openai"
        assert service.config.model == "text-embedding-3-small"
        assert service.config.dimensions == 1536
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_embed_text_returns_vector(self, service, mock_openai_client):
        """Testa que embed_text retorna vetor."""
        with patch.object(service, '_get_openai_client', return_value=mock_openai_client):
            embedding = await service.embed_text("Texto de teste")
            
            assert isinstance(embedding, list)
            assert len(embedding) == 1536
            assert all(isinstance(x, (int, float)) for x in embedding)
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_embed_texts_batch(self, service, mock_openai_client):
        """Testa embedding em batch."""
        # Mock para retornar 3 embeddings
        mock_openai_client.embeddings.create = MagicMock(return_value=MagicMock(
            data=[
                MagicMock(embedding=[0.1] * 1536),
                MagicMock(embedding=[0.2] * 1536),
                MagicMock(embedding=[0.3] * 1536),
            ]
        ))
        
        with patch.object(service, '_get_openai_client', return_value=mock_openai_client):
            texts = ["Texto 1", "Texto 2", "Texto 3"]
            embeddings = await service.embed_texts(texts)
            
            assert len(embeddings) == 3
            for emb in embeddings:
                assert len(emb) == 1536
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_embed_empty_list_returns_empty(self, service):
        """Testa que lista vazia retorna lista vazia."""
        embeddings = await service.embed_texts([])
        assert embeddings == []
    
    @pytest.mark.unit
    def test_is_available_without_api_key(self, service):
        """Testa disponibilidade sem API key."""
        import os
        original = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = ""
        
        # Recriar serviço para pegar nova env
        new_service = EmbeddingService()
        available = new_service.is_available()
        
        # Restaurar
        if original:
            os.environ["OPENAI_API_KEY"] = original
        
        # Sem API key, não deve estar disponível para OpenAI
        assert available is False or not original
    
    @pytest.mark.unit
    def test_embedding_config_local_model(self):
        """Testa configuração para modelo local."""
        config = EmbeddingConfig(
            provider="local",
            local_model="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        
        assert config.provider == "local"
        assert "sentence-transformers" in config.local_model


class TestVectorStore:
    """Testes do vector store."""
    
    @pytest.fixture
    def store(self):
        """Cria store para testes."""
        return VectorStore()
    
    @pytest.mark.unit
    def test_default_config(self, store):
        """Verifica configuração padrão."""
        assert store.config.collection_name == "auracore_knowledge"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_search_returns_results(self, store, mock_chroma_collection):
        """Testa busca no vector store."""
        with patch.object(store, '_get_collection', return_value=mock_chroma_collection):
            results = await store.search(
                query_embedding=[0.1] * 1536,
                top_k=5
            )
            
            assert len(results) == 2  # Conforme mock
            assert results[0].id == "doc1"
            assert results[0].score > 0
            assert results[0].content is not None
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_add_documents(self, store, mock_chroma_collection):
        """Testa adição de documentos."""
        with patch.object(store, '_get_collection', return_value=mock_chroma_collection):
            await store.add_documents(
                ids=["doc1"],
                contents=["Conteúdo de teste"],
                embeddings=[[0.1] * 1536],
                metadatas=[{"title": "Test", "type": "law"}]
            )
            
            mock_chroma_collection.upsert.assert_called_once()
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_add_documents_empty_does_nothing(self, store, mock_chroma_collection):
        """Testa que lista vazia não chama upsert."""
        with patch.object(store, '_get_collection', return_value=mock_chroma_collection):
            await store.add_documents(
                ids=[],
                contents=[],
                embeddings=[],
                metadatas=[]
            )
            
            mock_chroma_collection.upsert.assert_not_called()
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_stats(self, store, mock_chroma_collection):
        """Testa estatísticas."""
        with patch.object(store, '_get_collection', return_value=mock_chroma_collection):
            stats = await store.get_stats()
            
            assert "name" in stats
            assert "count" in stats
            assert stats["count"] == 100  # Conforme mock
    
    @pytest.mark.unit
    def test_search_result_dataclass(self):
        """Testa dataclass SearchResult."""
        result = SearchResult(
            id="test-id",
            content="Test content",
            metadata={"title": "Test"},
            score=0.95
        )
        
        assert result.id == "test-id"
        assert result.score == 0.95


class TestRAGPipeline:
    """Testes do RAG Pipeline."""
    
    @pytest.fixture
    def pipeline(self):
        """Cria pipeline para testes."""
        return RAGPipeline()
    
    @pytest.mark.unit
    def test_default_config(self, pipeline):
        """Verifica configuração padrão."""
        assert pipeline.config.top_k == 5
        assert pipeline.config.min_score == 0.3
        assert pipeline.config.max_context_length == 4000
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_retrieve_returns_rag_result(
        self, 
        pipeline,
        mock_openai_client,
        mock_chroma_collection
    ):
        """Testa que retrieve retorna RAGResult."""
        with patch.object(pipeline.embeddings, '_get_openai_client', return_value=mock_openai_client):
            with patch.object(pipeline.vector_store, '_get_collection', return_value=mock_chroma_collection):
                result = await pipeline.retrieve("Qual a alíquota de ICMS?")
                
                assert isinstance(result, RAGResult)
                assert result.query == "Qual a alíquota de ICMS?"
                assert len(result.context) > 0
                assert len(result.sources) > 0
    
    @pytest.mark.unit
    def test_rag_result_format_for_prompt(self):
        """Testa formatação de contexto para prompt."""
        result = RAGResult(
            query="Teste",
            context="Contexto de teste sobre legislação",
            sources=[
                {"title": "Lei Kandir", "type": "law", "score": 0.9},
                {"title": "Manual SPED", "type": "manual", "score": 0.8}
            ],
            total_results=2
        )
        
        formatted = result.format_for_prompt()
        
        assert "CONTEXTO" in formatted
        assert "Contexto de teste" in formatted
        assert "Lei Kandir" in formatted
        assert "FONTES" in formatted
    
    @pytest.mark.unit
    def test_rag_result_empty_context(self):
        """Testa formatação com contexto vazio."""
        result = RAGResult(
            query="Teste",
            context="",
            sources=[],
            total_results=0
        )
        
        formatted = result.format_for_prompt()
        
        assert "Nenhuma informação" in formatted
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_retrieve_with_filter(
        self, 
        pipeline,
        mock_openai_client,
        mock_chroma_collection
    ):
        """Testa retrieve com filtro de tipo."""
        with patch.object(pipeline.embeddings, '_get_openai_client', return_value=mock_openai_client):
            with patch.object(pipeline.vector_store, '_get_collection', return_value=mock_chroma_collection):
                result = await pipeline.retrieve(
                    "Teste",
                    filter_type="law"
                )
                
                assert result is not None


class TestDocumentIndexer:
    """Testes do indexador de documentos."""
    
    @pytest.fixture
    def indexer(self):
        """Cria indexador para testes."""
        return DocumentIndexer()
    
    @pytest.mark.unit
    def test_default_config(self, indexer):
        """Verifica configuração padrão."""
        assert indexer.config.chunk_size == 1000
        assert indexer.config.chunk_overlap == 200
        assert indexer.config.min_chunk_size == 100
    
    @pytest.mark.unit
    def test_chunk_text_single_paragraph(self, indexer):
        """Testa chunking de parágrafo único."""
        text = "Parágrafo curto de teste."
        chunks = indexer._chunk_text(text)
        
        # Texto menor que chunk_size deve resultar em 1 chunk (se >= min_chunk_size)
        assert len(chunks) <= 1
    
    @pytest.mark.unit
    def test_chunk_text_multiple_paragraphs(self, indexer):
        """Testa chunking de múltiplos parágrafos."""
        # Criar texto longo com múltiplos parágrafos
        paragraphs = ["Parágrafo " + str(i) + ". " * 50 for i in range(10)]
        long_text = "\n\n".join(paragraphs)
        
        chunks = indexer._chunk_text(long_text)
        
        assert len(chunks) > 1
        # Cada chunk deve respeitar o tamanho máximo
        for chunk in chunks:
            assert len(chunk) <= indexer.config.chunk_size + indexer.config.chunk_overlap + 100
    
    @pytest.mark.unit
    def test_generate_doc_id_deterministic(self, indexer):
        """Testa que ID é determinístico para mesmo conteúdo."""
        metadata = DocumentMetadata(title="Test", type="law")
        
        id1 = indexer._generate_doc_id("Conteúdo de teste", metadata)
        id2 = indexer._generate_doc_id("Conteúdo de teste", metadata)
        id3 = indexer._generate_doc_id("Conteúdo diferente", metadata)
        
        assert id1 == id2  # Mesmo conteúdo = mesmo ID
        assert id1 != id3  # Conteúdo diferente = ID diferente
    
    @pytest.mark.unit
    def test_generate_doc_id_format(self, indexer):
        """Testa formato do ID (MD5 hex)."""
        metadata = DocumentMetadata(title="Test", type="law")
        doc_id = indexer._generate_doc_id("Conteúdo", metadata)
        
        assert len(doc_id) == 32  # MD5 hex tem 32 chars
        assert all(c in "0123456789abcdef" for c in doc_id)
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_index_text_empty_fails(self, indexer):
        """Testa que texto vazio falha."""
        metadata = DocumentMetadata(title="Test", type="law")
        result = await indexer.index_text("", metadata)
        
        assert result.success is False
        assert "vazio" in result.error.lower() or "empty" in result.error.lower()
    
    @pytest.mark.unit
    def test_document_metadata_fields(self):
        """Testa campos de DocumentMetadata."""
        metadata = DocumentMetadata(
            title="Lei Kandir",
            type="law",
            source="documento.pdf",
            law_number="LC 87/96",
            article="Art. 1º",
            year=1996,
            organization_id=1
        )
        
        assert metadata.title == "Lei Kandir"
        assert metadata.type == "law"
        assert metadata.law_number == "LC 87/96"
        assert metadata.year == 1996
    
    @pytest.mark.unit
    def test_indexing_config_defaults(self):
        """Testa valores padrão de IndexingConfig."""
        config = IndexingConfig()
        
        assert config.chunk_size == 1000
        assert config.chunk_overlap == 200
        assert config.min_chunk_size == 100
