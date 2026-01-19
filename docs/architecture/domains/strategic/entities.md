# Entities do Domínio Strategic

## Strategy

Representa um ciclo de planejamento estratégico da organização.

```typescript
class Strategy extends AggregateRoot<string> {
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    name: string;
    vision: string;
    mission: string;
    values: string[];
    startDate: Date;
    endDate: Date;
    status: StrategyStatus;
    createdAt: Date;
    updatedAt: Date;
  };
  
  // Getters
  get organizationId(): number;
  get branchId(): number;
  get name(): string;
  get vision(): string;
  get mission(): string;
  get values(): string[];
  get startDate(): Date;
  get endDate(): Date;
  get status(): StrategyStatus;
  get isActive(): boolean;
  
  // Factory: create() COM validações
  static create(props: CreateStrategyProps): Result<Strategy, string> {
    // Validações:
    // - name não pode ser vazio
    // - vision não pode ser vazia
    // - mission não pode ser vazia
    // - values deve ter pelo menos 1 item
    // - startDate < endDate
    // - organizationId e branchId obrigatórios
  }
  
  // Factory: reconstitute() SEM validações (para Mapper)
  static reconstitute(props: StrategyProps & { id: string }): Result<Strategy, string>;
  
  // Comportamento
  activate(): Result<void, string> {
    // Só pode ativar se status = DRAFT
    // Emite StrategyActivatedEvent
  }
  
  archive(): Result<void, string> {
    // Só pode arquivar se status = ACTIVE e endDate < now
    // Emite StrategyArchivedEvent
  }
  
  extend(newEndDate: Date): Result<void, string> {
    // newEndDate > endDate atual
    // Emite StrategyExtendedEvent
  }
  
  updateVision(vision: string): Result<void, string>;
  updateMission(mission: string): Result<void, string>;
  addValue(value: string): Result<void, string>;
  removeValue(value: string): Result<void, string>;
}
```

## StrategicGoal

Objetivo estratégico vinculado a uma perspectiva do BSC.

```typescript
class StrategicGoal extends AggregateRoot<string> {
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    strategyId: string;
    perspectiveCode: string;
    parentGoalId?: string;
    code: string;
    description: string;
    cascadeLevel: CascadeLevel;
    targetValue: number;
    currentValue: number;
    unit: string;
    weight: number;
    ownerUserId: string;
    ownerBranchId: number;
    startDate: Date;
    dueDate: Date;
    status: GoalStatus;
    mapPositionX?: number;
    mapPositionY?: number;
    createdAt: Date;
    updatedAt: Date;
  };
  
  // Getters
  get code(): string;
  get description(): string;
  get perspectiveCode(): string;
  get cascadeLevel(): CascadeLevel;
  get targetValue(): number;
  get currentValue(): number;
  get progress(): number; // (currentValue / targetValue) * 100
  get weight(): number;
  get status(): GoalStatus;
  get isAchieved(): boolean;
  get isAtRisk(): boolean;
  
  // Factory
  static create(props: CreateGoalProps): Result<StrategicGoal, string> {
    // Validações:
    // - perspectiveCode deve ser FIN, CLI, INT ou LRN
    // - weight entre 0 e 100
    // - targetValue > 0
    // - dueDate > startDate
    // - cascadeLevel válido
    // - Se parentGoalId, validar hierarquia de cascade
  }
  
  static reconstitute(props: GoalProps & { id: string }): Result<StrategicGoal, string>;
  
  // Comportamento
  updateProgress(newValue: number): Result<void, string> {
    // Atualiza currentValue
    // Recalcula status baseado em progress
    // Se atingiu 100%, emite GoalAchievedEvent
  }
  
  linkCauseEffect(effectGoalId: string): Result<CauseEffectRelation, string> {
    // Cria relação causa-efeito com outro goal
    // Este goal é a causa, effectGoalId é o efeito
  }
  
  cascade(childProps: CascadeChildProps): Result<StrategicGoal, string> {
    // Cria goal filho com nível inferior
    // Valida que child.cascadeLevel é exatamente 1 nível abaixo
    // Emite GoalCascadedEvent
  }
  
  achieve(): Result<void, string> {
    // Marca como ACHIEVED
    // Emite GoalAchievedEvent
  }
  
  updateMapPosition(x: number, y: number): Result<void, string>;
  updateWeight(weight: number): Result<void, string>;
  reassign(newOwnerId: string, newBranchId: number): Result<void, string>;
}
```

