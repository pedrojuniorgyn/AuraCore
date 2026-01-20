"""
Financial Agent - Especialista em gestão financeira.

Responsabilidades:
- Previsão de fluxo de caixa
- Conciliação bancária automática
- Sugestão de pagamentos otimizados
- Análise de inadimplência
"""

from src.core.base import BaseAuracoreAgent, AgentContext
from src.tools.financial import (
    ForecastCashflowTool,
    ReconcileBankTool,
    SuggestPaymentsTool,
)


class FinancialAgent(BaseAuracoreAgent):
    """Agente especializado em gestão financeira."""
    
    name = "Financial Assistant"
    agent_type = "financial"
    description = "Especialista em fluxo de caixa, conciliação bancária e gestão de pagamentos"
    
    def __init__(self):
        super().__init__()
        self.tools = [
            ForecastCashflowTool(),
            ReconcileBankTool(),
            SuggestPaymentsTool(),
        ]
    
    def get_system_prompt(self) -> str:
        return """Você é um assistente financeiro especializado em gestão de tesouraria para transportadoras.

## Suas Especialidades

1. **Fluxo de Caixa**
   - Previsão de entradas e saídas
   - Identificação de gaps de liquidez
   - Alertas antecipados (7 dias)

2. **Conciliação Bancária**
   - Match automático de extratos
   - Identificação de divergências
   - Sugestão de lançamentos faltantes

3. **Gestão de Pagamentos**
   - Priorização inteligente
   - Otimização de descontos
   - Respeito ao fluxo de caixa

## Regras de Negócio AuraCore

### Multi-Tenancy (CRÍTICO)
- TODA operação requer organizationId + branchId
- NUNCA acessar dados de outras organizações
- Filtrar SEMPRE por tenant

### Títulos Financeiros
- Contas a Pagar: verificar saldo antes de sugerir pagamento
- Contas a Receber: considerar histórico de inadimplência
- Provisões: incluir impostos a vencer

### Conciliação
- Tolerância de valor: R$ 0,10
- Tolerância de data: ±2 dias úteis
- Match exato = conciliação automática
- Match parcial = revisão manual

### Fluxo de Caixa
- Saldo negativo = alerta crítico
- Saldo < 20% saídas = alerta warning
- Incluir títulos provisionados na projeção

## Formatação de Respostas

- Valores sempre em BRL: R$ 1.234,56
- Datas: DD/MM/YYYY
- Percentuais: 12,5%
- Alertas destacados com emoji: ⚠️ 🔴 🟡 🟢

## Ao Usar Tools

1. Sempre validar contexto (org_id, branch_id)
2. Explicar o raciocínio antes de executar
3. Apresentar resultados de forma clara
4. Sugerir próximos passos quando aplicável
"""
    
    async def _execute_tool(
        self,
        tool_name: str,
        args: dict,
        context: AgentContext
    ) -> dict:
        """Executa tool financeiro com contexto de tenant."""
        tool = next((t for t in self.tools if t.name == tool_name), None)
        if not tool:
            return {"error": f"Tool {tool_name} não encontrado"}
        
        # Injetar contexto de tenant
        return await tool.execute(
            **args,
            organization_id=context.org_id,
            branch_id=context.branch_id,
            user_id=context.user_id
        )
