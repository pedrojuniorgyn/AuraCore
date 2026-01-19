# Domain Services do Domínio Strategic

Todos os Domain Services seguem o padrão:
- 100% Stateless (métodos estáticos)
- Constructor privado (impede instanciação)
- Retorna `Result<T, string>`
- NUNCA faz throw
- ZERO dependências de infraestrutura
- ZERO acesso a banco de dados
- 100% testável sem mocks

## GoalCascadeService

Serviço para operações de cascateamento de metas.

```typescript
/**
 * Serviço de domínio para cascateamento de metas.
 * Implementa regras de desdobramento CEO → DIRECTOR → MANAGER → TEAM.
 */
class GoalCascadeService {
  private constructor() {}
  
  /**
   * Valida se o cascateamento é válido.
   * Child deve ser exatamente 1 nível abaixo de parent.
   */
  static validateCascadeLevel(
    parentLevel: CascadeLevel,
    childLevel: CascadeLevel
  ): Result<void, string> {
    if (!childLevel.canBeChildOf(parentLevel)) {
      return Result.fail(
        `Nível ${childLevel.label} não pode ser filho direto de ${parentLevel.label}. ` +
        `Hierarquia: CEO → DIRECTOR → MANAGER → TEAM`
      );
    }
    return Result.ok(undefined);
  }
  
  /**
   * Calcula a contribuição de uma meta para sua meta pai.
   * @returns Percentual de contribuição (0-100)
   */
  static calculateContribution(
    childGoal: { progress: number; weight: number },
    parentGoal: { targetValue: number }
  ): Result<number, string> {
    if (childGoal.weight < 0 || childGoal.weight > 100) {
      return Result.fail('Peso deve estar entre 0 e 100');
    }
    
    const contribution = (childGoal.progress * childGoal.weight) / 100;
    return Result.ok(contribution);
  }
  
  /**
   * Agrega progresso bottom-up de metas filhas para meta pai.
   * @returns Map<goalId, aggregatedProgress>
   */
  static aggregateProgress(
    children: Array<{ 
      goalId: string; 
      parentGoalId: string;
      progress: number; 
      weight: number 
    }>
  ): Result<Map<string, number>, string> {
    const aggregation = new Map<string, number>();
    const weightsByParent = new Map<string, number>();
    
    // Agrupar por parent
    for (const child of children) {
      const currentProgress = aggregation.get(child.parentGoalId) || 0;
      const currentWeight = weightsByParent.get(child.parentGoalId) || 0;
      
      aggregation.set(
        child.parentGoalId, 
        currentProgress + (child.progress * child.weight / 100)
      );
      weightsByParent.set(child.parentGoalId, currentWeight + child.weight);
    }
    
    // Validar que soma de pesos = 100
    for (const [parentId, totalWeight] of weightsByParent) {
      if (Math.abs(totalWeight - 100) > 0.01) {
        return Result.fail(
          `Soma dos pesos para meta ${parentId} é ${totalWeight}, deveria ser 100`
        );
      }
    }
    
    return Result.ok(aggregation);
  }
  
  /**
   * Valida estrutura de cascateamento completa.
   */
  static validateCascadeStructure(
    goals: Array<{
      id: string;
      parentGoalId?: string;
      cascadeLevel: CascadeLevel;
      weight: number;
    }>
  ): Result<void, string> {
    const goalsById = new Map(goals.map(g => [g.id, g]));
    
    for (const goal of goals) {
      if (!goal.parentGoalId) continue;
      
      const parent = goalsById.get(goal.parentGoalId);
      if (!parent) {
        return Result.fail(`Meta pai ${goal.parentGoalId} não encontrada`);
      }
      
      const levelValidation = this.validateCascadeLevel(
        parent.cascadeLevel,
        goal.cascadeLevel
      );
      if (levelValidation.isFail()) {
        return Result.fail(`Meta ${goal.id}: ${levelValidation.error}`);
      }
    }
    
    return Result.ok(undefined);
  }
}
```

## KPICalculatorService

Serviço para cálculos de KPIs.