## KPI

Indicador de performance vinculado a um objetivo.

```typescript
class KPI extends Entity<string> {
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    goalId: string;
    code: string;
    name: string;
    description?: string;
    unit: string;
    polarity: 'UP' | 'DOWN'; // UP = maior é melhor
    targetValue: number;
    alertThreshold: number; // % de desvio para alerta
    criticalThreshold: number; // % de desvio para crítico
    currentValue: number;
    sourceType: KPISourceType; // MANUAL, FINANCIAL, TMS, WMS
    sourceConfig?: Record<string, unknown>;
    frequency: KPIFrequency; // DAILY, WEEKLY, MONTHLY
    lastUpdatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  
  // Getters
  get code(): string;
  get name(): string;
  get targetValue(): number;
  get currentValue(): number;
  get variance(): number; // currentValue - targetValue
  get variancePercent(): number; // (variance / targetValue) * 100
  get status(): 'GREEN' | 'YELLOW' | 'RED';
  
  // Factory
  static create(props: CreateKPIProps): Result<KPI, string>;
  static reconstitute(props: KPIProps & { id: string }): Result<KPI, string>;
  
  // Comportamento
  updateValue(
    value: number, 
    periodDate: Date, 
    source: KPISourceType
  ): Result<KPIHistory, string> {
    // Atualiza currentValue
    // Cria registro em KPIHistory
    // Se status = RED, emite KPIAlertTriggeredEvent
  }
  
  updateTarget(newTarget: number): Result<void, string>;
  configureThresholds(alert: number, critical: number): Result<void, string>;
}
```

## ActionPlan

Plano de ação 5W2H com ciclo PDCA.

```typescript
class ActionPlan extends AggregateRoot<string> {
  static readonly MAX_REPROPOSITIONS = 3;
  
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    goalId: string;
    code: string;
    
    // 5W2H
    what: string;
    why: string;
    where: string;
    whenStart: Date;
    whenEnd: Date;
    who: string;
    how: string;
    howMuchAmount: number;
    howMuchCurrency: string;
    
    // PDCA
    pdcaCycle: PDCACycle;
    completionPercent: number;
    
    // Reproposição
    parentActionPlanId?: string;
    repropositionNumber: number;
    repropositionReason?: string;
    
    // Status
    status: ActionPlanStatus;
    closedAt?: Date;
    closedBy?: string;
    outcome?: ActionOutcome;
    
    // Padronização
    standardizationRequired: boolean;
    standardizationId?: string;
    
    createdAt: Date;
    updatedAt: Date;
  };
  
  // Getters
  get code(): string;
  get what(): string;
  get pdcaCycle(): PDCACycle;
  get completionPercent(): number;
  get isOverdue(): boolean;
  get daysOverdue(): number;
  get repropositionNumber(): number;
  get accumulatedCost(): Money; // Soma de todas as reproposições
  
  // Factory
  static create(props: CreateActionPlanProps): Result<ActionPlan, string> {
    // Validações:
    // - what, why, where, who, how não vazios
    // - whenEnd > whenStart
    // - howMuchAmount >= 0
    // - Gera code automático (AP-YYYY-NNN)
  }
  
  static reconstitute(props: ActionPlanProps & { id: string }): Result<ActionPlan, string>;
  
  // Comportamento
  advancePDCA(): Result<void, string> {
    // PLAN → DO → CHECK → ACT
    // Valida que pode avançar (condições específicas por etapa)
    // DO requer follow-up registrado
    // Emite PDCAAdvancedEvent
  }
  
  addEvidence(url: string, type: EvidenceType): Result<void, string> {
    // Adiciona URL de evidência (foto, documento)
  }
  
  registerFollowUp(props: FollowUpProps): Result<ActionPlanFollowUp, string> {
    // Cria novo follow-up 3G
    // Incrementa followUpNumber
    // Se requiresNewPlan, prepara reproposição
  }
  
  repropose(reason: string, assignedTo?: string): Result<ActionPlan, string> {
    // Valida limite de reproposições
    // Cria novo ActionPlan com parentActionPlanId = this.id
    // Emite RepropositionCreatedEvent
  }
  
  close(outcome: ActionOutcome): Result<void, string> {
    // Valida que tem follow-up
    // Se SUCCESS e problema recorrente, sugere padronização
    // Emite ActionPlanClosedEvent
  }
  
  updateProgress(percent: number): Result<void, string>;
  reschedule(newEndDate: Date, reason: string): Result<void, string>;
  reassign(newResponsible: string): Result<void, string>;
}
```

