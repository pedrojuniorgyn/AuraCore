# Arquitetura do Módulo Strategic

## Visão Geral

O módulo Strategic segue 100% a arquitetura DDD/Hexagonal definida no ADR-0015.

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Next.js API │  │ React Pages │  │ SSE Stream              │ │
│  │ Routes      │  │ Components  │  │ (War Room)              │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION                              │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │      Commands       │    │       Queries       │            │
│  │  CreateStrategy     │    │  GetDashboard       │            │
│  │  CreateGoal         │    │  GetStrategicMap    │            │
│  │  UpdateKPI          │    │  GetKanban          │            │
│  │  RegisterFollowUp   │    │  GenerateAgenda     │            │
│  └──────────┬──────────┘    └──────────┬──────────┘            │
│             │                          │                        │
└─────────────┼──────────────────────────┼────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                          DOMAIN                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Entities   │  │    Value    │  │   Domain    │            │
│  │  Strategy   │  │   Objects   │  │  Services   │            │
│  │  Goal       │  │ Perspective │  │  Cascade    │            │
│  │  KPI        │  │ PDCACycle   │  │  KPICalc    │            │
│  │  ActionPlan │  │ GoalStatus  │  │  Agenda     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                         Ports                            │   │
│  │  ┌─────────────┐              ┌─────────────────────┐   │   │
│  │  │   Input     │              │       Output        │   │   │
│  │  │ ICreateGoal │              │ IGoalRepository     │   │   │
│  │  │ IUpdateKPI  │              │ IKPIAdapter         │   │   │
│  │  └─────────────┘              └─────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
              ▲                          ▲
              │                          │
              │    ┌─────────────────────┘
              │    │
┌─────────────┴────┴──────────────────────────────────────────────┐
│                      INFRASTRUCTURE                             │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │    Persistence      │    │      Adapters       │            │
│  │  DrizzleStrategyRepo│    │  FinancialKPIAdapter│            │
│  │  DrizzleGoalRepo    │    │  TMSKPIAdapter      │            │
│  │  StrategyMapper     │    │  WMSKPIAdapter      │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │      Schemas        │    │   Event Handlers    │            │
│  │  strategy.schema    │    │  NotificationHandler│            │
│  │  goal.schema        │    │  SSEBroadcaster     │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxos Principais

### 1. Criação de Meta com Cascateamento

```
                    CreateGoalUseCase
                           │
                           ▼
┌──────────────────────────────────────────┐
│ 1. Validar input (Zod)                   │
│ 2. Verificar multi-tenancy               │
│ 3. Validar cascadeLevel (DomainService)  │
│ 4. Criar StrategicGoal.create()          │
│ 5. Salvar via IGoalRepository            │
│ 6. Publicar GoalCreatedEvent             │
│ 7. Retornar Result<GoalDTO, string>      │
└──────────────────────────────────────────┘
                           │
                           ▼
            DrizzleGoalRepository.save()
                           │
                           ▼
                  GoalMapper.toPersistence()
                           │
                           ▼
                    SQL Server INSERT
```

### 2. Atualização de KPI Automática

```
     KPIUpdateJob (cron: cada 1h)
                │
                ▼
┌──────────────────────────────────┐
│ 1. Buscar KPIs com sourceType    │
│    != MANUAL                     │
│ 2. Para cada KPI:                │
│    a. Obter adapter via Factory  │
│    b. Chamar getCurrentValue()   │
│    c. Atualizar KPI.updateValue()│
│    d. Salvar via Repository      │
│    e. Se RED, publicar Alert     │
└──────────────────────────────────┘
                │
                ▼
       FinancialKPIAdapter
       TMSKPIAdapter
       WMSKPIAdapter
                │
                ▼
    Query aos módulos externos
```

### 3. Follow-up 3G com Reproposição

