# agents/tests/conftest.py
"""
Fixtures globais para testes.

Configuração:
- Variáveis de ambiente de teste
- Mocks de serviços externos
- Fixtures de dados de exemplo
"""

import os
import pytest
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, Any

# Configurar variáveis de ambiente para testes ANTES de importar módulos
os.environ["ANTHROPIC_API_KEY"] = "sk-ant-test-key"
os.environ["OPENAI_API_KEY"] = "sk-test-openai-key"
os.environ["AURACORE_API_URL"] = "http://localhost:3000"
os.environ["CHROMA_HOST"] = "localhost"
os.environ["CHROMA_PORT"] = "8000"
os.environ["LOG_LEVEL"] = "DEBUG"


# ===== FIXTURES DE CONTEXTO =====

@pytest.fixture
def mock_context():
    """Contexto de teste padrão."""
    from src.core.base import AgentContext
    return AgentContext(
        user_id="test-user-123",
        org_id=1,
        branch_id=1,
        role="admin",
        permissions=["*"]
    )


@pytest.fixture
def execution_context() -> Dict[str, Any]:
    """Contexto de execução como dicionário."""
    return {
        "user_id": "test-user-123",
        "org_id": 1,
        "branch_id": 1,
        "session_id": "test-session-456"
    }


@pytest.fixture
def voice_context():
    """Contexto para testes de voz."""
    from src.services.voice.voice_processor import VoiceContext
    return VoiceContext(
        user_id="test-user",
        org_id=1,
        branch_id=1,
        session_id="test-session"
    )


# ===== MOCKS DE SERVIÇOS EXTERNOS =====

@pytest.fixture
def mock_anthropic_client():
    """Mock do cliente Anthropic."""
    client = MagicMock()
    client.messages.create = AsyncMock(return_value=MagicMock(
        content=[MagicMock(text="Resposta de teste do agente")]
    ))
    return client


@pytest.fixture
def mock_openai_client():
    """Mock do cliente OpenAI (embeddings)."""
    client = MagicMock()
    # Retorna embedding de 1536 dimensões
    client.embeddings.create = MagicMock(return_value=MagicMock(
        data=[MagicMock(embedding=[0.1] * 1536)]
    ))
    return client


@pytest.fixture
def mock_google_speech():
    """Mock do Google Cloud Speech."""
    mock = MagicMock()
    mock.recognize = MagicMock(return_value=MagicMock(
        results=[MagicMock(
            alternatives=[MagicMock(
                transcript="Texto transcrito de teste",
                confidence=0.95
            )]
        )]
    ))
    return mock


@pytest.fixture
def mock_google_tts():
    """Mock do Google Cloud TTS."""
    mock = MagicMock()
    mock.synthesize_speech = MagicMock(return_value=MagicMock(
        audio_content=b"fake-audio-content"
    ))
    return mock


@pytest.fixture
def mock_chroma_collection():
    """Mock do ChromaDB collection."""
    collection = MagicMock()
    collection.query = MagicMock(return_value={
        "ids": [["doc1", "doc2"]],
        "documents": [["Conteúdo do documento 1 sobre ICMS", "Conteúdo do documento 2 sobre PIS"]],
        "metadatas": [[
            {"title": "Lei Kandir", "type": "law", "law_number": "LC 87/96"},
            {"title": "Lei PIS", "type": "law", "law_number": "Lei 10.637/02"}
        ]],
        "distances": [[0.1, 0.2]]
    })
    collection.count = MagicMock(return_value=100)
    collection.upsert = MagicMock()
    collection.name = "test_collection"
    collection.metadata = {"hnsw:space": "cosine"}
    return collection


@pytest.fixture
def mock_chroma_client(mock_chroma_collection):
    """Mock do cliente ChromaDB."""
    client = MagicMock()
    client.get_or_create_collection = MagicMock(return_value=mock_chroma_collection)
    client.heartbeat = MagicMock(return_value=True)
    return client


# ===== FIXTURES DE DADOS =====