```typescript
/**
 * Serviço de domínio para cálculos de KPI.
 * Implementa análise de status, tendência e previsões.
 */
class KPICalculatorService {
  private constructor() {}
  
  /**
   * Calcula status do KPI baseado em valor atual e meta.
   */
  static calculateStatus(
    currentValue: number,
    target: KPITarget
  ): Result<'GREEN' | 'YELLOW' | 'RED', string> {
    return Result.ok(target.calculateStatus(currentValue));
  }
  
  /**
   * Calcula tendência baseada em histórico.
   * Usa regressão linear simples nos últimos N períodos.
   */
  static calculateTrend(
    history: Array<{ value: number; date: Date }>,
    periods: number = 3
  ): Result<'UP' | 'DOWN' | 'STABLE', string> {
    if (history.length < 2) {
      return Result.ok('STABLE');
    }
    
    // Pegar últimos N períodos
    const recent = history
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, periods);
    
    if (recent.length < 2) {
      return Result.ok('STABLE');
    }
    
    // Calcular slope (inclinação)
    const n = recent.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recent[i].value;
      sumXY += i * recent[i].value;
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Threshold de 2% para considerar estável
    const avgValue = sumY / n;
    const slopePercent = (slope / avgValue) * 100;
    
    if (Math.abs(slopePercent) < 2) return Result.ok('STABLE');
    return Result.ok(slope > 0 ? 'UP' : 'DOWN');
  }
  
  /**
   * Prevê valor futuro baseado em tendência.
   * Usa extrapolação linear.
   */
  static predictValue(
    history: Array<{ value: number; date: Date }>,
    periodsAhead: number = 1
  ): Result<number, string> {
    if (history.length < 2) {
      return Result.fail('Histórico insuficiente para previsão');
    }
    
    const sorted = history.sort((a, b) => a.date.getTime() - b.date.getTime());
    const n = sorted.length;
    
    // Regressão linear
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += sorted[i].value;
      sumXY += i * sorted[i].value;
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const predictedValue = intercept + slope * (n - 1 + periodsAhead);
    return Result.ok(Math.max(0, predictedValue)); // Não permitir valores negativos
  }
  
  /**
   * Calcula score de perspectiva BSC.
   * @returns Score de 0 a 100
   */
  static calculatePerspectiveScore(
    goals: Array<{ progress: number; weight: number }>
  ): Result<number, string> {
    const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
    
    if (Math.abs(totalWeight - 100) > 0.01) {
      return Result.fail(`Soma dos pesos deve ser 100, atual: ${totalWeight}`);
    }
    
    const score = goals.reduce(
      (sum, g) => sum + (g.progress * g.weight / 100),
      0
    );
    
    return Result.ok(Math.min(100, Math.max(0, score)));
  }
}
```

## AgendaGeneratorService

Serviço para geração automática de pautas de reunião.

