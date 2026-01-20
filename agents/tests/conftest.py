# agents/tests/conftest.py
"""
Configuração global de testes.
"""

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock, AsyncMock

# Fixtures globais
pytest_plugins = [
    "tests.fixtures.auth",
    "tests.fixtures.agents",
    "tests.fixtures.documents",
]


@pytest.fixture(scope="session")
def event_loop():
    """Event loop para testes async."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def app():
    """Aplicação FastAPI para testes."""
    from src.main import app as fastapi_app
    yield fastapi_app


@pytest.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Cliente HTTP para testes de API."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
def mock_cache():
    """Mock do serviço de cache."""
    cache = MagicMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock(return_value=True)
    cache.delete = AsyncMock(return_value=True)
    cache.get_json = AsyncMock(return_value=None)
    cache.set_json = AsyncMock(return_value=True)
    return cache


@pytest.fixture
def mock_llm():
    """Mock do LLM para testes."""
    llm = MagicMock()
    llm.generate = AsyncMock(return_value={
        "content": "Resposta de teste do LLM",
        "tokens_input": 100,
        "tokens_output": 50
    })
    return llm
