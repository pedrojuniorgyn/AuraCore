# Strategic Agent

Agente especializado em gestão estratégica empresarial.

## Visão Geral

O Strategic Agent auxilia na gestão estratégica com:
- Balanced Scorecard (BSC) - 4 perspectivas
- Ciclos PDCA para melhoria contínua
- Análise de KPIs e métricas
- Gestão de crises (War Room)

## Domínios de Conhecimento

- Balanced Scorecard (Kaplan & Norton)
- Ciclo PDCA (Deming)
- Gestão por indicadores (KPIs)
- Gestão de crises e contingências

## Tools Disponíveis

### 1. bsc_dashboard

Dashboard do Balanced Scorecard com as 4 perspectivas.

**Risk Level:** LOW

**Perspectivas BSC:**
| Perspectiva | Descrição |
|-------------|-----------|
| FINANCIAL | Receita, margem, ROI, EBITDA |
| CUSTOMER | NPS, retenção, satisfação |
| INTERNAL | Eficiência, qualidade, OTD |
| LEARNING | Treinamento, inovação, cultura |

**Ações:**
- `overview`: Visão geral de todas as perspectivas
- `perspective`: Detalhes de uma perspectiva
- `objective`: Detalhes de um objetivo
- `compare`: Comparar períodos

### 2. pdca_tracker

Gerenciamento de ciclos PDCA.

**Risk Level:** MEDIUM

**Fases PDCA:**
| Fase | Descrição |
|------|-----------|
| PLAN | Planejar (problema, causa, plano) |
| DO | Executar o plano de ação |
| CHECK | Verificar resultados |
| ACT | Padronizar ou corrigir |

**Ações:**
- `create`: Criar novo ciclo
- `update`: Atualizar fase
- `list`: Listar ciclos ativos
- `detail`: Detalhes de um ciclo
- `advance`: Avançar para próxima fase

### 3. kpi_analyzer

Análise de KPIs e métricas de negócio.

**Risk Level:** LOW

**Categorias:**
- FINANCIAL: Indicadores financeiros
- OPERATIONAL: Indicadores operacionais
- COMMERCIAL: Indicadores comerciais
- HR: Indicadores de RH

**Ações:**
- `dashboard`: Painel com principais KPIs
- `analyze`: Análise detalhada de um KPI
- `trends`: Tendências históricas
- `alerts`: KPIs com desvios
- `compare`: Comparar períodos

### 4. war_room

Gestão de crises e situações críticas.

**Risk Level:** HIGH

**Níveis de Severidade:**
| Nível | Descrição |
|-------|-----------|
| CRITICAL | Impacto imediato, ação imediata |
| HIGH | Impacto considerável, até 24h |
| MEDIUM | Impacto moderado, até 48h |

**Tipos de Crise:**
- OPERATIONAL: Falhas operacionais
- FINANCIAL: Problemas financeiros
- COMMERCIAL: Perda de clientes/contratos
- REGULATORY: Problemas fiscais/legais
- REPUTATIONAL: Crise de imagem

**Ações:**
- `create`: Abrir nova crise
- `update`: Atualizar status/ações
- `list`: Listar crises ativas
- `detail`: Detalhes da crise
- `close`: Encerrar crise
- `escalate`: Escalar para nível superior

## Exemplos de Conversação

### BSC
```
"Mostre o BSC do mês atual"
"Qual a situação da perspectiva financeira?"
"Compare o BSC deste mês com o mês passado"
```

### PDCA
```
"Crie um ciclo PDCA para reduzir o tempo de entrega"
"Quais ciclos PDCA estão ativos?"
"Avance o PDCA-001 para a fase CHECK"
```

### KPIs
```
"Mostre o dashboard de KPIs"
"Analise o NPS em detalhes"
"Quais KPIs estão abaixo da meta?"
```

### War Room
```
"Abra uma crise CRITICAL de falha no sistema"
"Quais crises estão ativas?"
"Atualize a crise WAR-001 com as ações tomadas"
```

## Referências

- Kaplan, R. & Norton, D. (1992). *The Balanced Scorecard*
- Deming, W. E. (1986). *Out of the Crisis* (PDCA)
- Metodologias de gestão de crises empresariais

## Guardrails

| Tool | Risco | Requer Aprovação |
|------|-------|------------------|
| bsc_dashboard | LOW | Não |
| pdca_tracker | MEDIUM | Não |
| kpi_analyzer | LOW | Não |
| war_room | HIGH | Sim (create/escalate) |

## Multi-Tenancy

Todas as operações filtram por:
- `organization_id`: ID da organização
- `branch_id`: ID da filial

Dados estratégicos são isolados por organização.