```typescript
/**
 * Serviço de domínio para geração automática de pautas.
 * Combina itens fixos e automáticos baseados em alertas e KPIs.
 */
class AgendaGeneratorService {
  private constructor() {}
  
  /**
   * Gera pauta combinando itens fixos e automáticos.
   */
  static generateAgenda(
    meetingType: MeetingType,
    meetingDate: Date,
    recurringItems: MeetingRecurringItem[],
    automaticSources: AgendaSource[]
  ): Result<MeetingAgenda, string> {
    const agenda: AgendaItem[] = [];
    let order = 1;
    
    // 1. Adicionar itens fixos aplicáveis
    for (const item of recurringItems) {
      if (this.shouldIncludeRecurring(item, meetingType, meetingDate)) {
        agenda.push({
          id: globalThis.crypto.randomUUID(),
          type: 'FIXED',
          title: item.title,
          description: item.description,
          presenter: item.presenter,
          duration: item.estimatedDuration,
          order: order++,
          sourceType: undefined,
          sourceEntityId: undefined
        });
      }
    }
    
    // 2. Adicionar itens automáticos (ordenados por prioridade)
    const sortedSources = automaticSources
      .filter(s => s.isActive && s.meetsCondition())
      .sort((a, b) => b.priority - a.priority);
    
    for (const source of sortedSources) {
      agenda.push({
        id: globalThis.crypto.randomUUID(),
        type: 'AUTOMATIC',
        title: source.generateTitle(),
        description: source.generateDescription(),
        presenter: source.suggestedPresenter,
        duration: source.estimatedDuration,
        order: order++,
        sourceType: source.type,
        sourceEntityId: source.entityId
      });
    }
    
    // 3. Calcular tempo total
    const totalDuration = agenda.reduce((sum, item) => sum + item.duration, 0);
    
    return Result.ok({
      items: agenda,
      totalDuration,
      generatedAt: new Date()
    });
  }
  
  /**
   * Verifica se item recorrente deve ser incluído.
   */
  private static shouldIncludeRecurring(
    item: MeetingRecurringItem,
    meetingType: MeetingType,
    meetingDate: Date
  ): boolean {
    // Verificar tipo de reunião
    if (item.meetingTypes && !item.meetingTypes.includes(meetingType)) {
      return false;
    }
    
    // Verificar frequência
    switch (item.frequency) {
      case 'EVERY':
        return true;
      
      case 'FIRST_OF_MONTH':
        return meetingDate.getDate() <= 7;
      
      case 'LAST_OF_MONTH':
        const lastDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth() + 1, 0);
        return meetingDate.getDate() >= lastDay.getDate() - 6;
      
      case 'QUARTERLY':
        const month = meetingDate.getMonth();
        return [0, 3, 6, 9].includes(month) && meetingDate.getDate() <= 7;
      
      default:
        return false;
    }
  }
  
  /**
   * Gera fontes automáticas baseadas em KPIs críticos.
   */
  static generateKPIAlertSources(
    kpis: Array<{ id: string; code: string; name: string; status: string; daysInStatus: number }>
  ): AgendaSource[] {
    return kpis
      .filter(kpi => kpi.status === 'RED' && kpi.daysInStatus >= 3)
      .map(kpi => ({
        type: 'KPI_ALERT',
        entityId: kpi.id,
        isActive: true,
        priority: kpi.daysInStatus >= 7 ? 100 : 50,
        meetsCondition: () => true,
        generateTitle: () => `⚠️ KPI ${kpi.code} em estado crítico`,
        generateDescription: () => `${kpi.name} está em vermelho há ${kpi.daysInStatus} dias`,
        suggestedPresenter: undefined,
        estimatedDuration: 10
      }));
  }
  
  /**
   * Gera fontes automáticas baseadas em planos atrasados.
   */
  static generateOverduePlanSources(
    plans: Array<{ id: string; code: string; what: string; daysOverdue: number; who: string }>
  ): AgendaSource[] {
    return plans
      .filter(plan => plan.daysOverdue > 0)
      .map(plan => ({
        type: 'OVERDUE_PLAN',
        entityId: plan.id,
        isActive: true,
        priority: plan.daysOverdue >= 14 ? 100 : 30,
        meetsCondition: () => true,
        generateTitle: () => `🔴 Plano ${plan.code} atrasado`,
        generateDescription: () => `"${plan.what}" está ${plan.daysOverdue} dias atrasado`,
        suggestedPresenter: plan.who,
        estimatedDuration: 5
      }));
  }
}

interface MeetingRecurringItem {
  title: string;
  description: string;
  presenter?: string;
  estimatedDuration: number;
  frequency: 'EVERY' | 'FIRST_OF_MONTH' | 'LAST_OF_MONTH' | 'QUARTERLY';
  meetingTypes?: MeetingType[];
  orderIndex: number;
}

interface AgendaSource {
  type: string;
  entityId: string;
  isActive: boolean;
  priority: number;
  meetsCondition: () => boolean;
  generateTitle: () => string;
  generateDescription: () => string;
  suggestedPresenter?: string;
  estimatedDuration: number;
}

interface AgendaItem {
  id: string;
  type: 'FIXED' | 'AUTOMATIC';
  title: string;
  description: string;
  presenter?: string;
  duration: number;
  order: number;
  sourceType?: string;
  sourceEntityId?: string;
}

interface MeetingAgenda {
  items: AgendaItem[];
  totalDuration: number;
  generatedAt: Date;
}
```

## VarianceAnalyzerService

Serviço para análise de variâncias e anomalias.