## ActionPlanFollowUp

Registro de follow-up 3G de um plano de ação.

```typescript
class ActionPlanFollowUp extends Entity<string> {
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    actionPlanId: string;
    followUpNumber: number;
    followUpDate: Date;
    
    // 3G
    gembaLocal: string;
    gembutsuObservation: string;
    genjitsuData: string;
    
    // Resultado
    executionStatus: ExecutionStatus;
    executionPercent: number;
    problemsObserved?: string;
    problemSeverity?: ProblemSeverity;
    
    // Reproposição
    requiresNewPlan: boolean;
    newPlanDescription?: string;
    newPlanAssignedTo?: string;
    childActionPlanId?: string;
    
    // Auditoria
    verifiedBy: string;
    verifiedAt: Date;
    evidenceUrls: string[];
    
    createdAt: Date;
  };
  
  // Getters
  get followUpNumber(): number;
  get executionStatus(): ExecutionStatus;
  get executionPercent(): number;
  get requiresNewPlan(): boolean;
  get problemSeverity(): ProblemSeverity | undefined;
  
  // Factory
  static create(props: CreateFollowUpProps): Result<ActionPlanFollowUp, string> {
    // Validações:
    // - gembaLocal não vazio
    // - gembutsuObservation não vazio
    // - genjitsuData não vazio
    // - executionPercent entre 0 e 100
    // - Se requiresNewPlan, newPlanDescription obrigatório
  }
  
  static reconstitute(props: FollowUpProps & { id: string }): Result<ActionPlanFollowUp, string>;
  
  // Comportamento
  linkChildPlan(childActionPlanId: string): Result<void, string>;
  addEvidence(url: string): Result<void, string>;
}
```

## IdeaBox

Sugestão do banco de ideias para melhoria contínua.

```typescript
class IdeaBox extends AggregateRoot<string> {
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    code: string;
    title: string;
    description: string;
    sourceType: IdeaSourceType;
    category: string;
    submittedBy: string;
    department: string;
    
    // Priorização (Matriz Eisenhower)
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
    importance: 'LOW' | 'MEDIUM' | 'HIGH';
    
    // Estimativas
    estimatedImpact: ImpactLevel;
    estimatedCostAmount: number;
    estimatedCostCurrency: string;
    estimatedBenefitAmount: number;
    estimatedBenefitCurrency: string;
    
    // Status
    status: IdeaStatus;
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
    
    // Conversão
    convertedTo?: ConversionTarget;
    convertedEntityId?: string;
    
    createdAt: Date;
    updatedAt: Date;
  };
  
  // Getters
  get code(): string;
  get title(): string;
  get status(): IdeaStatus;
  get priority(): number; // Calculado: urgency * importance
  get roi(): number; // estimatedBenefit / estimatedCost
  get isConvertible(): boolean; // status = APPROVED e não convertida
  
  // Factory
  static create(props: CreateIdeaProps): Result<IdeaBox, string> {
    // Validações:
    // - title não vazio
    // - description não vazia
    // - category válida
    // - Gera code automático (IDEA-YYYY-NNN)
  }
  
  static reconstitute(props: IdeaProps & { id: string }): Result<IdeaBox, string>;
  
  // Comportamento
  submit(): Result<void, string> {
    // Muda status para SUBMITTED
    // Emite IdeaSubmittedEvent
  }
  
  review(
    reviewerId: string, 
    approved: boolean, 
    notes: string
  ): Result<void, string> {
    // Muda status para APPROVED ou REJECTED
    // Emite IdeaReviewedEvent
  }
  
  convert(target: ConversionTarget): Result<{ entityId: string }, string> {
    // Valida que status = APPROVED
    // Valida que não foi convertida ainda
    // Muda status para CONVERTED
    // Emite IdeaConvertedEvent
    // Retorna ID da entidade criada
  }
  
  archive(reason: string): Result<void, string>;
  updateEstimates(cost: Money, benefit: Money, impact: ImpactLevel): Result<void, string>;
}
```

