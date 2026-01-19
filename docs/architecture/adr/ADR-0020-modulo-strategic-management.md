# ADR-0020: Implementação do Módulo de Gestão Estratégica

## Status

**Accepted** ✅

## Data

2026-01-18 (Atualizado: 2026-01-19)

## Contexto

O AuraCore necessita de um módulo para gestão estratégica empresarial que implemente:
- Balanced Scorecard (BSC) com 4 perspectivas
- Desdobramento de metas (CEO → Equipes)
- GEROT (Gerenciamento da Rotina) com IC/IV
- Planos de Ação 5W2H com ciclo PDCA
- Follow-up 3G (GEMBA/GEMBUTSU/GENJITSU) - Metodologia Falconi
- War Room para reuniões executivas
- Análise SWOT
- Banco de Ideias para melhoria contínua

O módulo deve integrar-se aos demais módulos do ERP (Financial, TMS, WMS, Fiscal) para consolidar KPIs em tempo real, oferecendo uma visão estratégica completa da organização.

## Decisão

Implementar o módulo seguindo arquitetura DDD/Hexagonal conforme ADR-0015, com as seguintes definições:

### Estrutura de Módulo

```
src/modules/strategic/
├── domain/
│   ├── entities/
│   │   ├── Strategy.ts
│   │   ├── StrategicGoal.ts
│   │   ├── KPI.ts
│   │   ├── ActionPlan.ts
│   │   ├── ActionPlanFollowUp.ts
│   │   ├── IdeaBox.ts
│   │   ├── WarRoomMeeting.ts
│   │   ├── MeetingDecision.ts
│   │   └── SwotAnalysis.ts
│   ├── aggregates/
│   │   └── StrategicPlanAggregate.ts
│   ├── value-objects/
│   │   ├── BSCPerspective.ts
│   │   ├── GoalStatus.ts
│   │   ├── ExecutionStatus.ts
│   │   ├── PDCACycle.ts
│   │   ├── KPITarget.ts
│   │   ├── CascadeLevel.ts
│   │   ├── ProblemSeverity.ts
│   │   └── IdeaStatus.ts
│   ├── services/
│   │   ├── GoalCascadeService.ts
│   │   ├── KPICalculatorService.ts
│   │   ├── AgendaGeneratorService.ts
│   │   └── VarianceAnalyzerService.ts
│   ├── events/
│   │   ├── GoalAchievedEvent.ts
│   │   ├── KPIAlertTriggeredEvent.ts
│   │   ├── ActionPlanOverdueEvent.ts
│   │   ├── FollowUpRequiredEvent.ts
│   │   ├── IdeaConvertedEvent.ts
│   │   └── RepropositionCreatedEvent.ts
│   ├── errors/
│   │   └── StrategicErrors.ts
│   └── ports/
│       ├── input/
│       │   ├── ICreateStrategy.ts
│       │   ├── ICreateGoal.ts
│       │   ├── ICascadeGoal.ts
│       │   ├── IUpdateKPI.ts
│       │   ├── ICreateActionPlan.ts
│       │   ├── IRegisterFollowUp.ts
│       │   ├── ISubmitIdea.ts
│       │   └── IGenerateAgenda.ts
│       └── output/
│           ├── IStrategyRepository.ts
│           ├── IGoalRepository.ts
│           ├── IKPIRepository.ts
│           ├── IActionPlanRepository.ts
│           ├── IIdeaRepository.ts
│           ├── IMeetingRepository.ts
│           ├── IFinancialKPIAdapter.ts
│           ├── ITMSKPIAdapter.ts
│           └── IWMSKPIAdapter.ts
├── application/
│   ├── commands/
│   │   ├── CreateStrategyUseCase.ts
│   │   ├── ActivateStrategyUseCase.ts
│   │   ├── CreateGoalUseCase.ts
│   │   ├── CascadeGoalUseCase.ts
│   │   ├── UpdateKPIValueUseCase.ts
│   │   ├── CreateActionPlanUseCase.ts
│   │   ├── AdvancePDCAUseCase.ts
│   │   ├── RegisterFollowUpUseCase.ts
│   │   ├── ReproposeActionPlanUseCase.ts
│   │   ├── SubmitIdeaUseCase.ts
│   │   ├── ReviewIdeaUseCase.ts
│   │   ├── ConvertIdeaUseCase.ts
│   │   ├── ScheduleMeetingUseCase.ts
│   │   ├── StartMeetingUseCase.ts
│   │   └── RecordDecisionUseCase.ts
│   ├── queries/
│   │   ├── GetStrategyDashboardQuery.ts
│   │   ├── GetStrategicMapQuery.ts
│   │   ├── GetGoalsByPerspectiveQuery.ts
│   │   ├── GetKPIHistoryQuery.ts
│   │   ├── GetActionPlansKanbanQuery.ts
│   │   ├── GetFollowUpTimelineQuery.ts
│   │   ├── GetIdeasQuery.ts
│   │   ├── GetWarRoomDashboardQuery.ts
│   │   ├── GenerateAgendaQuery.ts
│   │   └── GetThreeGenerationsReportQuery.ts
│   └── dtos/
│       ├── StrategyDTO.ts
│       ├── GoalDTO.ts
│       ├── KPIDTO.ts
│       ├── ActionPlanDTO.ts
│       └── MeetingDTO.ts
└── infrastructure/
    ├── persistence/
    │   ├── repositories/
    │   │   ├── DrizzleStrategyRepository.ts
    │   │   ├── DrizzleGoalRepository.ts
    │   │   ├── DrizzleKPIRepository.ts
    │   │   ├── DrizzleActionPlanRepository.ts
    │   │   ├── DrizzleIdeaRepository.ts
    │   │   └── DrizzleMeetingRepository.ts
    │   ├── mappers/
    │   │   ├── StrategyMapper.ts
    │   │   ├── GoalMapper.ts
    │   │   ├── KPIMapper.ts
    │   │   ├── ActionPlanMapper.ts
    │   │   ├── IdeaMapper.ts
    │   │   └── MeetingMapper.ts
    │   └── schemas/
    │       ├── strategy.schema.ts
    │       ├── strategic-goal.schema.ts
    │       ├── goal-cascade.schema.ts
    │       ├── kpi.schema.ts
    │       ├── kpi-history.schema.ts
    │       ├── action-plan.schema.ts
    │       ├── action-plan-follow-up.schema.ts
    │       ├── idea-box.schema.ts
    │       ├── war-room-meeting.schema.ts
    │       ├── meeting-participant.schema.ts
    │       ├── meeting-agenda-item.schema.ts
    │       ├── meeting-decision.schema.ts
    │       └── swot-analysis.schema.ts
    ├── adapters/
    │   ├── FinancialKPIAdapter.ts
    │   ├── TMSKPIAdapter.ts
    │   └── WMSKPIAdapter.ts
    └── di/
        └── strategic.container.ts
```