```
    RegisterFollowUpUseCase
               │
               ▼
┌──────────────────────────────────────┐
│ 1. Validar input (3G obrigatório)    │
│ 2. Buscar ActionPlan                 │
│ 3. ActionPlan.registerFollowUp()     │
│ 4. Se requiresNewPlan:               │
│    a. ActionPlan.repropose()         │
│    b. Salvar novo plano              │
│    c. Publicar RepropositionCreated  │
│ 5. Salvar follow-up                  │
│ 6. Publicar FollowUpRegisteredEvent  │
└──────────────────────────────────────┘
```

### 4. War Room Real-time

```
       Browser (EventSource)
              │
              │ GET /api/strategic/war-room/stream
              ▼
┌──────────────────────────────────────┐
│ SSE Endpoint (Next.js Route)         │
│                                      │
│ 1. Autenticar sessão                 │
│ 2. Criar ReadableStream              │
│ 3. Loop de atualização (30s):        │
│    a. Buscar KPIs atualizados        │
│    b. Buscar novos alertas           │
│    c. Enviar eventos SSE             │
│ 4. Escutar broadcasts do EventBus    │
│    (decisões, participantes)         │
└──────────────────────────────────────┘
              │
              ▼
       SSE Events:
       - INITIAL_STATE
       - KPI_UPDATE
       - ALERT
       - DECISION_RECORDED
```

## Schemas de Banco de Dados

### Tabelas Principais

```sql
-- Estratégia
strategic_strategy (
  id, organization_id, branch_id,
  name, vision, mission, values,
  start_date, end_date, status,
  created_at, updated_at, deleted_at
)

-- Objetivo Estratégico
strategic_goal (
  id, organization_id, branch_id,
  strategy_id, perspective_code, parent_goal_id,
  code, description, cascade_level,
  target_value, current_value, unit, weight,
  owner_user_id, owner_branch_id,
  start_date, due_date, status,
  map_position_x, map_position_y,
  created_at, updated_at, deleted_at
)

-- Cascateamento
strategic_goal_cascade (
  id, parent_goal_id, child_goal_id,
  contribution_weight,
  created_at
)

-- KPI
strategic_kpi (
  id, organization_id, branch_id, goal_id,
  code, name, description, unit,
  polarity, target_value, current_value,
  alert_threshold, critical_threshold,
  source_type, source_config, frequency,
  last_updated_at, created_at, updated_at
)

-- Histórico de KPI
strategic_kpi_history (
  id, kpi_id, value, period_date,
  source_type, recorded_by,
  created_at
)

-- Plano de Ação
strategic_action_plan (
  id, organization_id, branch_id, goal_id,
  code,
  what, why, where, when_start, when_end, who, how,
  how_much_amount, how_much_currency,
  pdca_cycle, completion_percent,
  parent_action_plan_id, reproposition_number, reproposition_reason,
  status, closed_at, closed_by, outcome,
  standardization_required, standardization_id,
  created_at, updated_at, deleted_at
)

-- Follow-up
strategic_action_plan_follow_up (
  id, organization_id, branch_id, action_plan_id,
  follow_up_number, follow_up_date,
  gemba_local, gembutsu_observation, genjitsu_data,
  execution_status, execution_percent,
  problems_observed, problem_severity,
  requires_new_plan, new_plan_description, new_plan_assigned_to,
  child_action_plan_id,
  verified_by, verified_at, evidence_urls,
  created_at
)

-- Banco de Ideias
strategic_idea_box (
  id, organization_id, branch_id,
  code, title, description,
  source_type, category, submitted_by, department,
  urgency, importance,
  estimated_impact, estimated_cost_amount, estimated_cost_currency,
  estimated_benefit_amount, estimated_benefit_currency,
  status, reviewed_by, reviewed_at, review_notes,
  converted_to, converted_entity_id,
  created_at, updated_at, deleted_at
)

-- Reunião War Room
strategic_war_room_meeting (
  id, organization_id, branch_id, strategy_id,
  meeting_type, title, description,
  scheduled_at, scheduled_duration,
  started_at, ended_at, status,
  created_by, created_at, updated_at
)

-- Participante
strategic_meeting_participant (
  id, meeting_id, user_id, role,
  joined_at, left_at
)

-- Item de Pauta
strategic_meeting_agenda_item (
  id, meeting_id, order_index,
  type, title, description, presenter, duration,
  source_type, source_entity_id,
  status, started_at, completed_at
)

-- Decisão
strategic_meeting_decision (
  id, meeting_id, agenda_item_id,
  text, responsible_user_id, due_date,
  recorded_by, recorded_at
)

-- SWOT
strategic_swot_analysis (
  id, organization_id, branch_id, strategy_id,
  title, description, analysis_date,
  status, created_by, created_at, updated_at
)

strategic_swot_item (
  id, swot_analysis_id, quadrant,
  text, impact, priority,
  created_at
)
```

