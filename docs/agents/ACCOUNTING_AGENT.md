# Accounting Agent

Agente especializado em contabilidade brasileira.

## Visão Geral

O Accounting Agent automatiza processos contábeis, incluindo:
- Geração de lançamentos contábeis (partidas dobradas)
- Fechamento de períodos contábeis
- Conciliação de contas

## Domínios de Conhecimento

- Método das partidas dobradas
- Plano de contas (tradicional e SPED)
- Fechamento mensal, trimestral e anual
- Conciliação bancária e intercompany
- Normas contábeis brasileiras (NBC, CPC, ITG)
- SPED ECD (Escrituração Contábil Digital)

## Tools Disponíveis

### 1. journal_entry_generator

Gera lançamentos contábeis seguindo o método das partidas dobradas.

**Risk Level:** MEDIUM

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `entry_date` | str | Data do lançamento (YYYY-MM-DD) |
| `description` | str | Descrição/histórico |
| `document_type` | str | NFE, CTE, PAYMENT, RECEIPT, MANUAL, PROVISION, ADJUSTMENT |
| `document_id` | str | ID do documento relacionado (opcional) |
| `lines` | list | Linhas com account_code, debit_amount, credit_amount |

**Validações:**
- Total de débitos DEVE ser igual ao total de créditos
- Cada linha deve ter débito OU crédito (não ambos)
- Código de conta no formato padrão (1.1.1.01)
- Mínimo de 2 linhas por lançamento

**Exemplo de uso:**
```json
{
  "entry_date": "2025-01-20",
  "description": "Pagamento de fornecedor ABC",
  "document_type": "PAYMENT",
  "document_id": "PAY-001",
  "lines": [
    {"account_code": "2.1.1.01", "debit_amount": 1000.00, "credit_amount": 0},
    {"account_code": "1.1.1.01", "debit_amount": 0, "credit_amount": 1000.00}
  ]
}
```

### 2. period_closing

Executa fechamento de período contábil.

**Risk Level:** HIGH (requer human-in-the-loop)

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `period_year` | int | Ano do período (2020-2099) |
| `period_month` | int | Mês do período (1-12) |
| `closing_type` | str | MONTHLY, QUARTERLY, ANNUAL |
| `generate_statements` | bool | Gerar demonstrativos (Balancete, DRE) |
| `transfer_result` | bool | Transferir resultado para Lucros/Prejuízos |
| `dry_run` | bool | **RECOMENDADO!** Simular sem efetivar |

**IMPORTANTE:** Sempre use `dry_run: true` primeiro para validar!

**Validações:**
- Período não pode ser futuro
- Período não pode estar já fechado
- Não pode ter lançamentos pendentes de aprovação
- Balancete deve estar equilibrado (D = C)

**Exemplo de uso:**
```json
{
  "period_year": 2025,
  "period_month": 1,
  "closing_type": "MONTHLY",
  "generate_statements": true,
  "transfer_result": true,
  "dry_run": true
}
```

### 3. account_reconciliation

Conciliação de contas contábeis.

**Risk Level:** LOW

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `reconciliation_type` | str | BANK, INTERCOMPANY, CUSTOMER, SUPPLIER |
| `account_code` | str | Código da conta (ex: 1.1.1.01) |
| `start_date` | str | Data inicial (YYYY-MM-DD) |
| `end_date` | str | Data final (YYYY-MM-DD) |
| `bank_account_id` | int | ID da conta bancária (para BANK) |
| `counterpart_branch_id` | int | ID da filial contraparte (para INTERCOMPANY) |

**Tipos de Conciliação:**
| Tipo | Descrição |
|------|-----------|
| BANK | Extrato bancário x Razão contábil |
| INTERCOMPANY | Contas entre filiais |
| CUSTOMER | Confirmação de saldos de clientes |
| SUPPLIER | Confirmação de saldos de fornecedores |

**Status de Itens:**
| Status | Descrição |
|--------|-----------|
| MATCHED | Conciliado - valores iguais |
| UNMATCHED_BOOK | Existe no razão, não no externo |
| UNMATCHED_EXTERNAL | Existe no externo, não no razão |
| PARTIAL | Valores diferentes |

**Exemplo de uso:**
```json
{
  "reconciliation_type": "BANK",
  "account_code": "1.1.1.01",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "bank_account_id": 1
}
```

## Exemplos de Conversação

### Criar lançamento
```
"Crie um lançamento de pagamento de R$ 5.000 ao fornecedor ABC"
"Lance a provisão de 13º salário no valor de R$ 25.000"
"Registre o recebimento do cliente XYZ de R$ 10.000"
```

### Fechamento de período
```
"Simule o fechamento de janeiro/2025"
"Quais são os bloqueios para fechar o mês de dezembro?"
"Execute o fechamento do primeiro trimestre"
```

### Conciliação
```
"Concilie a conta bancária do Bradesco em janeiro"
"Mostre as diferenças na conciliação intercompany com a filial RJ"
"Quais transações bancárias não estão no razão?"
```

## Referências Normativas

| Norma | Descrição |
|-------|-----------|
| ITG 2000 (R1) | Escrituração Contábil |
| NBC TG 1000 | Contabilidade para PMEs |
| CPC 00 | Estrutura Conceitual |
| NBC TG 26 | Apresentação das Demonstrações Contábeis |
| SPED ECD | Escrituração Contábil Digital |

## Integração com Outros Agentes

| Agente | Integração |
|--------|------------|
| Financial Agent | Títulos geram lançamentos de contas a pagar/receber |
| Fiscal Agent | NFe/CTe geram lançamentos de impostos |
| TMS Agent | CTe gera lançamentos de frete |

## Guardrails

| Tool | Risco | Requer Aprovação |
|------|-------|------------------|
| journal_entry_generator | MEDIUM | Não |
| period_closing | HIGH | Sim (human-in-the-loop) |
| account_reconciliation | LOW | Não |

## Conformidade

- **Multi-tenancy**: Todas as operações filtram por org_id + branch_id
- **Auditoria**: Lançamentos têm rastreabilidade completa
- **Imutabilidade**: Lançamentos aprovados não podem ser alterados
- **SPED ECD**: Compatível com layout da Receita Federal
