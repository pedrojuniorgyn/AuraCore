# Domínio Strategic - Gestão Estratégica

## Visão Geral

O domínio Strategic é responsável por toda a gestão estratégica e qualidade total do AuraCore, implementando metodologias consagradas como BSC (Kaplan & Norton), PDCA (Deming), GEROT e 3G (Falconi).

## Bounded Context

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGIC DOMAIN                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   BSC       │    │   GEROT     │    │   5W2H      │        │
│  │ Perspect.   │───▶│ IC/IV       │───▶│ Action Plan │        │
│  │ Goals       │    │ Anomalies   │    │ PDCA        │        │
│  │ KPIs        │    │             │    │ Follow-up   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                                      │                │
│         ▼                                      ▼                │
│  ┌─────────────┐                      ┌─────────────┐          │
│  │  WAR ROOM   │◀─────────────────────│  IDEA BOX   │          │
│  │ Dashboard   │                      │ Suggestions │          │
│  │ Meetings    │                      │ Conversions │          │
│  └─────────────┘                      └─────────────┘          │
│                                                                 │
│  ┌─────────────┐                                                │
│  │   SWOT      │                                                │
│  │ Analysis    │                                                │
│  │ Priorities  │                                                │
│  └─────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Linguagem Ubíqua (Ubiquitous Language)

| Termo | Definição |
|-------|-----------|
| **Estratégia** | Plano estratégico com visão, missão, valores e objetivos para um período |
| **Perspectiva** | Uma das 4 dimensões do BSC (Financeira, Clientes, Processos, Aprendizado) |
| **Objetivo Estratégico** | Meta de alto nível vinculada a uma perspectiva com indicadores mensuráveis |
| **Cascateamento** | Desdobramento de metas do CEO até equipes operacionais em níveis hierárquicos |
| **Relação Causa-Efeito** | Vínculo entre objetivos onde um influencia o resultado do outro |
| **KPI** | Key Performance Indicator - indicador que mede o progresso de um objetivo |
| **IC (Item de Controle)** | Indicador que mede o resultado de um processo (outcome) |
| **IV (Item de Verificação)** | Indicador que mede as causas do resultado (driver) |
| **Anomalia** | Desvio não desejado que requer tratamento imediato |
| **Plano de Ação 5W2H** | Plano estruturado com What, Why, Where, When, Who, How, How much |
| **Ciclo PDCA** | Plan-Do-Check-Act - ciclo de melhoria contínua |
| **Follow-up 3G** | Verificação in loco seguindo GEMBA/GEMBUTSU/GENJITSU |
| **GEMBA** | 現場 - Ir ao local onde acontece |
| **GEMBUTSU** | 現物 - Observar o objeto/processo real |
| **GENJITSU** | 現実 - Basear-se em fatos e dados |
| **Reproposição** | Novo plano de ação gerado após follow-up com problemas |
| **Padronização** | Documentação de procedimento após resolução bem-sucedida |
| **War Room** | Sala de controle executivo para monitoramento e decisões |
| **Pauta Automática** | Agenda de reunião gerada automaticamente com alertas e KPIs críticos |
| **Banco de Ideias** | Repositório de sugestões de melhoria dos colaboradores |
| **SWOT** | Análise de Strengths, Weaknesses, Opportunities, Threats |

## Agregados (Aggregates)

### 1. Strategy (Aggregate Root)

Representa um ciclo de planejamento estratégico.

```
Strategy
├── id: string
├── name: string
├── vision: string
├── mission: string
├── values: string[]
├── startDate: Date
├── endDate: Date
├── status: StrategyStatus
└── Perspectives[] (fixas, 4)
```

### 2. StrategicGoal (Aggregate Root)

Objetivo estratégico vinculado a uma perspectiva.

```
StrategicGoal
├── id: string
├── strategyId: string
├── perspectiveCode: string
├── parentGoalId?: string
├── code: string
├── description: string
├── cascadeLevel: CascadeLevel
├── targetValue: number
├── currentValue: number
├── weight: number
├── ownerUserId: string
├── status: GoalStatus
├── KPIs[]
├── CauseEffectRelations[]
└── ActionPlans[]
```

### 3. ActionPlan (Aggregate Root)

Plano de ação 5W2H com ciclo PDCA.

```
ActionPlan
├── id: string
├── goalId: string
├── code: string
├── what: string
├── why: string
├── where: string
├── whenStart: Date
├── whenEnd: Date
├── who: string
├── how: string
├── howMuchAmount: Money
├── pdcaCycle: PDCACycle
├── completionPercent: number
├── parentActionPlanId?: string
├── repropositionNumber: number
├── FollowUps[]
└── Evidences[]
```

### 4. WarRoomMeeting (Aggregate Root)

Reunião executiva do War Room.

```
WarRoomMeeting
├── id: string
├── strategyId: string
├── meetingType: MeetingType
├── title: string
├── scheduledAt: Date
├── startedAt?: Date
├── endedAt?: Date
├── status: MeetingStatus
├── Participants[]
├── AgendaItems[]
└── Decisions[]
```

### 5. IdeaBox (Aggregate Root)

Sugestão do banco de ideias.

```
IdeaBox
├── id: string
├── code: string
├── title: string
├── description: string
├── sourceType: IdeaSourceType
├── category: string
├── submittedBy: string
├── urgency: UrgencyLevel
├── importance: ImportanceLevel
├── estimatedImpact: ImpactLevel
├── estimatedCost: Money
├── estimatedBenefit: Money
├── status: IdeaStatus
├── reviewedBy?: string
├── convertedTo?: ConversionTarget
└── convertedEntityId?: string
```

### 6. SwotAnalysis (Aggregate Root)

Análise SWOT com priorização.

```
SwotAnalysis
├── id: string
├── strategyId: string
├── title: string
├── analysisDate: Date
├── Strengths[]
├── Weaknesses[]
├── Opportunities[]
├── Threats[]
├── Priorities[]
└── status: AnalysisStatus
```

## Invariantes de Negócio

1. **Perspectivas são fixas:** Sempre 4 (FIN, CLI, INT, LRN), não podem ser criadas/deletadas
2. **Cascateamento hierárquico:** CEO → DIRECTOR → MANAGER → TEAM (ordem obrigatória)
3. **Peso total = 100%:** Soma dos pesos de goals em uma perspectiva = 100%
4. **PDCA sequencial:** PLAN → DO → CHECK → ACT (não pode pular etapas)
5. **Limite de reproposições:** Máximo 3 antes de escalonamento obrigatório
6. **Follow-up obrigatório:** Plano só pode ser fechado após follow-up
7. **Conversão única:** Ideia aprovada só pode ser convertida uma vez
8. **Multi-tenancy:** Todas as entidades filtram por organizationId + branchId

## Documentação Relacionada

- [Entities](./entities.md) - Especificação completa das entidades
- [Value Objects](./value-objects.md) - Value Objects do domínio
- [Domain Services](./domain-services.md) - Serviços de domínio stateless
- [Events](./events.md) - Domain Events
- [Integrations](./integrations.md) - Integrações com outros módulos

## Referências

- KAPLAN, R. S.; NORTON, D. P. *The Balanced Scorecard*. Harvard Business Press, 1996.
- KAPLAN, R. S.; NORTON, D. P. *Strategy Maps*. Harvard Business Press, 2004.
- FALCONI, V. *Gerenciamento da Rotina do Trabalho do Dia-a-dia*. INDG, 2004.
- FALCONI, V. *Gerenciamento pelas Diretrizes*. INDG, 2004.
- DEMING, W. E. *Out of the Crisis*. MIT Press, 1986.
