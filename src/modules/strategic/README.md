# Módulo Strategic - Gestão Estratégica e Qualidade Total

## Visão Geral

O módulo Strategic implementa funcionalidades de gestão estratégica empresarial seguindo metodologias consolidadas:

- **BSC (Balanced Scorecard)** - 4 perspectivas com mapa estratégico
- **Desdobramento de Metas** - Cascateamento CEO → DIRECTOR → MANAGER → TEAM
- **KPIs** - Indicadores com integrações automáticas (Financial, TMS)
- **GEROT** - Itens de Controle (IC) e Verificação (IV) - Metodologia Falconi
- **5W2H + PDCA** - Planos de ação com ciclo de melhoria contínua
- **Follow-up 3G** - Verificação GEMBA/GEMBUTSU/GENJITSU
- **War Room** - Dashboard executivo em tempo real com SSE
- **SWOT** - Análise estratégica com visualizações

## Arquitetura

```
src/modules/strategic/
├── domain/
│   ├── entities/           # Aggregates e Entities
│   │   ├── Strategy.ts
│   │   ├── StrategicGoal.ts
│   │   ├── ActionPlan.ts
│   │   ├── ActionPlanFollowUp.ts
│   │   ├── KPI.ts
│   │   ├── ControlItem.ts
│   │   ├── VerificationItem.ts
│   │   ├── Anomaly.ts
│   │   └── IdeaBox.ts
│   ├── value-objects/      # Value Objects imutáveis
│   │   ├── CascadeLevel.ts
│   │   ├── PDCACycle.ts
│   │   ├── ExecutionStatus.ts
│   │   └── GoalStatus.ts
│   ├── services/           # Domain Services (stateless)
│   │   ├── GoalCascadeService.ts
│   │   ├── KPICalculatorService.ts
│   │   └── AgendaGeneratorService.ts
│   └── ports/
│       ├── input/          # Use Case interfaces
│       └── output/         # Repository interfaces
├── application/
│   ├── commands/           # Use Cases de escrita
│   │   ├── CreateStrategyUseCase.ts
│   │   ├── ActivateStrategyUseCase.ts
│   │   ├── CascadeGoalUseCase.ts
│   │   ├── CreateActionPlanUseCase.ts
│   │   ├── AdvancePDCACycleUseCase.ts
│   │   ├── ExecuteFollowUpUseCase.ts
│   │   └── ...
│   ├── queries/            # Use Cases de leitura
│   │   └── GenerateAgendaUseCase.ts
│   └── dtos/               # Data Transfer Objects
├── infrastructure/
│   ├── persistence/
│   │   ├── schemas/        # Drizzle schemas (16 tabelas)
│   │   ├── repositories/   # Implementações Drizzle
│   │   └── mappers/        # Entity <-> Row
│   ├── integrations/       # KPI Data Sources
│   │   ├── FinancialKPIDataSource.ts
│   │   └── TMSKPIDataSource.ts
│   └── di/                 # Dependency Injection
└── presentation/
    └── components/         # React components
        ├── WarRoomDashboard.tsx
        ├── PDCAKanban.tsx
        ├── GoalTreemap.tsx
        ├── SWOTMatrix.tsx
        ├── SWOTRadar.tsx
        └── ...
```

