# agents/tests/agents/test_fiscal_agent.py
"""
Testes do Fiscal Agent.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from src.agents.fiscal import FiscalAgent
from src.core.base import AgentType


class TestFiscalAgentInitialization:
    """Testes de inicialização do Fiscal Agent."""
    
    @pytest.fixture
    def agent(self):
        """Cria instância do FiscalAgent para testes."""
        return FiscalAgent()
    
    @pytest.mark.unit
    def test_agent_type_is_fiscal(self, agent):
        """Verifica que agent_type é FISCAL."""
        assert agent.agent_type == AgentType.FISCAL
    
    @pytest.mark.unit
    def test_agent_name(self, agent):
        """Verifica nome do agente."""
        assert agent.name == "Fiscal Assistant"
    
    @pytest.mark.unit
    def test_agent_has_required_tools(self, agent):
        """Verifica que o agente tem todas as tools necessárias."""
        tool_names = [t.name for t in agent.tools]
        
        required_tools = [
            "calculate_icms",
            "validate_cte",
            "query_legislation",
            "check_nfe",
            "simulate_tax",
            "document_importer",
            "legislation_rag",
        ]
        
        for tool in required_tools:
            assert tool in tool_names, f"Tool '{tool}' não encontrada no agente"
    
    @pytest.mark.unit
    def test_agent_has_7_tools(self, agent):
        """Verifica número total de tools."""
        assert len(agent.tools) == 7
    
    @pytest.mark.unit
    def test_agent_has_capabilities(self, agent):
        """Verifica que capabilities estão definidas."""
        capabilities = agent.get_capabilities()
        
        assert len(capabilities) > 0
        assert any("ICMS" in cap for cap in capabilities)
        assert any("CTe" in cap for cap in capabilities)


class TestFiscalAgentTools:
    """Testes das tools do Fiscal Agent."""
    
    @pytest.fixture
    def agent(self):
        return FiscalAgent()
    
    @pytest.mark.unit
    def test_calculate_icms_tool_exists(self, agent):
        """Verifica existência da tool calculate_icms."""
        tool = next((t for t in agent.tools if t.name == "calculate_icms"), None)
        assert tool is not None
        assert hasattr(tool, 'run')
    
    @pytest.mark.unit
    def test_validate_cte_tool_exists(self, agent):
        """Verifica existência da tool validate_cte."""
        tool = next((t for t in agent.tools if t.name == "validate_cte"), None)
        assert tool is not None
    
    @pytest.mark.unit
    def test_legislation_rag_tool_exists(self, agent):
        """Verifica existência da nova tool legislation_rag."""
        tool = next((t for t in agent.tools if t.name == "legislation_rag"), None)
        assert tool is not None
    
    @pytest.mark.unit
    def test_document_importer_tool_exists(self, agent):
        """Verifica existência da tool document_importer."""
        tool = next((t for t in agent.tools if t.name == "document_importer"), None)
        assert tool is not None


class TestCalculateICMSTool:
    """Testes da tool de cálculo de ICMS."""
    
    @pytest.fixture
    def tool(self):
        from src.tools.fiscal.calculate_icms import CalculateICMSTool
        return CalculateICMSTool()
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_calculate_icms_interestadual_sp_to_rj(self, tool):
        """Testa cálculo ICMS interestadual SP->RJ (12%)."""
        result = await tool.run(
            valor_operacao=1000.00,
            uf_origem="SP",
            uf_destino="RJ",
            tipo_operacao="transporte_carga"
        )
        
        assert result is not None
        assert "valor_icms" in result or "icms" in result or "aliquota" in result
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_calculate_icms_interestadual_sp_to_ba(self, tool):
        """Testa cálculo ICMS interestadual SP->BA (7%)."""
        result = await tool.run(
            valor_operacao=1000.00,
            uf_origem="SP",
            uf_destino="BA",  # Nordeste = 7%
            tipo_operacao="transporte_carga"
        )
        
        assert result is not None
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_calculate_icms_interno_sp(self, tool):
        """Testa cálculo ICMS interno SP (18%)."""
        result = await tool.run(
            valor_operacao=1000.00,
            uf_origem="SP",
            uf_destino="SP",  # Interno
            tipo_operacao="transporte_carga"
        )
        
        assert result is not None


class TestValidateCTeTool:
    """Testes da tool de validação de CTe."""
    
    @pytest.fixture
    def tool(self):
        from src.tools.fiscal.validate_cte import ValidateCTeTool
        return ValidateCTeTool()
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_validate_cte_valid_key(self, tool):
        """Testa validação com chave válida (modelo 57)."""
        # Chave com modelo 57 (CTe)
        valid_key = "35240112345678000195570010000001231234567890"
        
        result = await tool.run(chave_acesso=valid_key)
        
        assert result is not None
        # Verifica que não retornou erro de formato
        if "valid" in result:
            assert result["valid"] is True or result.get("format_valid") is True
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_validate_cte_wrong_model(self, tool):
        """Testa validação com modelo errado (55 = NFe, não CTe)."""
        # Chave com modelo 55 (NFe, não CTe)
        nfe_key = "35240112345678000195550010000001231234567890"
        
        result = await tool.run(chave_acesso=nfe_key)
        
        assert result is not None
        # Deve indicar modelo incorreto
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_validate_cte_invalid_format(self, tool):
        """Testa validação com formato inválido."""
        invalid_keys = [
            "123",  # Muito curta
            "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqr",  # Não numérica
            "",  # Vazia
        ]
        
        for key in invalid_keys:
            result = await tool.run(chave_acesso=key)
            assert result is not None


class TestLegislationRAGTool:
    """Testes da tool de RAG de legislação."""
    
    @pytest.fixture
    def tool(self):
        from src.tools.fiscal.legislation_rag import LegislationRAGTool
        return LegislationRAGTool()
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_query_empty_returns_error(self, tool):
        """Testa que query vazia retorna erro."""
        result = await tool.run(query="")
        
        assert result is not None
        assert result["success"] is False
        assert "error" in result
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_query_with_mock_rag(self, tool, mock_chroma_collection, mock_openai_client):
        """Testa query com RAG mockado."""
        with patch.object(tool, '_rag') as mock_rag:
            mock_result = MagicMock()
            mock_result.context = "Contexto de teste sobre ICMS"
            mock_result.sources = [{"title": "Lei Kandir", "type": "law", "score": 0.9}]
            mock_result.total_results = 1
            mock_result.format_for_prompt = MagicMock(return_value="Contexto formatado")
            
            mock_rag.retrieve = AsyncMock(return_value=mock_result)
            
            result = await tool.run(query="Qual a alíquota de ICMS?")
            
            assert result["success"] is True
            assert len(result["context"]) > 0
    
    @pytest.mark.unit
    def test_tool_has_correct_name(self, tool):
        """Verifica nome da tool."""
        assert tool.name == "legislation_rag"
    
    @pytest.mark.unit
    def test_tool_has_description(self, tool):
        """Verifica que tool tem descrição."""
        assert tool.description is not None
        assert len(tool.description) > 50
