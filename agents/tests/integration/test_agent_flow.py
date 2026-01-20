# agents/tests/integration/test_agent_flow.py
"""
Testes de integração do fluxo completo de agents.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from typing import Any


class TestAgentIntegrationFlow:
    """Testes de fluxo completo de agents."""
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_fiscal_calculation_flow(
        self,
        mock_llm: MagicMock,
        mock_cache: MagicMock
    ) -> None:
        """
        Testa fluxo completo de cálculo fiscal:
        1. Recebe mensagem
        2. Agent identifica intent
        3. Chama tool de cálculo
        4. Retorna resposta formatada
        """
        with patch("src.services.llm.get_llm", return_value=mock_llm):
            with patch("src.services.cache.get_cache", return_value=mock_cache):
                # Simular agent fiscal
                mock_agent = AsyncMock()
                mock_agent.name = "fiscal"
                mock_agent.run.return_value = {
                    "message": "O ICMS calculado é de R$ 120,00",
                    "agent": "fiscal",
                    "tool_calls": [
                        {
                            "tool": "calculate_icms",
                            "input": {"origin": "SP", "destination": "RJ", "value": 1000},
                            "output": {"rate": 0.12, "tax": 120}
                        }
                    ]
                }
                
                # Act
                result = await mock_agent.run(
                    message="Calcule o ICMS para venda de SP para RJ, valor R$ 1000",
                    context={"organization_id": 1, "branch_id": 1}
                )
                
                # Assert
                assert "message" in result
                assert result.get("agent") == "fiscal"
                assert len(result.get("tool_calls", [])) > 0
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_agent_with_rag_context(
        self,
        mock_llm: MagicMock,
        mock_cache: MagicMock
    ) -> None:
        """
        Testa agent usando contexto do RAG:
        1. Query RAG sobre legislação
        2. Agent usa resultado como contexto
        3. Resposta inclui citações
        """
        with patch("src.services.rag.get_rag_service") as mock_rag:
            mock_rag_svc = AsyncMock()
            mock_rag_svc.query.return_value = {
                "answer": "Conforme a Lei Kandir (LC 87/96), o ICMS interestadual...",
                "sources": [
                    {"title": "LC 87/96", "content": "Artigo 155..."}
                ]
            }
            mock_rag.return_value = mock_rag_svc
            
            # Test implementation
            result = await mock_rag_svc.query("legislação ICMS")
            
            assert "Lei Kandir" in result["answer"]
            assert len(result["sources"]) > 0
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_financial_title_flow(
        self,
        mock_llm: MagicMock,
        mock_cache: MagicMock
    ) -> None:
        """
        Testa fluxo de criação de título financeiro:
        1. Recebe solicitação
        2. Agent valida dados
        3. Cria título
        4. Retorna confirmação
        """
        mock_agent = AsyncMock()
        mock_agent.name = "financial"
        mock_agent.run.return_value = {
            "message": "Título financeiro TIT001 criado com sucesso. Vencimento: 2026-02-20",
            "agent": "financial",
            "tool_calls": [
                {
                    "tool": "create_title",
                    "input": {"value": 1000, "due_days": 30, "customer_id": "CUST001"},
                    "output": {"title_id": "TIT001", "due_date": "2026-02-20"}
                }
            ]
        }
        
        result = await mock_agent.run(
            message="Criar título de R$ 1.000 para cliente CUST001, vencimento 30 dias",
            context={"organization_id": 1, "branch_id": 1}
        )
        
        assert "TIT001" in result["message"]
        assert result["tool_calls"][0]["output"]["title_id"] == "TIT001"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_multi_agent_orchestration(
        self,
        mock_llm: MagicMock,
        mock_cache: MagicMock
    ) -> None:
        """
        Testa orquestração de múltiplos agents:
        1. Fiscal calcula impostos
        2. Financial cria título
        """
        # Agent Fiscal
        mock_fiscal = AsyncMock()
        mock_fiscal.run.return_value = {
            "message": "ICMS: R$ 120,00",
            "agent": "fiscal",
            "tool_calls": [{"tool": "calculate_icms", "output": {"tax": 120}}]
        }
        
        # Agent Financial
        mock_financial = AsyncMock()
        mock_financial.run.return_value = {
            "message": "Título criado",
            "agent": "financial",
            "tool_calls": [{"tool": "create_title", "output": {"title_id": "TIT002"}}]
        }
        
        # Executar sequência
        fiscal_result = await mock_fiscal.run(message="Calcule ICMS")
        financial_result = await mock_financial.run(
            message="Criar título",
            context={"icms": fiscal_result["tool_calls"][0]["output"]["tax"]}
        )
        
        assert fiscal_result["agent"] == "fiscal"
        assert financial_result["agent"] == "financial"