### Tecnologias Específicas

| Tecnologia | Propósito | Justificativa |
|------------|-----------|---------------|
| **ReactFlow** | Mapa estratégico BSC interativo | Nodes/edges customizáveis, zoom, pan, minimap |
| **Tremor** | Gráficos e dashboards | Integração nativa com Tailwind, charts responsivos |
| **@hello-pangea/dnd** | Kanban PDCA | Fork mantido do react-beautiful-dnd |
| **react-gauge-chart** | Gauge para KPIs | Simples e customizável |
| **SSE (Server-Sent Events)** | Real-time no War Room | Unidirecional, reconexão automática |

### Integrações

| Módulo | Tipo | KPIs |
|--------|------|------|
| Financial | Leitura | EBITDA, Receita, Custos, Margem, Inadimplência |
| TMS | Leitura | OTD, Lead Time, Custo/Km, Avarias, Entregas |
| WMS | Leitura | Acuracidade, Giro de Estoque, Ocupação |
| Fiscal | Leitura | Compliance SPED, Alertas fiscais |

### Padrões de Integração

Cada integração será implementada via Adapter:

```typescript
// domain/ports/output/IFinancialKPIAdapter.ts
export interface IFinancialKPIAdapter {
  getEBITDA(period: DateRange): Promise<Result<Money, string>>;
  getRevenue(period: DateRange): Promise<Result<Money, string>>;
  getCosts(period: DateRange): Promise<Result<Money, string>>;
}

// infrastructure/adapters/FinancialKPIAdapter.ts
@injectable()
export class FinancialKPIAdapter implements IFinancialKPIAdapter {
  constructor(
    @inject(TOKENS.FinancialRepository) 
    private financialRepo: IFinancialRepository
  ) {}
  
  async getEBITDA(period: DateRange): Promise<Result<Money, string>> {
    // Implementação via query ao módulo Financial
  }
}
```