### Índices

```sql
-- Multi-tenancy (todos os schemas)
CREATE INDEX idx_strategic_*_tenant 
  ON strategic_* (organization_id, branch_id);

-- Lookups frequentes
CREATE INDEX idx_strategic_goal_strategy 
  ON strategic_goal (strategy_id);

CREATE INDEX idx_strategic_goal_perspective 
  ON strategic_goal (perspective_code);

CREATE INDEX idx_strategic_goal_parent 
  ON strategic_goal (parent_goal_id);

CREATE INDEX idx_strategic_kpi_goal 
  ON strategic_kpi (goal_id);

CREATE INDEX idx_strategic_action_plan_goal 
  ON strategic_action_plan (goal_id);

CREATE INDEX idx_strategic_follow_up_action_plan 
  ON strategic_action_plan_follow_up (action_plan_id);
```

## Dependency Injection

```typescript
// infrastructure/di/strategic.container.ts
import { container } from 'tsyringe';

// Tokens
export const STRATEGIC_TOKENS = {
  // Repositories
  StrategyRepository: Symbol('IStrategyRepository'),
  GoalRepository: Symbol('IGoalRepository'),
  KPIRepository: Symbol('IKPIRepository'),
  ActionPlanRepository: Symbol('IActionPlanRepository'),
  FollowUpRepository: Symbol('IFollowUpRepository'),
  IdeaRepository: Symbol('IIdeaRepository'),
  MeetingRepository: Symbol('IMeetingRepository'),
  
  // Adapters
  FinancialKPIAdapter: Symbol('IFinancialKPIAdapter'),
  TMSKPIAdapter: Symbol('ITMSKPIAdapter'),
  WMSKPIAdapter: Symbol('IWMSKPIAdapter'),
  KPIAdapterFactory: Symbol('IKPIAdapterFactory'),
  
  // Use Cases - Commands
  CreateStrategyUseCase: Symbol('CreateStrategyUseCase'),
  CreateGoalUseCase: Symbol('CreateGoalUseCase'),
  CascadeGoalUseCase: Symbol('CascadeGoalUseCase'),
  UpdateKPIValueUseCase: Symbol('UpdateKPIValueUseCase'),
  CreateActionPlanUseCase: Symbol('CreateActionPlanUseCase'),
  RegisterFollowUpUseCase: Symbol('RegisterFollowUpUseCase'),
  
  // Use Cases - Queries
  GetStrategyDashboardQuery: Symbol('GetStrategyDashboardQuery'),
  GetStrategicMapQuery: Symbol('GetStrategicMapQuery'),
  GetKanbanQuery: Symbol('GetKanbanQuery'),
  GenerateAgendaQuery: Symbol('GenerateAgendaQuery'),
  
  // Services
  WarRoomBroadcaster: Symbol('IWarRoomBroadcaster'),
};

// Registrations
container.registerSingleton(
  STRATEGIC_TOKENS.StrategyRepository,
  DrizzleStrategyRepository
);

container.registerSingleton(
  STRATEGIC_TOKENS.GoalRepository,
  DrizzleGoalRepository
);

// ... demais registros
```

## Componentes React Principais

### StrategicMap (ReactFlow)