```typescript
/**
 * Serviço de domínio para análise de variâncias.
 * Identifica anomalias e KPIs que requerem atenção.
 */
class VarianceAnalyzerService {
  private constructor() {}
  
  /**
   * Identifica KPIs que requerem atenção.
   */
  static identifyAnomalies(
    kpis: Array<{
      id: string;
      code: string;
      currentValue: number;
      target: KPITarget;
    }>,
    history: Map<string, Array<{ value: number; date: Date }>>
  ): Result<Anomaly[], string> {
    const anomalies: Anomaly[] = [];
    
    for (const kpi of kpis) {
      const status = kpi.target.calculateStatus(kpi.currentValue);
      const kpiHistory = history.get(kpi.id) || [];
      
      // Anomalia: KPI em vermelho
      if (status === 'RED') {
        anomalies.push({
          id: globalThis.crypto.randomUUID(),
          kpiId: kpi.id,
          kpiCode: kpi.code,
          type: 'DEVIATION',
          severity: 'HIGH',
          detectedAt: new Date(),
          currentValue: kpi.currentValue,
          expectedValue: kpi.target.value,
          variance: kpi.target.calculateVariance(kpi.currentValue),
          variancePercent: kpi.target.calculateVariancePercent(kpi.currentValue)
        });
      }
      
      // Anomalia: Tendência negativa
      const trendResult = KPICalculatorService.calculateTrend(kpiHistory);
      if (trendResult.isOk()) {
        const trend = trendResult.value;
        const isNegativeTrend = 
          (kpi.target.polarity === 'UP' && trend === 'DOWN') ||
          (kpi.target.polarity === 'DOWN' && trend === 'UP');
        
        if (isNegativeTrend && status !== 'GREEN') {
          anomalies.push({
            id: globalThis.crypto.randomUUID(),
            kpiId: kpi.id,
            kpiCode: kpi.code,
            type: 'NEGATIVE_TREND',
            severity: 'MEDIUM',
            detectedAt: new Date(),
            currentValue: kpi.currentValue,
            expectedValue: kpi.target.value,
            variance: kpi.target.calculateVariance(kpi.currentValue),
            variancePercent: kpi.target.calculateVariancePercent(kpi.currentValue)
          });
        }
      }
    }
    
    return Result.ok(anomalies);
  }
  
  /**
   * Prioriza anomalias para tratamento.
   */
  static prioritizeAnomalies(
    anomalies: Anomaly[]
  ): Result<Anomaly[], string> {
    const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
    
    const sorted = [...anomalies].sort((a, b) => {
      // Primeiro por severidade
      const severityDiff = priorityOrder[a.severity] - priorityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Depois por variância absoluta
      return Math.abs(b.variancePercent) - Math.abs(a.variancePercent);
    });
    
    return Result.ok(sorted);
  }
}

interface Anomaly {
  id: string;
  kpiId: string;
  kpiCode: string;
  type: 'DEVIATION' | 'NEGATIVE_TREND' | 'SUDDEN_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detectedAt: Date;
  currentValue: number;
  expectedValue: number;
  variance: number;
  variancePercent: number;
}
```

## ThreeGenerationsReportService

Serviço para geração do Relatório 3 Gerações.

