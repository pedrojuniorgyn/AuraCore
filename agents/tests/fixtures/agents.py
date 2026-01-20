# agents/tests/fixtures/agents.py
"""
Fixtures de agents.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from typing import Dict, List, Any


@pytest.fixture
def fiscal_agent_response() -> Dict[str, Any]:
    """Resposta típica do FiscalAgent."""
    return {
        "message": "O ICMS para operação interestadual de SP para RJ é de 12%. "
                   "Para um valor de R$ 1.000,00, o ICMS será R$ 120,00.",
        "agent": "fiscal",
        "tool_calls": [
            {
                "tool": "calculate_icms",
                "input": {"origin": "SP", "destination": "RJ", "value": 1000},
                "output": {"rate": 0.12, "tax": 120}
            }
        ],
        "tokens_input": 150,
        "tokens_output": 80,
        "duration_ms": 1250,
        "session_id": "session_fiscal_001"
    }


@pytest.fixture
def financial_agent_response() -> Dict[str, Any]:
    """Resposta típica do FinancialAgent."""
    return {
        "message": "Título financeiro criado com sucesso. "
                   "Vencimento em 30 dias, valor R$ 1.000,00.",
        "agent": "financial",
        "tool_calls": [
            {
                "tool": "create_title",
                "input": {"value": 1000, "due_days": 30},
                "output": {"title_id": "TIT001", "due_date": "2026-02-20"}
            }
        ],
        "tokens_input": 120,
        "tokens_output": 60,
        "duration_ms": 800
    }


@pytest.fixture
def mock_fiscal_agent() -> MagicMock:
    """Mock do FiscalAgent."""
    agent = MagicMock()
    agent.name = "fiscal"
    agent.run = AsyncMock(return_value={
        "message": "Resposta fiscal de teste",
        "tool_calls": []
    })
    return agent


@pytest.fixture
def mock_agent_registry() -> MagicMock:
    """Mock do registro de agents."""
    registry = MagicMock()
    registry.get_agent = MagicMock()
    registry.list_agents = MagicMock(return_value=[
        "fiscal", "financial", "accounting", "tms",
        "wms", "crm", "fleet", "strategic"
    ])
    return registry


@pytest.fixture
def available_agents() -> List[str]:
    """Lista de agents disponíveis."""
    return [
        "fiscal",
        "financial", 
        "accounting",
        "tms",
        "wms",
        "crm",
        "fleet",
        "strategic"
    ]