```typescript
// components/strategic/StrategicMap.tsx
interface Props {
  strategyId: string;
  editable?: boolean;
}

function StrategicMap({ strategyId, editable = false }: Props) {
  const { nodes, edges, onNodesChange, onEdgesChange } = useStrategicMap(strategyId);
  
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={editable ? onNodesChange : undefined}
        fitView
      >
        <Background variant="dots" />
        <Controls />
        <MiniMap />
        
        {/* Lanes por perspectiva */}
        <PerspectiveLane code="FIN" label="Financeira" color="yellow" />
        <PerspectiveLane code="CLI" label="Clientes" color="blue" />
        <PerspectiveLane code="INT" label="Processos" color="green" />
        <PerspectiveLane code="LRN" label="Aprendizado" color="purple" />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
```

### PDCAKanban (hello-pangea/dnd)

```typescript
// components/strategic/PDCAKanban.tsx
interface Props {
  goalId?: string;
  onAdvance: (planId: string, fromCycle: string, toCycle: string) => void;
}

function PDCAKanban({ goalId, onAdvance }: Props) {
  const { plans, loading } = useActionPlans({ goalId });
  
  const columns = {
    PLAN: plans.filter(p => p.pdcaCycle === 'PLAN'),
    DO: plans.filter(p => p.pdcaCycle === 'DO'),
    CHECK: plans.filter(p => p.pdcaCycle === 'CHECK'),
    ACT: plans.filter(p => p.pdcaCycle === 'ACT'),
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(columns).map(([cycle, items]) => (
          <Droppable key={cycle} droppableId={cycle}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-slate-100 rounded-lg p-4"
              >
                <h3 className="font-semibold mb-4">{cycleLabels[cycle]}</h3>
                {items.map((plan, index) => (
                  <Draggable key={plan.id} draggableId={plan.id} index={index}>
                    {(provided) => (
                      <ActionPlanCard
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        plan={plan}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
```

### WarRoomDashboard (SSE)

```typescript
// components/strategic/WarRoomDashboard.tsx
function WarRoomDashboard() {
  const { state, isConnected, isPolling } = useWarRoom();
  
  if (!state) return <LoadingSpinner />;
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">🎖️ WAR ROOM</h1>
          <ConnectionStatus isConnected={isConnected} isPolling={isPolling} />
        </div>
        <ParticipantAvatars participants={state.participants} />
      </header>
      
      {/* Spotlight KPIs */}
      <section className="grid grid-cols-4 gap-6 mb-8">
        {state.kpis.slice(0, 4).map(kpi => (
          <SpotlightKPICard key={kpi.id} kpi={kpi} />
        ))}
      </section>
      
      <div className="grid grid-cols-3 gap-6">
        <AlertPanel alerts={state.alerts} />
        <KPIGrid kpis={state.kpis.slice(4)} />
        <AgendaPanel currentItem={state.currentAgendaItem} />
      </div>
    </div>
  );
}
```

## Segurança e Permissões

### RBAC

| Permissão | Descrição | Roles |
|-----------|-----------|-------|
| strategic:read | Visualizar dashboards e metas | Todos |
| strategic:goal:create | Criar objetivos | Manager, Director, Admin |
| strategic:goal:cascade | Desdobrar metas | Director, Admin |
| strategic:kpi:update | Atualizar KPIs | Manager, Admin |
| strategic:action-plan:create | Criar planos | Todos |
| strategic:action-plan:close | Fechar planos | Manager, Admin |
| strategic:meeting:start | Iniciar reuniões | Director, Admin |
| strategic:meeting:decide | Registrar decisões | Director, Admin |
| strategic:idea:review | Analisar ideias | Manager, Admin |

### Multi-Tenancy

Todas as queries filtram por `organizationId` e `branchId`:

```typescript
// Exemplo em repository
async findByGoal(
  goalId: string,
  organizationId: number,
  branchId: number
): Promise<ActionPlan[]> {
  const rows = await this.db
    .select()
    .from(actionPlanTable)
    .where(
      and(
        eq(actionPlanTable.goalId, goalId),
        eq(actionPlanTable.organizationId, organizationId),
        eq(actionPlanTable.branchId, branchId),
        isNull(actionPlanTable.deletedAt)
      )
    );
  
  return rows.map(row => ActionPlanMapper.toDomain(row));
}
```