```typescript
/**
 * Serviço de domínio para geração do Relatório 3 Gerações.
 * Relatório executivo que mostra: Passado, Presente e Futuro.
 */
class ThreeGenerationsReportService {
  private constructor() {}
  
  /**
   * Gera relatório 3 gerações para um período.
   */
  static generateReport(
    goals: StrategicGoal[],
    actionPlans: ActionPlan[],
    kpiHistory: Map<string, Array<{ value: number; date: Date }>>,
    periodStart: Date,
    periodEnd: Date
  ): Result<ThreeGenerationsReport, string> {
    const report: ThreeGenerationsReport = {
      generatedAt: new Date(),
      periodStart,
      periodEnd,
      past: this.analyzePast(goals, actionPlans, kpiHistory, periodStart),
      present: this.analyzePresent(goals, actionPlans),
      future: this.analyzeFuture(goals, actionPlans, kpiHistory)
    };
    
    return Result.ok(report);
  }
  
  private static analyzePast(
    goals: StrategicGoal[],
    actionPlans: ActionPlan[],
    kpiHistory: Map<string, Array<{ value: number; date: Date }>>,
    periodStart: Date
  ): PastGeneration {
    const completedPlans = actionPlans.filter(
      p => p.status === 'CLOSED' && p.outcome === 'SUCCESS'
    );
    
    const failedPlans = actionPlans.filter(
      p => p.status === 'CLOSED' && p.outcome !== 'SUCCESS'
    );
    
    return {
      achievedGoals: goals.filter(g => g.status.value === 'ACHIEVED').length,
      totalGoals: goals.length,
      completedActionPlans: completedPlans.length,
      failedActionPlans: failedPlans.length,
      lessonsLearned: this.extractLessonsLearned(failedPlans),
      highlights: this.extractHighlights(completedPlans)
    };
  }
  
  private static analyzePresent(
    goals: StrategicGoal[],
    actionPlans: ActionPlan[]
  ): PresentGeneration {
    const activeGoals = goals.filter(g => !g.status.isFinal);
    const activePlans = actionPlans.filter(p => p.status !== 'CLOSED');
    
    return {
      goalsOnTrack: activeGoals.filter(g => g.status.value === 'ON_TRACK').length,
      goalsAtRisk: activeGoals.filter(g => g.status.value === 'AT_RISK').length,
      goalsDelayed: activeGoals.filter(g => g.status.value === 'DELAYED').length,
      activePlansCount: activePlans.length,
      overduePlansCount: activePlans.filter(p => p.isOverdue).length,
      criticalIssues: this.identifyCriticalIssues(activeGoals, activePlans)
    };
  }
  
  private static analyzeFuture(
    goals: StrategicGoal[],
    actionPlans: ActionPlan[],
    kpiHistory: Map<string, Array<{ value: number; date: Date }>>
  ): FutureGeneration {
    const predictions: KPIPrediction[] = [];
    
    for (const goal of goals) {
      const history = kpiHistory.get(goal.id) || [];
      const prediction = KPICalculatorService.predictValue(history, 3);
      
      if (prediction.isOk()) {
        predictions.push({
          goalId: goal.id,
          goalCode: goal.code,
          currentValue: goal.currentValue,
          predictedValue: prediction.value,
          targetValue: goal.targetValue,
          willAchieve: prediction.value >= goal.targetValue
        });
      }
    }
    
    return {
      predictedAchievements: predictions.filter(p => p.willAchieve).length,
      predictedMisses: predictions.filter(p => !p.willAchieve).length,
      predictions,
      recommendations: this.generateRecommendations(predictions, actionPlans)
    };
  }
  
  private static extractLessonsLearned(failedPlans: ActionPlan[]): string[] {
    // Extrair lições dos planos que falharam
    return failedPlans
      .filter(p => p.repropositionReason)
      .map(p => p.repropositionReason!)
      .slice(0, 5);
  }
  
  private static extractHighlights(completedPlans: ActionPlan[]): string[] {
    return completedPlans
      .map(p => p.what)
      .slice(0, 5);
  }
  
  private static identifyCriticalIssues(
    goals: StrategicGoal[],
    plans: ActionPlan[]
  ): string[] {
    const issues: string[] = [];
    
    // Metas em vermelho
    goals
      .filter(g => g.status.value === 'DELAYED')
      .forEach(g => issues.push(`Meta ${g.code} atrasada`));
    
    // Planos com 3+ reproposições
    plans
      .filter(p => p.repropositionNumber >= 3)
      .forEach(p => issues.push(`Plano ${p.code} com ${p.repropositionNumber} reproposições`));
    
    return issues.slice(0, 10);
  }
  
  private static generateRecommendations(
    predictions: KPIPrediction[],
    plans: ActionPlan[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Metas que não serão atingidas
    predictions
      .filter(p => !p.willAchieve)
      .forEach(p => {
        recommendations.push(
          `Intensificar ações para meta ${p.goalCode}: previsão ${p.predictedValue.toFixed(1)} vs meta ${p.targetValue}`
        );
      });
    
    // Planos bloqueados
    plans
      .filter(p => p.pdcaCycle.value === 'DO' && p.completionPercent === 0)
      .slice(0, 3)
      .forEach(p => {
        recommendations.push(`Desbloquear plano ${p.code}: parado em Executar`);
      });
    
    return recommendations.slice(0, 5);
  }
}

interface ThreeGenerationsReport {
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  past: PastGeneration;
  present: PresentGeneration;
  future: FutureGeneration;
}

interface PastGeneration {
  achievedGoals: number;
  totalGoals: number;
  completedActionPlans: number;
  failedActionPlans: number;
  lessonsLearned: string[];
  highlights: string[];
}

interface PresentGeneration {
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsDelayed: number;
  activePlansCount: number;
  overduePlansCount: number;
  criticalIssues: string[];
}

interface FutureGeneration {
  predictedAchievements: number;
  predictedMisses: number;
  predictions: KPIPrediction[];
  recommendations: string[];
}

interface KPIPrediction {
  goalId: string;
  goalCode: string;
  currentValue: number;
  predictedValue: number;
  targetValue: number;
  willAchieve: boolean;
}
```