## WarRoomMeeting

Reunião executiva do War Room.

```typescript
class WarRoomMeeting extends AggregateRoot<string> {
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    strategyId: string;
    meetingType: MeetingType;
    title: string;
    description?: string;
    scheduledAt: Date;
    scheduledDuration: number; // minutos
    startedAt?: Date;
    endedAt?: Date;
    status: MeetingStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
  
  // Getters
  get title(): string;
  get meetingType(): MeetingType;
  get status(): MeetingStatus;
  get isInProgress(): boolean;
  get duration(): number | undefined; // endedAt - startedAt em minutos
  
  // Factory
  static create(props: CreateMeetingProps): Result<WarRoomMeeting, string>;
  static reconstitute(props: MeetingProps & { id: string }): Result<WarRoomMeeting, string>;
  
  // Comportamento
  addParticipant(userId: string, role: ParticipantRole): Result<void, string>;
  removeParticipant(userId: string): Result<void, string>;
  
  addAgendaItem(item: AgendaItemProps): Result<void, string>;
  reorderAgendaItems(order: string[]): Result<void, string>;
  
  start(): Result<void, string> {
    // Muda status para IN_PROGRESS
    // Emite MeetingStartedEvent
  }
  
  advanceAgenda(): Result<void, string> {
    // Avança para próximo item da pauta
    // Emite AgendaAdvancedEvent
  }
  
  recordDecision(props: DecisionProps): Result<MeetingDecision, string> {
    // Cria nova decisão
    // Emite DecisionRecordedEvent
  }
  
  end(): Result<void, string> {
    // Muda status para COMPLETED
    // Emite MeetingEndedEvent
  }
  
  generateMinutes(): Result<MeetingMinutes, string> {
    // Gera ata com participantes, pauta, decisões
  }
  
  cancel(reason: string): Result<void, string>;
  reschedule(newDate: Date, reason: string): Result<void, string>;
}
```

## SwotAnalysis

Análise SWOT com priorização.

```typescript
class SwotAnalysis extends AggregateRoot<string> {
  // Props
  private readonly props: {
    organizationId: number;
    branchId: number;
    strategyId: string;
    title: string;
    description?: string;
    analysisDate: Date;
    status: AnalysisStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
  
  // Getters
  get title(): string;
  get status(): AnalysisStatus;
  
  // Factory
  static create(props: CreateSwotProps): Result<SwotAnalysis, string>;
  static reconstitute(props: SwotProps & { id: string }): Result<SwotAnalysis, string>;
  
  // Comportamento
  addStrength(text: string, impact: number): Result<void, string>;
  addWeakness(text: string, impact: number): Result<void, string>;
  addOpportunity(text: string, impact: number): Result<void, string>;
  addThreat(text: string, impact: number): Result<void, string>;
  
  removeItem(quadrant: SwotQuadrant, itemId: string): Result<void, string>;
  updateItemPriority(quadrant: SwotQuadrant, itemId: string, priority: number): Result<void, string>;
  
  complete(): Result<void, string> {
    // Valida que tem ao menos 1 item por quadrante
    // Muda status para COMPLETED
  }
  
  convertToActionPlan(items: SwotItemId[]): Result<ActionPlan[], string> {
    // Converte itens selecionados em planos de ação
  }
}
```
