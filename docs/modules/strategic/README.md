# Módulo Strategic - Gestão Estratégica e Qualidade Total

## Visão Geral

O módulo Strategic implementa um sistema completo de gestão estratégica empresarial para o AuraCore, integrando metodologias consagradas:

- **Balanced Scorecard (BSC)** - Kaplan & Norton
- **PDCA** - Deming
- **GEROT/3G** - Falconi
- **5W2H** - Planos de ação estruturados
- **Análise SWOT** - Planejamento estratégico

## Funcionalidades Principais

### 1. Balanced Scorecard (BSC)

- 4 perspectivas fixas: Financeira, Clientes, Processos, Aprendizado
- Mapa estratégico interativo com relações causa-efeito
- Dashboard com gauges e tendências
- Pesos e agregação automática

### 2. Desdobramento de Metas

- Cascateamento hierárquico: CEO → DIRECTOR → MANAGER → TEAM
- Vinculação entre metas de diferentes níveis
- Cálculo bottom-up de progresso agregado
- Multi-branch para organizações descentralizadas

### 3. KPIs e Indicadores

- KPIs manuais e automatizados
- Integrações com Financial, TMS, WMS
- Alertas automáticos (WARNING/CRITICAL)
- Histórico e tendências
- Previsões baseadas em regressão

### 4. GEROT - Gerenciamento da Rotina

- Itens de Controle (IC) - Resultados
- Itens de Verificação (IV) - Causas
- Tratamento de Anomalias
- Padronização de procedimentos

### 5. Planos de Ação 5W2H

- Estrutura completa: What, Why, Where, When, Who, How, How much
- Ciclo PDCA integrado
- Kanban visual por etapa
- Controle de custos acumulados

### 6. Follow-up 3G

- GEMBA: Ir ao local
- GEMBUTSU: Observar o real
- GENJITSU: Fatos e dados
- Reproposição automática
- Limite de 3 reproposições

### 7. War Room

- Dashboard executivo real-time (SSE)
- Geração automática de pautas
- Registro de decisões
- Atas automáticas

### 8. Banco de Ideias

- Submissão de sugestões
- Priorização por matriz Eisenhower
- Análise de ROI
- Conversão para planos/metas/projetos

### 9. Análise SWOT

- 4 quadrantes: Forças, Fraquezas, Oportunidades, Ameaças
- Priorização por impacto
- Conversão para planos de ação

## Tecnologias Específicas

| Tecnologia | Uso |
|------------|-----|
| ReactFlow | Mapa estratégico interativo |
| Tremor | Gráficos e dashboards |
| @hello-pangea/dnd | Kanban PDCA |
| react-gauge-chart | Gauges de KPI |
| SSE | Real-time War Room |

## Estrutura do Módulo

```
src/modules/strategic/
├── domain/
│   ├── entities/          # Strategy, Goal, KPI, ActionPlan, etc.
│   ├── aggregates/        # StrategicPlanAggregate
│   ├── value-objects/     # BSCPerspective, GoalStatus, PDCACycle
│   ├── services/          # GoalCascadeService, KPICalculatorService
│   ├── events/            # GoalAchievedEvent, KPIAlertTriggeredEvent
│   ├── errors/            # StrategicErrors
│   └── ports/
│       ├── input/         # Use case interfaces
│       └── output/        # Repository interfaces, Adapters
├── application/
│   ├── commands/          # Write operations
│   ├── queries/           # Read operations
│   └── dtos/              # Data transfer objects
└── infrastructure/
    ├── persistence/
    │   ├── repositories/  # DrizzleStrategyRepository, etc.
    │   ├── mappers/       # StrategyMapper, GoalMapper
    │   └── schemas/       # Drizzle schemas
    ├── adapters/          # FinancialKPIAdapter, TMSKPIAdapter
    └── di/                # strategic.container.ts
```

## Integrações

| Módulo | Tipo | Dados |
|--------|------|-------|
| Financial | Leitura | EBITDA, Receita, Custos, Inadimplência |
| TMS | Leitura | OTD, Lead Time, Custo/Km, Avarias |
| WMS | Leitura | Acuracidade, Giro, Ocupação |
| Fiscal | Leitura (futuro) | Compliance SPED |

## Documentação Relacionada

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura detalhada
- [API.md](./API.md) - Referência de API
- [SCREENS.md](./SCREENS.md) - Documentação de telas
- [TESTS.md](./TESTS.md) - Estratégia de testes

## ADRs Relacionados

- [ADR-0020: Módulo Strategic Management](../../architecture/adr/ADR-0020-modulo-strategic-management.md)
- [ADR-0021: Implementação BSC](../../architecture/adr/ADR-0021-bsc-implementation.md)
- [ADR-0022: Follow-up 3G Pattern](../../architecture/adr/ADR-0022-follow-up-3g-pattern.md)
- [ADR-0023: Real-time War Room](../../architecture/adr/ADR-0023-real-time-war-room.md)

## Domain Specification

- [Domain README](../../architecture/domains/strategic/README.md)
- [Entities](../../architecture/domains/strategic/entities.md)
- [Value Objects](../../architecture/domains/strategic/value-objects.md)
- [Domain Services](../../architecture/domains/strategic/domain-services.md)
- [Events](../../architecture/domains/strategic/events.md)
- [Integrations](../../architecture/domains/strategic/integrations.md)

## Fases de Implementação

| Fase | Nome | Semanas | Status |
|------|------|---------|--------|
| F1 | Fundação | 1-4 | Planejado |
| F2 | BSC Core | 5-7 | Planejado |
| F3 | Desdobramento | 8-10 | Planejado |
| F4 | KPIs | 11-12.5 | Planejado |
| F5 | GEROT | 13-15.5 | Planejado |
| F5.5 | Banco de Ideias | 16-16.5 | Planejado |
| F6 | 5W2H + Follow-up 3G | 17-19 | Planejado |
| F7 | War Room | 20-23 | Planejado |
| F8 | SWOT | 24-25 | Planejado |
| F9 | Integração | 25.5 | Planejado |

## Referências Bibliográficas

1. KAPLAN, R. S.; NORTON, D. P. *The Balanced Scorecard*. Harvard Business Press, 1996.
2. KAPLAN, R. S.; NORTON, D. P. *Strategy Maps*. Harvard Business Press, 2004.
3. FALCONI, V. *Gerenciamento da Rotina do Trabalho do Dia-a-dia*. INDG, 2004.
4. FALCONI, V. *Gerenciamento pelas Diretrizes*. INDG, 2004.
5. DEMING, W. E. *Out of the Crisis*. MIT Press, 1986.
