# Guardrails

Sistema de segurança para operações sensíveis dos agentes.

## Visão Geral

Os Guardrails são regras de segurança que controlam quais operações os agentes podem executar automaticamente e quais requerem aprovação humana (Human-in-the-Loop).

## Níveis de Risco

### LOW (Baixo)

Operações de leitura e consulta. Executadas automaticamente.

- Consultas à legislação
- Cálculos e simulações
- Verificação de documentos
- Relatórios

### MEDIUM (Médio)

Criação de rascunhos e registros reversíveis. Executadas com log.

- Criação de rascunhos de CTe
- Validação de documentos
- Agendamento de manutenções
- Criação de propostas

### HIGH (Alto)

Alterações financeiras e emissão de documentos. Requerem aprovação condicional.

- Autorização de CTe na SEFAZ
- Criação de pagamentos
- Cancelamento de documentos
- Operações acima do limite de valor

### CRITICAL (Crítico)

Operações que afetam obrigações fiscais ou movimentações financeiras em lote. Sempre requerem aprovação.

- Geração de arquivos SPED
- Fechamento de período contábil
- Pagamentos em lote
- Transmissão de ECD/ECF

## Mapeamento de Tools

```python
TOOL_GUARDRAILS = {
    # BAIXO RISCO
    "query_legislation": Guardrail(risk_level=LOW, requires_approval=False),
    "calculate_icms": Guardrail(risk_level=LOW, requires_approval=False),
    "simulate_tax": Guardrail(risk_level=LOW, requires_approval=False),
    "check_nfe": Guardrail(risk_level=LOW, requires_approval=False),
    
    # MÉDIO RISCO
    "validate_cte": Guardrail(risk_level=MEDIUM, requires_approval=False),
    "create_cte_draft": Guardrail(risk_level=MEDIUM, requires_approval=False),
    
    # ALTO RISCO
    "authorize_cte": Guardrail(
        risk_level=HIGH,
        requires_approval=True,
        max_value=100000.00,
        allowed_roles=["fiscal_admin", "manager", "admin"],
    ),
    
    # CRÍTICO
    "generate_sped": Guardrail(
        risk_level=CRITICAL,
        requires_approval=True,
        allowed_roles=["fiscal_admin", "cfo", "admin"],
    ),
}
```

## Verificações

### Verificação de Role

Operações de alto risco só podem ser executadas por usuários com roles específicas.

```python
# Exemplo: authorize_cte
allowed_roles = ["fiscal_admin", "fiscal_supervisor", "manager", "admin"]

if user_role not in allowed_roles:
    return {
        "status": "denied",
        "reason": f"Role '{user_role}' não autorizada",
        "required_roles": allowed_roles,
    }
```

### Verificação de Valor

Operações com valores acima do limite requerem aprovação.

```python
# Exemplo: create_payment
if value > 50000.00:
    return {
        "status": "pending_approval",
        "reason": f"Valor R$ {value:,.2f} excede limite de R$ 50.000,00",
        "approval_required": True,
    }
```

### Aprovação Obrigatória

Operações críticas sempre requerem aprovação humana.

```python
# Exemplo: generate_sped
return {
    "status": "pending_approval",
    "reason": "Operação 'generate_sped' requer aprovação",
    "description": "Geração de arquivo SPED",
    "risk_level": "critical",
}
```

## Fluxo de Aprovação

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agente    │ ──► │  Guardrail  │ ──► │   Status    │
│   Executa   │     │  Verifica   │     │   Result    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐   ┌────────┐   ┌────────┐
         │approved│   │pending │   │ denied │
         └────────┘   │approval│   └────────┘
                      └────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Aguarda   │
                    │  Aprovação  │
                    │   Humana    │
                    └─────────────┘
```

## Configuração

### Desabilitar Guardrails (Desenvolvimento)

```env
ENABLE_GUARDRAILS=false
```

**⚠️ NUNCA desabilitar em produção!**

### Customizar Limites

Os limites podem ser ajustados por organização no futuro:

```python
# Futuro: configuração por org
org_limits = {
    "org_123": {
        "max_payment_value": 100000.00,
        "max_cte_value": 500000.00,
    }
}
```

## Logging

Todas as verificações de guardrails são logadas:

```json
{
  "event": "guardrail_check",
  "tool": "authorize_cte",
  "user_role": "fiscal_operator",
  "status": "denied",
  "reason": "Role 'fiscal_operator' não autorizada",
  "required_roles": ["fiscal_admin", "manager", "admin"],
  "timestamp": "2026-01-20T10:30:00Z"
}
```

## Métricas

O sistema coleta métricas de guardrails:

- `guardrail_checks_total{tool, status}` - Total de verificações
- `guardrail_denials_total{tool, reason}` - Total de negações
- `guardrail_approvals_pending{tool}` - Aprovações pendentes

## Boas Práticas

1. **Sempre defina guardrails** para novos tools
2. **Comece conservador** - é mais fácil relaxar do que apertar
3. **Documente as roles** que podem executar cada operação
4. **Monitore os logs** para identificar padrões de uso
5. **Revise periodicamente** os limites de valor
