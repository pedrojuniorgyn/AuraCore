# Domain Events do Domínio Strategic

Todos os Domain Events seguem o padrão:
- Implements `DomainEvent`
- Propriedade `eventType` readonly
- Propriedade `occurredAt` com timestamp
- Dados imutáveis no constructor

## Strategy Events

### StrategyActivatedEvent

Emitido quando uma estratégia é ativada.

```typescript
class StrategyActivatedEvent implements DomainEvent {
  readonly eventType = 'STRATEGY_ACTIVATED';
  readonly occurredAt: Date;
  
  constructor(
    readonly strategyId: string,
    readonly strategyName: string,
    readonly activatedBy: string,
    readonly startDate: Date,
    readonly endDate: Date
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Notificar stakeholders sobre início do ciclo estratégico
- Criar dashboard inicial
- Agendar reuniões recorrentes de War Room

### StrategyArchivedEvent

Emitido quando uma estratégia é arquivada.

```typescript
class StrategyArchivedEvent implements DomainEvent {
  readonly eventType = 'STRATEGY_ARCHIVED';
  readonly occurredAt: Date;
  
  constructor(
    readonly strategyId: string,
    readonly strategyName: string,
    readonly archivedBy: string,
    readonly achievementRate: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Gerar relatório final de ciclo
- Arquivar dados históricos
- Criar snapshot para comparação futura

## Goal Events

### GoalCreatedEvent

Emitido quando um objetivo estratégico é criado.

```typescript
class GoalCreatedEvent implements DomainEvent {
  readonly eventType = 'GOAL_CREATED';
  readonly occurredAt: Date;
  
  constructor(
    readonly goalId: string,
    readonly goalCode: string,
    readonly perspectiveCode: string,
    readonly description: string,
    readonly ownerUserId: string,
    readonly cascadeLevel: string
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Notificar owner da meta
- Atualizar mapa estratégico
- Recalcular pesos da perspectiva

### GoalAchievedEvent

Emitido quando um objetivo é atingido (progress >= 100%).

```typescript
class GoalAchievedEvent implements DomainEvent {
  readonly eventType = 'GOAL_ACHIEVED';
  readonly occurredAt: Date;
  
  constructor(
    readonly goalId: string,
    readonly goalCode: string,
    readonly achievedValue: number,
    readonly targetValue: number,
    readonly achievedBy: string,
    readonly daysToAchieve: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Atualizar status do goal para ACHIEVED
- Notificar owner e stakeholders
- Recalcular progresso da meta pai (se houver)
- Criar registro de achievement para gamificação
- Disparar cálculo de bônus (se aplicável)

### GoalCascadedEvent

Emitido quando uma meta é desdobrada para nível inferior.

```typescript
class GoalCascadedEvent implements DomainEvent {
  readonly eventType = 'GOAL_CASCADED';
  readonly occurredAt: Date;
  
  constructor(
    readonly parentGoalId: string,
    readonly parentGoalCode: string,
    readonly childGoalId: string,
    readonly childGoalCode: string,
    readonly childLevel: string,
    readonly weight: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Notificar responsável da meta filha
- Atualizar mapa de cascateamento
- Recalcular agregação de progresso

## KPI Events

### KPIValueUpdatedEvent

Emitido quando o valor de um KPI é atualizado.

```typescript
class KPIValueUpdatedEvent implements DomainEvent {
  readonly eventType = 'KPI_VALUE_UPDATED';
  readonly occurredAt: Date;
  
  constructor(
    readonly kpiId: string,
    readonly kpiCode: string,
    readonly previousValue: number,
    readonly newValue: number,
    readonly sourceType: string,
    readonly periodDate: Date
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Criar registro em KPIHistory
- Recalcular progresso da meta vinculada
- Verificar se trigger de alerta deve ser disparado

### KPIAlertTriggeredEvent

Emitido quando um KPI entra em estado de alerta (YELLOW) ou crítico (RED).

```typescript
class KPIAlertTriggeredEvent implements DomainEvent {
  readonly eventType = 'KPI_ALERT_TRIGGERED';
  readonly occurredAt: Date;
  
  constructor(
    readonly kpiId: string,
    readonly kpiCode: string,
    readonly kpiName: string,
    readonly alertLevel: 'WARNING' | 'CRITICAL',
    readonly currentValue: number,
    readonly targetValue: number,
    readonly variancePercent: number,
    readonly daysInStatus: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Criar notificação para responsável do KPI
- Adicionar à pauta automática do War Room
- Se CRITICAL por 7+ dias, criar anomalia GEROT
- Enviar email para gestores (se configurado)

## ActionPlan Events

### ActionPlanCreatedEvent

Emitido quando um plano de ação é criado.

```typescript
class ActionPlanCreatedEvent implements DomainEvent {
  readonly eventType = 'ACTION_PLAN_CREATED';
  readonly occurredAt: Date;
  
  constructor(
    readonly actionPlanId: string,
    readonly actionPlanCode: string,
    readonly goalId: string,
    readonly what: string,
    readonly who: string,
    readonly whenEnd: Date
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Notificar responsável
- Agendar lembrete para T-7 dias
- Atualizar contagem de planos da meta

### ActionPlanOverdueEvent

Emitido quando um plano de ação ultrapassa a data limite.

```typescript
class ActionPlanOverdueEvent implements DomainEvent {
  readonly eventType = 'ACTION_PLAN_OVERDUE';
  readonly occurredAt: Date;
  
  constructor(
    readonly actionPlanId: string,
    readonly actionPlanCode: string,
    readonly what: string,
    readonly dueDate: Date,
    readonly daysOverdue: number,
    readonly responsibleUserId: string,
    readonly responsibleManagerId?: string
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Notificar responsável
- Se daysOverdue > 7, escalonar para gestor
- Adicionar à pauta automática do War Room
- Bloquear avanço de PDCA até regularização

### PDCAAdvancedEvent

Emitido quando o plano avança no ciclo PDCA.

```typescript
class PDCAAdvancedEvent implements DomainEvent {
  readonly eventType = 'PDCA_ADVANCED';
  readonly occurredAt: Date;
  
  constructor(
    readonly actionPlanId: string,
    readonly actionPlanCode: string,
    readonly fromCycle: string,
    readonly toCycle: string,
    readonly advancedBy: string
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Atualizar visualização do Kanban
- Se toCycle = 'CHECK', agendar follow-up
- Se toCycle = 'ACT', avaliar padronização

### ActionPlanClosedEvent

Emitido quando um plano de ação é fechado.

```typescript
class ActionPlanClosedEvent implements DomainEvent {
  readonly eventType = 'ACTION_PLAN_CLOSED';
  readonly occurredAt: Date;
  
  constructor(
    readonly actionPlanId: string,
    readonly actionPlanCode: string,
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'CANCELLED',
    readonly closedBy: string,
    readonly totalDays: number,
    readonly totalCost: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Atualizar métricas de conclusão
- Se SUCCESS, verificar padronização
- Se FAILURE, registrar lição aprendida
- Recalcular progresso da meta

## Follow-up Events

### FollowUpRegisteredEvent

Emitido quando um follow-up 3G é registrado.

```typescript
class FollowUpRegisteredEvent implements DomainEvent {
  readonly eventType = 'FOLLOW_UP_REGISTERED';
  readonly occurredAt: Date;
  
  constructor(
    readonly followUpId: string,
    readonly actionPlanId: string,
    readonly actionPlanCode: string,
    readonly followUpNumber: number,
    readonly executionStatus: string,
    readonly executionPercent: number,
    readonly verifiedBy: string,
    readonly requiresNewPlan: boolean
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Atualizar status do plano
- Se requiresNewPlan, iniciar fluxo de reproposição
- Registrar evidências

### FollowUpRequiredEvent

Emitido quando um follow-up é necessário (agendamento automático).

```typescript
class FollowUpRequiredEvent implements DomainEvent {
  readonly eventType = 'FOLLOW_UP_REQUIRED';
  readonly occurredAt: Date;
  
  constructor(
    readonly actionPlanId: string,
    readonly actionPlanCode: string,
    readonly followUpType: 'SCHEDULED' | 'OVERDUE' | 'ESCALATION',
    readonly dueDate: Date,
    readonly responsibleUserId: string
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Criar notificação para responsável
- Se OVERDUE, marcar plano como pendente
- Se ESCALATION, notificar gestor superior

### RepropositionCreatedEvent

Emitido quando uma reproposição é criada.

```typescript
class RepropositionCreatedEvent implements DomainEvent {
  readonly eventType = 'REPROPOSITION_CREATED';
  readonly occurredAt: Date;
  
  constructor(
    readonly originalActionPlanId: string,
    readonly originalCode: string,
    readonly newActionPlanId: string,
    readonly newCode: string,
    readonly repropositionNumber: number,
    readonly reason: string,
    readonly assignedTo: string,
    readonly accumulatedCost: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Vincular planos (parent/child)
- Notificar novo responsável
- Atualizar timeline de proposições
- Registrar custo acumulado
- Se repropositionNumber >= 3, alertar gestão

## Idea Events

### IdeaSubmittedEvent

Emitido quando uma ideia é submetida.

```typescript
class IdeaSubmittedEvent implements DomainEvent {
  readonly eventType = 'IDEA_SUBMITTED';
  readonly occurredAt: Date;
  
  constructor(
    readonly ideaId: string,
    readonly ideaCode: string,
    readonly title: string,
    readonly submittedBy: string,
    readonly department: string,
    readonly category: string
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Notificar comitê de análise
- Criar item na fila de revisão
- Enviar confirmação ao autor

### IdeaReviewedEvent

Emitido quando uma ideia é analisada.

```typescript
class IdeaReviewedEvent implements DomainEvent {
  readonly eventType = 'IDEA_REVIEWED';
  readonly occurredAt: Date;
  
  constructor(
    readonly ideaId: string,
    readonly ideaCode: string,
    readonly approved: boolean,
    readonly reviewedBy: string,
    readonly reviewNotes: string
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Notificar autor sobre resultado
- Se approved, habilitar conversão
- Atualizar métricas de inovação

### IdeaConvertedEvent

Emitido quando uma ideia é convertida em outra entidade.

```typescript
class IdeaConvertedEvent implements DomainEvent {
  readonly eventType = 'IDEA_CONVERTED';
  readonly occurredAt: Date;
  
  constructor(
    readonly ideaId: string,
    readonly ideaCode: string,
    readonly convertedTo: string, // ACTION_PLAN, GOAL, PROJECT, KPI
    readonly convertedEntityId: string,
    readonly convertedBy: string
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Atualizar status da ideia para CONVERTED
- Notificar autor sobre conversão
- Vincular ideia à entidade criada
- Registrar métrica de inovação

## Meeting Events

### MeetingStartedEvent

Emitido quando uma reunião do War Room é iniciada.

```typescript
class MeetingStartedEvent implements DomainEvent {
  readonly eventType = 'MEETING_STARTED';
  readonly occurredAt: Date;
  
  constructor(
    readonly meetingId: string,
    readonly meetingType: string,
    readonly title: string,
    readonly startedBy: string,
    readonly participantCount: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Broadcast via SSE para participantes
- Iniciar timer de reunião
- Registrar presença dos participantes

### DecisionRecordedEvent

Emitido quando uma decisão é registrada durante reunião.

```typescript
class DecisionRecordedEvent implements DomainEvent {
  readonly eventType = 'DECISION_RECORDED';
  readonly occurredAt: Date;
  
  constructor(
    readonly decisionId: string,
    readonly meetingId: string,
    readonly text: string,
    readonly recordedBy: string,
    readonly responsibleUserId?: string,
    readonly dueDate?: Date
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Broadcast via SSE para participantes
- Se responsibleUserId, criar tarefa
- Adicionar à ata da reunião

### MeetingEndedEvent

Emitido quando uma reunião é encerrada.

```typescript
class MeetingEndedEvent implements DomainEvent {
  readonly eventType = 'MEETING_ENDED';
  readonly occurredAt: Date;
  
  constructor(
    readonly meetingId: string,
    readonly endedBy: string,
    readonly durationMinutes: number,
    readonly decisionCount: number,
    readonly agendaItemsCompleted: number,
    readonly agendaItemsTotal: number
  ) {
    this.occurredAt = new Date();
  }
}
```

**Handlers:**
- Gerar ata automaticamente
- Enviar ata para participantes
- Registrar métricas da reunião
- Agendar próxima reunião (se recorrente)

## Event Handlers Registry

```typescript
// infrastructure/events/StrategicEventHandlers.ts
@injectable()
export class StrategicEventHandlers {
  constructor(
    @inject(TOKENS.NotificationService) private notifications: INotificationService,
    @inject(TOKENS.EmailService) private email: IEmailService,
    @inject(TOKENS.WarRoomBroadcaster) private broadcaster: IWarRoomBroadcaster
  ) {}
  
  @EventHandler(GoalAchievedEvent)
  async onGoalAchieved(event: GoalAchievedEvent): Promise<void> {
    await this.notifications.send({
      userId: event.achievedBy,
      type: 'GOAL_ACHIEVED',
      title: `🎉 Meta ${event.goalCode} atingida!`,
      body: `Parabéns! Valor atingido: ${event.achievedValue} (meta: ${event.targetValue})`
    });
  }
  
  @EventHandler(KPIAlertTriggeredEvent)
  async onKPIAlert(event: KPIAlertTriggeredEvent): Promise<void> {
    const severity = event.alertLevel === 'CRITICAL' ? '🔴' : '🟡';
    
    await this.notifications.send({
      userId: event.responsibleUserId,
      type: 'KPI_ALERT',
      title: `${severity} Alerta: KPI ${event.kpiCode}`,
      body: `${event.kpiName} está ${event.variancePercent.toFixed(1)}% fora da meta`
    });
    
    // Broadcast para War Room
    await this.broadcaster.broadcast('KPI_ALERT', {
      kpiId: event.kpiId,
      kpiCode: event.kpiCode,
      alertLevel: event.alertLevel,
      variancePercent: event.variancePercent
    });
  }
  
  @EventHandler(DecisionRecordedEvent)
  async onDecisionRecorded(event: DecisionRecordedEvent): Promise<void> {
    // Broadcast imediato para participantes da reunião
    await this.broadcaster.broadcastToMeeting(event.meetingId, 'DECISION_RECORDED', {
      decisionId: event.decisionId,
      text: event.text,
      recordedBy: event.recordedBy
    });
  }
}
```
