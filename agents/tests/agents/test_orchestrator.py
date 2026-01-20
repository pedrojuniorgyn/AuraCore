# agents/tests/agents/test_orchestrator.py
"""
Testes do Orchestrator - routing de mensagens para agentes.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.core.orchestrator import AgentOrchestrator, get_orchestrator
from src.core.base import AgentType


class TestOrchestratorInitialization:
    """Testes de inicialização do Orchestrator."""
    
    @pytest.mark.unit
    def test_orchestrator_initializes_all_agents(self):
        """Verifica que todos os 8 agentes são inicializados."""
        orchestrator = AgentOrchestrator()
        
        assert len(orchestrator.agents) == 8
        
        expected_agents = [
            AgentType.FISCAL,
            AgentType.FINANCIAL,
            AgentType.TMS,
            AgentType.CRM,
            AgentType.ACCOUNTING,
            AgentType.FLEET,
            AgentType.STRATEGIC,
            AgentType.QA,
        ]
        
        for agent_type in expected_agents:
            assert agent_type in orchestrator.agents, f"Agent {agent_type} não inicializado"
    
    @pytest.mark.unit
    def test_singleton_returns_same_instance(self):
        """Verifica que get_orchestrator retorna singleton."""
        # Reset singleton para teste isolado
        import src.core.orchestrator as orch_module
        orch_module._orchestrator = None
        
        orch1 = get_orchestrator()
        orch2 = get_orchestrator()
        
        assert orch1 is orch2
    
    @pytest.mark.unit
    def test_list_agents_returns_all(self):
        """Verifica que list_agents retorna todos os agentes."""
        orchestrator = AgentOrchestrator()
        agents_list = orchestrator.list_agents()
        
        assert len(agents_list) == 8
        
        for agent_info in agents_list:
            assert "type" in agent_info
            assert "name" in agent_info
            assert "description" in agent_info
            assert "capabilities" in agent_info
            assert "tools" in agent_info


class TestOrchestratorRouting:
    """Testes de routing do Orchestrator."""
    
    @pytest.fixture
    def orchestrator(self):
        """Cria instância do Orchestrator para testes."""
        return AgentOrchestrator()
    
    @pytest.mark.unit
    @pytest.mark.parametrize("message,expected_agent", [
        # Fiscal
        ("Qual a alíquota de ICMS para SP?", AgentType.FISCAL),
        ("Calcular PIS e COFINS", AgentType.FISCAL),
        ("Validar CTe número 123", AgentType.FISCAL),
        ("Importar DANFe do PDF", AgentType.FISCAL),
        ("lei kandir artigo 12", AgentType.FISCAL),
        ("reforma tributária 2026", AgentType.FISCAL),
        
        # Financial
        ("Verificar fluxo de caixa", AgentType.FINANCIAL),
        ("Conciliação bancária", AgentType.FINANCIAL),
        ("Gerar boleto de cobrança", AgentType.FINANCIAL),
        
        # TMS
        ("Status da entrega 12345", AgentType.TMS),
        ("Otimizar rota de entrega", AgentType.TMS),
        ("Rastrear carga", AgentType.TMS),
        ("Qual motorista está disponível?", AgentType.TMS),
        
        # CRM
        ("Listar clientes inativos", AgentType.CRM),
        ("Histórico do cliente X", AgentType.CRM),
        ("Gerar proposta comercial", AgentType.CRM),
        
        # Accounting
        ("Lançamento contábil", AgentType.ACCOUNTING),
        ("Balancete do período", AgentType.ACCOUNTING),
        ("Plano de contas", AgentType.ACCOUNTING),
        
        # Fleet
        ("Manutenção do veículo ABC1234", AgentType.FLEET),
        ("Consumo de combustível", AgentType.FLEET),
        ("Verificar documentos da frota", AgentType.FLEET),
        
        # Strategic
        ("Análise SWOT", AgentType.STRATEGIC),
        ("Indicadores BSC", AgentType.STRATEGIC),
        ("Reunião war room", AgentType.STRATEGIC),
        ("Meta do trimestre", AgentType.STRATEGIC),
        
        # QA
        ("Analisar qualidade do código", AgentType.QA),
        ("Verificar bugs no frontend", AgentType.QA),
        ("Scanner de componentes", AgentType.QA),
    ])
    @pytest.mark.asyncio
    async def test_classify_intent_routes_correctly(
        self, 
        orchestrator, 
        message: str, 
        expected_agent: AgentType
    ):
        """Verifica que mensagens são classificadas para o agente correto."""
        detected_agent = await orchestrator._classify_intent(message)
        assert detected_agent == expected_agent, \
            f"Mensagem '{message}' deveria ir para {expected_agent.value}, foi para {detected_agent.value}"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_classify_ambiguous_defaults_to_fiscal(self, orchestrator):
        """Mensagens ambíguas devem ir para fiscal (default)."""
        ambiguous_messages = [
            "Olá",
            "Como você pode me ajudar?",
            "Obrigado",
            "Bom dia",
        ]
        
        for message in ambiguous_messages:
            detected = await orchestrator._classify_intent(message)
            assert detected == AgentType.FISCAL, \
                f"Mensagem ambígua '{message}' deveria ir para FISCAL"
    
    @pytest.mark.unit
    def test_get_agent_returns_correct_agent(self, orchestrator):
        """Verifica que get_agent retorna o agente correto."""
        fiscal = orchestrator.get_agent(AgentType.FISCAL)
        assert fiscal is not None
        assert fiscal.agent_type == AgentType.FISCAL
        
        tms = orchestrator.get_agent(AgentType.TMS)
        assert tms is not None
        assert tms.agent_type == AgentType.TMS
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_route_message_with_specified_agent(
        self, 
        orchestrator, 
        mock_context
    ):
        """Verifica routing com agente especificado."""
        # Mock do método chat do agente
        fiscal_agent = orchestrator.get_agent(AgentType.FISCAL)
        with patch.object(fiscal_agent, 'chat', new_callable=AsyncMock) as mock_chat:
            mock_chat.return_value = {"response": "Resposta fiscal"}
            
            result = await orchestrator.route_message(
                message="Qualquer mensagem",
                context=mock_context,
                agent_type=AgentType.FISCAL
            )
            
            mock_chat.assert_called_once()
            assert result["response"] == "Resposta fiscal"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_route_message_invalid_agent_returns_error(
        self, 
        orchestrator, 
        mock_context
    ):
        """Verifica que agente inválido retorna erro."""
        # Remover um agente para simular indisponibilidade
        original_agents = orchestrator.agents.copy()
        del orchestrator.agents[AgentType.FISCAL]
        
        result = await orchestrator.route_message(
            message="Qualquer mensagem",
            context=mock_context,
            agent_type=AgentType.FISCAL
        )
        
        # Restaurar
        orchestrator.agents = original_agents
        
        assert "error" in result
        assert "not available" in result["error"]


class TestOrchestratorKeywordScoring:
    """Testes do sistema de scoring de keywords."""
    
    @pytest.fixture
    def orchestrator(self):
        return AgentOrchestrator()
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_multiple_keywords_increase_score(self, orchestrator):
        """Verifica que múltiplas keywords aumentam o score."""
        # Mensagem com várias keywords fiscais
        message = "Calcular ICMS e DIFAL para NFe de São Paulo"
        detected = await orchestrator._classify_intent(message)
        assert detected == AgentType.FISCAL
        
        # Mensagem com várias keywords de TMS
        message = "Rastreamento da carga e motorista da viagem"
        detected = await orchestrator._classify_intent(message)
        assert detected == AgentType.TMS
    
    @pytest.mark.unit
    @pytest.mark.asyncio  
    async def test_case_insensitive_matching(self, orchestrator):
        """Verifica que matching é case-insensitive."""
        messages = [
            "ICMS",
            "icms",
            "Icms",
            "iCmS"
        ]
        
        for msg in messages:
            detected = await orchestrator._classify_intent(msg)
            assert detected == AgentType.FISCAL