## Consequências

### Positivas

1. **Visão estratégica integrada ao ERP operacional**
   - Elimina necessidade de planilhas paralelas
   - Dados de KPIs são reais, não estimados

2. **Metodologia Falconi (TQC Brasileiro) nativa**
   - GEROT com IC/IV
   - Follow-up 3G para validação real
   - Ciclo PDCA completo

3. **Rastreabilidade completa**
   - Metas → Ações → Resultados
   - Histórico de reproposições
   - Evidências de follow-up

4. **War Room para decisões em tempo real**
   - Dashboard executivo
   - Alertas automáticos
   - Geração de pauta inteligente

### Negativas

1. **Complexidade adicional no sistema**
   - Mais tabelas no banco
   - Mais telas para manter
   - Curva de aprendizado

2. **Necessidade de treinamento em BSC/PDCA**
   - Usuários precisam entender metodologia
   - Mudança cultural necessária

3. **Overhead de processamento para KPIs em tempo real**
   - Queries agregadas em múltiplos módulos
   - Cache necessário para performance

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dados inconsistentes entre módulos | Média | Alto | Validação via Domain Events |
| Performance do mapa estratégico com muitos nós | Média | Médio | Virtualização ReactFlow |
| Adoção baixa por usuários | Média | Alto | Treinamento + gamificação |
| Integração com módulos legados | Alta | Alto | Adapters específicos |

## Alternativas Consideradas

### 1. Usar ferramenta externa (Power BI, Tableau)

**Rejeitado porque:**
- Dados duplicados
- Sem integração com fluxos do ERP
- Custo adicional de licenciamento

### 2. Módulo simplificado (apenas KPIs)

**Rejeitado porque:**
- Perde metodologia PDCA
- Não suporta cascateamento
- Não atende requisito de GEROT

### 3. Integração com software de BSC especializado

**Rejeitado porque:**
- Complexidade de integração
- Custo de licenciamento
- Dados fora do ERP

## Referências

- KAPLAN, R. S.; NORTON, D. P. *The Balanced Scorecard*. Harvard Business Press, 1996.
- FALCONI, V. *Gerenciamento da Rotina do Trabalho do Dia-a-dia*. INDG, 2004.
- FALCONI, V. *Gerenciamento pelas Diretrizes*. INDG, 2004.
- `_documentation/PLANEJAMENTO_MODULO_ESTRATEGICO_AURACORE.md`
- `_documentation/ANALISE_MODULO_ESTRATEGICO_AURACORE.md`
- `_documentation/ANALISE_COMPONENTES_MODULO_ESTRATEGICO.md`

## Notas de Implementação

### Fases

| Fase | Semanas | Entregas |
|------|---------|----------|
| F1 - Fundação | 1-4 | Schemas, Entities, Repositories, DI |
| F2 - BSC Core | 5-7 | Perspectivas, Mapa Estratégico, Dashboard |
| F3 - Desdobramento | 8-10 | Cascateamento, Pesos, Agregação |
| F4 - KPIs | 11-12.5 | CRUD, Integrações, Alertas |
| F5 - GEROT | 13-15.5 | IC, IV, Anomalias, Padronização |
| F5.5 - Banco de Ideias | 16-16.5 | IdeaBox Entity, Conversões |
| F6 - 5W2H + Follow-up 3G | 17-19 | 5W2H, PDCA Kanban, Follow-up 3G |
| F7 - War Room | 20-23 | Dashboard, Reuniões, Pautas, Real-time |
| F8 - SWOT | 24-25 | CRUD SWOT, Radar, Priorização |
| F9 - Integração | 25.5 | Testes E2E, Documentação |

### Estimativa Total

- **Horas:** 1.071h
- **Desenvolvedor:** Pedro Jr.
- **Início:** 2026-02-01
- **Término previsto:** 2026-08-15
