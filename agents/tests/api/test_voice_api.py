# agents/tests/api/test_voice_api.py
"""
Testes dos endpoints de voz.
"""

import pytest
import base64
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client():
    """Cliente de teste FastAPI."""
    return TestClient(app)


class TestVoiceAPIEndpoints:
    """Testes dos endpoints de voz."""
    
    @pytest.mark.unit
    def test_voices_endpoint(self, client):
        """Testa listagem de vozes."""
        response = client.get("/api/voice/voices")
        
        assert response.status_code == 200
        data = response.json()
        assert "voices" in data
        assert "default" in data
    
    @pytest.mark.unit
    def test_health_endpoint(self, client):
        """Testa health check."""
        response = client.get("/api/voice/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "stt_available" in data
        assert "tts_available" in data
    
    @pytest.mark.unit
    def test_transcribe_requires_audio(self, client):
        """Testa que transcribe exige áudio."""
        response = client.post("/api/voice/transcribe", json={})
        
        # Deve retornar erro de validação (422)
        assert response.status_code == 422
    
    @pytest.mark.unit
    def test_transcribe_with_audio(self, client, sample_audio_bytes):
        """Testa transcrição com áudio válido."""
        audio_b64 = base64.b64encode(sample_audio_bytes).decode()
        
        with patch('src.api.voice.get_stt_service') as mock_stt:
            mock_service = MagicMock()
            mock_service.transcribe_bytes = AsyncMock(return_value=MagicMock(
                text="Texto transcrito",
                confidence=0.95,
                is_final=True
            ))
            mock_stt.return_value = mock_service
            
            response = client.post(
                "/api/voice/transcribe",
                json={
                    "audio_base64": audio_b64,
                    "encoding": "LINEAR16",
                    "language": "pt-BR"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["text"] == "Texto transcrito"
    
    @pytest.mark.unit
    def test_synthesize_requires_text(self, client):
        """Testa que synthesize exige texto."""
        response = client.post("/api/voice/synthesize", json={})
        
        assert response.status_code == 422
    
    @pytest.mark.unit
    def test_synthesize_with_valid_text(self, client):
        """Testa síntese com texto válido."""
        with patch('src.api.voice.get_tts_service') as mock_tts:
            mock_service = MagicMock()
            mock_service.synthesize = AsyncMock(return_value=MagicMock(
                success=True,
                audio_content=b"fake-audio",
                audio_format="mp3",
                error=None
            ))
            mock_tts.return_value = mock_service
            
            response = client.post(
                "/api/voice/synthesize",
                json={"text": "Texto para síntese"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "audio_base64" in data
    
    @pytest.mark.unit
    def test_synthesize_empty_text_fails(self, client):
        """Testa que texto vazio falha."""
        response = client.post(
            "/api/voice/synthesize",
            json={"text": ""}
        )
        
        # Pode ser 200 com success=False ou 422
        if response.status_code == 200:
            assert response.json()["success"] is False


class TestKnowledgeAPIEndpoints:
    """Testes dos endpoints de knowledge."""
    
    @pytest.mark.unit
    def test_stats_endpoint(self, client):
        """Testa endpoint de estatísticas."""
        with patch('src.api.knowledge.get_vector_store') as mock_store:
            mock_store.return_value.get_stats = AsyncMock(return_value={
                "name": "test_collection",
                "count": 50,
                "metadata": {}
            })
            
            response = client.get("/api/knowledge/stats")
            
            assert response.status_code == 200
            data = response.json()
            assert "collection_name" in data
            assert "total_documents" in data
    
    @pytest.mark.unit
    def test_health_endpoint(self, client):
        """Testa health check do knowledge."""
        response = client.get("/api/knowledge/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "embedding_service" in data
        assert "vector_store" in data
    
    @pytest.mark.unit
    def test_query_requires_query(self, client):
        """Testa que query exige parâmetro query."""
        response = client.post("/api/knowledge/query", json={})
        
        assert response.status_code == 422
    
    @pytest.mark.unit
    def test_query_with_valid_input(self, client, mock_chroma_collection, mock_openai_client):
        """Testa query com input válido."""
        with patch('src.api.knowledge.get_rag_pipeline') as mock_rag:
            mock_pipeline = MagicMock()
            mock_result = MagicMock()
            mock_result.context = "Contexto sobre ICMS"
            mock_result.sources = [{"title": "Lei Kandir", "type": "law", "score": 0.9}]
            mock_result.total_results = 1
            
            mock_pipeline.retrieve = AsyncMock(return_value=mock_result)
            mock_rag.return_value = mock_pipeline
            
            response = client.post(
                "/api/knowledge/query",
                json={
                    "query": "Qual a alíquota de ICMS?",
                    "top_k": 5
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "context" in data
            assert "sources" in data


class TestAgentsAPIEndpoints:
    """Testes dos endpoints de agentes."""
    
    @pytest.mark.unit
    def test_list_agents_endpoint(self, client):
        """Testa listagem de agentes."""
        response = client.get("/agents")
        
        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert len(data["agents"]) == 8  # 8 agentes
    
    @pytest.mark.unit
    def test_health_endpoint(self, client):
        """Testa health check geral."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
