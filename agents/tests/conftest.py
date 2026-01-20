"""Configurações compartilhadas para testes."""
import os
import pytest

# Configurar variáveis de ambiente para testes
os.environ["ANTHROPIC_API_KEY"] = "sk-ant-test-key"
os.environ["AURACORE_API_URL"] = "http://localhost:3000"
os.environ["CHROMA_HOST"] = "localhost"
os.environ["CHROMA_PORT"] = "8000"
os.environ["LOG_LEVEL"] = "DEBUG"


@pytest.fixture
def mock_context():
    """Contexto de teste."""
    from src.core.base import AgentContext
    return AgentContext(
        user_id="test-user",
        org_id=1,
        branch_id=1,
        role="admin",
        permissions=["*"]
    )