## APIs

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/strategic/strategies` | GET/POST | CRUD de estratégias |
| `/api/strategic/strategies/[id]` | GET/PUT/DELETE | Operações em estratégia específica |
| `/api/strategic/strategies/[id]/activate` | POST | Ativar estratégia |
| `/api/strategic/goals` | GET/POST | CRUD de metas |
| `/api/strategic/goals/[id]` | GET/PUT/DELETE | Operações em meta específica |
| `/api/strategic/goals/[id]/cascade` | POST | Desdobrar meta para nível inferior |
| `/api/strategic/goals/tree` | GET | Árvore de cascateamento (Treemap) |
| `/api/strategic/map` | GET | Dados para mapa estratégico |
| `/api/strategic/kpis` | GET/POST | CRUD de KPIs |
| `/api/strategic/kpis/[id]/value` | PUT | Atualizar valor do KPI |
| `/api/strategic/action-plans` | GET/POST | CRUD de planos de ação |
| `/api/strategic/action-plans/kanban` | GET | Kanban PDCA |
| `/api/strategic/action-plans/[id]/follow-up` | POST | Registrar follow-up 3G |
| `/api/strategic/control-items` | GET/POST | CRUD de itens de controle |
| `/api/strategic/anomalies` | GET/POST | CRUD de anomalias |
| `/api/strategic/war-room/dashboard` | GET | Dashboard executivo consolidado |
| `/api/strategic/war-room/stream` | GET | SSE para updates real-time |
| `/api/strategic/war-room/agenda` | POST | Gerar pauta automática |
| `/api/strategic/war-room/meetings` | GET/POST | Gestão de reuniões |
| `/api/strategic/swot` | GET/POST | CRUD de itens SWOT |

## Metodologias Implementadas

### BSC - Balanced Scorecard (Kaplan & Norton)
- **4 Perspectivas:** Financeira, Clientes, Processos Internos, Aprendizado & Crescimento
- Mapa estratégico com relações causa-efeito (ReactFlow)
- Pesos e contribuições para agregação de resultados

### PDCA - Plan-Do-Check-Act (Deming)
- **Plan:** Planejamento 5W2H (What, Why, Where, When, Who, How, How Much)
- **Do:** Execução com acompanhamento de progresso
- **Check:** Verificação via Follow-up 3G
- **Act:** Ação corretiva (reproposição) ou padronização

### 3G - Sangenism (Falconi)
- **GEMBA (現場):** Ir ao local onde acontece
- **GEMBUTSU (現物):** Observar o objeto/processo real
- **GENJITSU (現実):** Basear-se em fatos e dados

### GEROT - Gerenciamento da Rotina (Falconi)
- **IC (Itens de Controle):** Medem o RESULTADO
- **IV (Itens de Verificação):** Medem as CAUSAS
- Análise de anomalias com 5 Porquês
- Padronização após resolução

### SWOT - Análise Estratégica
- **Strengths:** Forças (interno/positivo)
- **Weaknesses:** Fraquezas (interno/negativo)
- **Opportunities:** Oportunidades (externo/positivo)
- **Threats:** Ameaças (externo/negativo)
- Matriz de priorização Impacto x Probabilidade

## Dependências Externas

| Pacote | Uso |
|--------|-----|
| `@nivo/treemap` | Visualização hierárquica de metas |
| `@nivo/radar` | Gráfico radar para SWOT |
| `reactflow` | Mapa estratégico interativo |
| `@hello-pangea/dnd` | Kanban drag & drop |
| `framer-motion` | Animações |

## Schemas de Banco

| Tabela | Descrição |
|--------|-----------|
| `strategic_strategy` | Estratégias (ciclos de planejamento) |
| `strategic_bsc_perspective` | Perspectivas BSC |
| `strategic_goal` | Metas estratégicas |
| `strategic_goal_cascade` | Relações de cascateamento |
| `strategic_kpi` | Indicadores de desempenho |
| `strategic_kpi_history` | Histórico de valores KPI |
| `strategic_action_plan` | Planos de ação 5W2H |
| `strategic_action_plan_follow_up` | Follow-ups 3G |
| `strategic_pdca_cycle` | Registros de ciclo PDCA |
| `strategic_control_item` | Itens de controle GEROT |
| `strategic_verification_item` | Itens de verificação GEROT |
| `strategic_idea_box` | Banco de ideias |
| `strategic_war_room_meeting` | Reuniões do War Room |
| `strategic_swot_analysis` | Itens SWOT |
| `strategic_standard_procedure` | Procedimentos padronizados |

## Referências Bibliográficas

1. **Evans, E.** (2003). *Domain-Driven Design*. Addison-Wesley.
2. **Kaplan, R. & Norton, D.** (1996). *The Balanced Scorecard*. Harvard Business Press.
3. **Falconi, V.** (2004). *Gerenciamento da Rotina do Trabalho do Dia a Dia*. INDG.
4. **Deming, W.E.** (1986). *Out of the Crisis*. MIT Press.

## Fases de Implementação

| Fase | Nome | Status | Horas |
|------|------|--------|-------|
| F1 | Fundação (Schemas, Entities, VOs) | ✅ | 160h |
| F2 | BSC Core (Repositories, APIs) | ✅ | 120h |
| F3 | Desdobramento (Cascateamento) | ✅ | 120h |
| F4 | KPIs (Integrações) | ✅ | 100h |
| F5 | GEROT (IC/IV, Anomalias) | ✅ | 140h |
| F5.5 | Banco de Ideias | ✅ | 60h |
| F6 | 5W2H + Follow-up 3G | ✅ | 120h |
| F7 | War Room | ✅ | 160h |
| F8 | SWOT | ✅ | 80h |
| F9 | Integração Final | ✅ | 11h |
| **TOTAL** | | | **1.071h** |
