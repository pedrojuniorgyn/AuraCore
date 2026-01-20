"""
Accounting Agent - Especialista em contabilidade.

Responsabilidades:
- Geração de lançamentos contábeis (partidas dobradas)
- Fechamento de períodos contábeis
- Conciliação de contas (bancária, intercompany)
- Preparação para SPED ECD

Referências:
- ITG 2000 (R1) - Escrituração Contábil
- NBC TG 1000 - Contabilidade para PMEs
- CPC 00 - Estrutura Conceitual
"""

from typing import List

from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.accounting.journal_entry_generator import JournalEntryGeneratorTool
from src.tools.accounting.period_closing import PeriodClosingTool
from src.tools.accounting.account_reconciliation import AccountReconciliationTool


class AccountingAgent(BaseAuracoreAgent):
    """
    Agente especializado em operações contábeis.
    
    Domínios de conhecimento:
    - Escrituração contábil (método partidas dobradas)
    - Fechamento de períodos (mensal, trimestral, anual)
    - Conciliação de contas
    - SPED ECD
    - Normas contábeis brasileiras
    """
    
    def __init__(self):
        instructions = [
            # Identidade e expertise
            "Você é o especialista contábil do AuraCore, com profundo conhecimento em contabilidade brasileira.",
            
            # Comportamento com tools
            "Para criar lançamentos contábeis, SEMPRE use a ferramenta 'journal_entry_generator'.",
            "Para fechamento de período, use 'period_closing' - SEMPRE com dry_run=true primeiro.",
            "Para conciliação de contas, use 'account_reconciliation'.",
            
            # Método das partidas dobradas
            "SEMPRE valide que Débitos = Créditos em qualquer lançamento.",
            "Cada linha de lançamento deve ter APENAS débito OU crédito, nunca ambos.",
            
            # Normas
            "Siga as normas ITG 2000 (R1), NBC TG 1000 e CPC 00.",
            "Valide códigos de contas no formato padrão (1.1.1.01 ou SPED).",
            
            # Formatação
            "Formate valores monetários como R$ 1.234,56.",
            "Use códigos de conta no padrão do plano de contas.",
            
            # Segurança
            "Operações de fechamento de período são CRÍTICAS e requerem dry_run primeiro.",
            "Nunca execute fechamento real sem confirmação explícita do usuário.",
        ]
        
        tools = [
            JournalEntryGeneratorTool(),
            PeriodClosingTool(),
            AccountReconciliationTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.ACCOUNTING,
            name="Accounting Assistant",
            description=(
                "Especialista em contabilidade brasileira. "
                "Domina escrituração contábil, fechamento de períodos e conciliação de contas."
            ),
            instructions=instructions,
            tools=tools,
        )
    
    def get_capabilities(self) -> List[str]:
        """Retorna lista de capacidades do agente."""
        return [
            "Geração de lançamentos contábeis (partidas dobradas)",
            "Fechamento de período mensal, trimestral e anual",
            "Conciliação bancária",
            "Conciliação intercompany",
            "Validação de balancete de verificação",
            "Preparação para SPED ECD",
            "Análise de centro de custo",
            "Transferência de resultado para PL",
        ]
