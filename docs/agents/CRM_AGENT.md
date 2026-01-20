# CRM Agent

Agente especializado em gestão comercial e relacionamento com clientes.

## Visão Geral

O CRM Agent automatiza processos comerciais, incluindo:
- Qualificação e scoring de leads
- Geração de propostas comerciais
- Análise de saúde de clientes

## Domínios de Conhecimento

- Ciclo de vendas B2B no setor de transporte
- Qualificação de leads (BANT, MEDDIC)
- Precificação de frete rodoviário
- Métricas comerciais (CAC, LTV, Churn)
- Gestão de relacionamento com embarcadores

## Tools Disponíveis

### 1. lead_scorer

Pontua e qualifica leads para priorização comercial.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `lead_id` | str | ID do lead específico |
| `cnpj` | str | CNPJ para buscar lead |
| `score_all_pending` | bool | Pontuar todos leads pendentes |
| `min_score` | int | Score mínimo para retornar |
| `include_recommendations` | bool | Incluir recomendações |

**Critérios de Scoring:**
| Critério | Peso | Descrição |
|----------|------|-----------|
| Perfil da Empresa | 30% | Porte, segmento, localização |
| Potencial de Volume | 25% | Volume estimado, frequência |
| Engajamento | 20% | Interações, recência, origem |
| Fit com Serviços | 15% | Tipo de carga, rotas |
| Urgência | 10% | Timeline, dor atual |

**Temperatura:**
- 🔥 Hot (Score >= 80): Prioridade máxima
- 🌡️ Warm (Score 50-79): Nutrir relacionamento
- ❄️ Cold (Score < 50): Fluxo de nutrição

**Exemplo de uso:**
```
"Qual o score do lead LEAD-001?"
"Quais são os leads mais quentes para contatar hoje?"
"Pontue todos os leads pendentes"
```

### 2. proposal_generator

Gera propostas comerciais personalizadas.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `lead_id` | str | ID do lead |
| `customer_id` | str | ID do cliente (se existir) |
| `proposal_type` | str | spot, contract, project |
| `routes` | list | Lista de rotas |
| `target_margin` | float | Margem alvo em % |
| `validity_days` | int | Validade em dias |

**Componentes de Precificação:**
- Frete Peso (R$/kg)
- Ad Valorem (% do valor)
- GRIS (Gerenciamento de Risco)
- Pedágio
- Serviços adicionais

**Exemplo de uso:**
```
"Gere uma proposta para o lead LEAD-001 com rotas SP-RJ e SP-MG"
"Crie uma proposta de contrato anual com margem de 20%"
```

### 3. customer_health

Analisa saúde e risco de churn de clientes.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `customer_id` | str | ID do cliente |
| `cnpj` | str | CNPJ do cliente |
| `analyze_all` | bool | Analisar todos ativos |
| `health_threshold` | int | Score mínimo |
| `include_history` | bool | Incluir histórico |
| `period_months` | int | Período de análise |

**Indicadores de Saúde:**
| Indicador | Peso | Descrição |
|-----------|------|-----------|
| Volume de Operações | 25% | Aderência ao potencial |
| Taxa de Entrega no Prazo | 25% | OTD (On-Time Delivery) |
| NPS | 20% | Net Promoter Score |
| Índice de Reclamações | 15% | Tickets abertos |
| Pontualidade de Pagamento | 15% | % pagamentos em dia |

**Status de Saúde:**
- 💚 Saudável (Score >= 80): Cliente estável
- 🟡 Em Risco (Score 50-79): Requer atenção
- 🔴 Crítico (Score < 50): Intervenção urgente

**Risco de Churn:**
- LOW: Até 25% probabilidade
- MEDIUM: 25-50% probabilidade
- HIGH: Acima de 50% probabilidade

**Exemplo de uso:**
```
"Qual a saúde do cliente CUST-001?"
"Liste os clientes com alto risco de churn"
"Analise o portfólio de clientes"
```

## Ciclo de Vendas

| Estágio | Descrição |
|---------|-----------|
| LEAD | Potencial cliente identificado |
| PROSPECT | Primeiro contato realizado |
| QUALIFIED | Necessidade confirmada |
| PROPOSAL | Proposta enviada |
| NEGOTIATION | Em negociação |
| WON | Contrato fechado |
| LOST | Perdido para concorrência |

## Segmentos de Cliente

| Segmento | Volume Mensal |
|----------|---------------|
| Enterprise | > R$ 500k |
| Mid-Market | R$ 50k - 500k |
| SMB | < R$ 50k |
| Spot | Cargas avulsas |

## Métricas Comerciais

| Métrica | Descrição |
|---------|-----------|
| CAC | Custo de Aquisição de Cliente |
| LTV | Lifetime Value |
| Churn Rate | Taxa de cancelamento |
| NPS | Net Promoter Score |
| Win Rate | Taxa de conversão |

## Integração com Outros Agentes

- **Financial Agent**: Dados de pagamento para análise de saúde
- **TMS Agent**: Dados de operações para volume e performance
- **Fiscal Agent**: Validação de documentos em propostas

## Guardrails

| Tool | Risco | Requer Aprovação |
|------|-------|------------------|
| lead_scorer | LOW | Não |
| proposal_generator | MEDIUM | Não |
| customer_health | LOW | Não |

## Conformidade

- **LGPD**: Dados de contato protegidos
- **Confidencialidade**: Informações comerciais restritas
- **Multi-tenancy**: Isolamento por organização
