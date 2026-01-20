"""Testes unitários para agentes."""
import pytest


class TestFiscalAgent:
    """Testes do Fiscal Agent."""
    
    def test_initialization(self):
        from src.agents.fiscal import FiscalAgent
        agent = FiscalAgent()
        
        assert agent.name == "Fiscal Assistant"
        assert agent.agent_type == "fiscal"
        assert len(agent.tools) == 5
    
    def test_tools_registered(self):
        from src.agents.fiscal import FiscalAgent
        agent = FiscalAgent()
        
        names = [t.name for t in agent.tools]
        assert "query_legislation" in names
        assert "calculate_icms" in names
        assert "validate_cte" in names


class TestFinancialAgent:
    """Testes do Financial Agent."""
    
    def test_initialization(self):
        from src.agents.financial import FinancialAgent
        agent = FinancialAgent()
        
        assert agent.name == "Financial Assistant"
        assert agent.agent_type == "financial"
        assert len(agent.tools) == 3
    
    def test_tools_registered(self):
        from src.agents.financial import FinancialAgent
        agent = FinancialAgent()
        
        names = [t.name for t in agent.tools]
        assert "forecast_cashflow" in names
        assert "reconcile_bank" in names
        assert "suggest_payments" in names