@pytest.fixture
def sample_danfe_text() -> str:
    """Texto de exemplo de DANFe para testes."""
    return """
    DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
    
    CHAVE DE ACESSO: 35240112345678000195550010000001231234567890
    
    EMITENTE
    CNPJ: 12.345.678/0001-95
    Razão Social: EMPRESA TESTE LTDA
    
    DESTINATÁRIO
    CNPJ: 98.765.432/0001-10
    Nome: CLIENTE TESTE SA
    
    DADOS DOS PRODUTOS
    Código    Descrição           NCM          Qtd    Valor Unit    Valor Total
    001       Produto Teste A     12345678     10     100,00        1.000,00
    002       Produto Teste B     87654321     5      200,00        1.000,00
    
    VALOR TOTAL DOS PRODUTOS: R$ 2.000,00
    VALOR DO ICMS: R$ 360,00
    VALOR TOTAL DA NOTA: R$ 2.000,00
    
    DATA DE EMISSÃO: 20/01/2026
    """


@pytest.fixture
def sample_dacte_text() -> str:
    """Texto de exemplo de DACTe para testes."""
    return """
    DACTE - DOCUMENTO AUXILIAR DO CONHECIMENTO DE TRANSPORTE ELETRÔNICO
    
    CHAVE DE ACESSO: 35240112345678000195570010000001231234567890
    
    CT-e Nº 123 SÉRIE 1
    
    TRANSPORTADOR
    CNPJ: 11.222.333/0001-44
    Razão Social: TRANSPORTADORA TESTE LTDA
    
    REMETENTE
    CNPJ: 12.345.678/0001-95
    
    DESTINATÁRIO  
    CNPJ: 98.765.432/0001-10
    
    PRODUTO PREDOMINANTE: CARGA GERAL
    VALOR DA CARGA: R$ 50.000,00
    PESO BRUTO: 1.500 KG
    
    VALOR TOTAL DO SERVIÇO: R$ 2.500,00
    VALOR DO ICMS: R$ 300,00
    
    VEÍCULO
    PLACA: ABC1234
    UF: SP
    
    DATA DE EMISSÃO: 20/01/2026
    """


@pytest.fixture
def sample_audio_bytes() -> bytes:
    """Bytes de áudio fake para testes (simula WAV header)."""
    # RIFF header fake para simular arquivo de áudio
    return b"RIFF" + b"\x00" * 100


@pytest.fixture
def sample_legislation_chunks() -> list:
    """Chunks de legislação para testes de RAG."""
    return [
        {
            "id": "chunk1",
            "content": "Art. 1º Compete aos Estados e ao Distrito Federal instituir o imposto sobre operações relativas à circulação de mercadorias.",
            "metadata": {
                "title": "Lei Kandir - LC 87/96",
                "type": "law",
                "law_number": "LC 87/96",
                "year": 1996
            }
        },
        {
            "id": "chunk2", 
            "content": "Alíquota interestadual: 7% para N/NE/CO, 12% para S/SE.",
            "metadata": {
                "title": "Lei Kandir - LC 87/96",
                "type": "law",
                "law_number": "LC 87/96",
                "year": 1996
            }
        }
    ]


# ===== HELPERS =====

@pytest.fixture
def assert_result_success():
    """Helper para verificar resultado de sucesso."""
    def _assert(result):
        if isinstance(result, dict):
            assert result.get("success", True) is True or "error" not in result
        elif hasattr(result, "success"):
            assert result.success is True
        elif hasattr(result, "is_ok"):
            assert result.is_ok()
    return _assert


@pytest.fixture
def assert_result_error():
    """Helper para verificar resultado de erro."""
    def _assert(result, expected_msg: str = None):
        if isinstance(result, dict):
            assert "error" in result or result.get("success") is False
            if expected_msg:
                assert expected_msg.lower() in str(result.get("error", "")).lower()
        elif hasattr(result, "success"):
            assert result.success is False
    return _assert
