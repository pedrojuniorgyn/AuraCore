# Value Objects do Domínio Strategic

Todos os Value Objects seguem o padrão:
- Extends `ValueObject<Props>`
- Props extends `Record<string, unknown>`
- Constructor privado
- Factory method `create()` estático
- `Object.freeze` no constructor
- Imutável

## BSCPerspective

Representa uma perspectiva do Balanced Scorecard.

```typescript
interface BSCPerspectiveProps extends Record<string, unknown> {
  code: string;
  name: string;
  color: string;
  order: number;
}

class BSCPerspective extends ValueObject<BSCPerspectiveProps> {
  // Instâncias fixas (Singleton-like)
  static readonly FINANCIAL = BSCPerspective.create('FIN', 'Financeira', '#fbbf24', 1).value!;
  static readonly CUSTOMER = BSCPerspective.create('CLI', 'Clientes', '#3b82f6', 2).value!;
  static readonly INTERNAL = BSCPerspective.create('INT', 'Processos Internos', '#22c55e', 3).value!;
  static readonly LEARNING = BSCPerspective.create('LRN', 'Aprendizado e Crescimento', '#a855f7', 4).value!;
  
  static readonly ALL = [
    BSCPerspective.FINANCIAL,
    BSCPerspective.CUSTOMER,
    BSCPerspective.INTERNAL,
    BSCPerspective.LEARNING
  ];
  
  // Getters
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get color(): string { return this.props.color; }
  get order(): number { return this.props.order; }
  
  // Factory
  static create(
    code: string, 
    name: string, 
    color: string, 
    order: number
  ): Result<BSCPerspective, string> {
    if (!code.trim()) return Result.fail('Código é obrigatório');
    if (!name.trim()) return Result.fail('Nome é obrigatório');
    if (order < 1 || order > 4) return Result.fail('Ordem deve ser entre 1 e 4');
    
    return Result.ok(new BSCPerspective({ code, name, color, order }));
  }
  
  // Lookup
  static fromCode(code: string): Result<BSCPerspective, string> {
    const found = BSCPerspective.ALL.find(p => p.code === code);
    if (!found) return Result.fail(`Perspectiva inválida: ${code}`);
    return Result.ok(found);
  }
  
  // Comparação
  equals(other: BSCPerspective): boolean {
    return this.code === other.code;
  }
  
  toString(): string {
    return `${this.name} (${this.code})`;
  }
}
```

## CascadeLevel

Representa o nível hierárquico de cascateamento de metas.

```typescript
interface CascadeLevelProps extends Record<string, unknown> {
  value: string;
  label: string;
  order: number;
}

class CascadeLevel extends ValueObject<CascadeLevelProps> {
  static readonly CEO = new CascadeLevel({ value: 'CEO', label: 'Estratégico', order: 1 });
  static readonly DIRECTOR = new CascadeLevel({ value: 'DIRECTOR', label: 'Tático', order: 2 });
  static readonly MANAGER = new CascadeLevel({ value: 'MANAGER', label: 'Gerencial', order: 3 });
  static readonly TEAM = new CascadeLevel({ value: 'TEAM', label: 'Operacional', order: 4 });
  
  static readonly ALL = [
    CascadeLevel.CEO,
    CascadeLevel.DIRECTOR,
    CascadeLevel.MANAGER,
    CascadeLevel.TEAM
  ];
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get order(): number { return this.props.order; }
  
  static fromValue(value: string): Result<CascadeLevel, string> {
    const found = CascadeLevel.ALL.find(l => l.value === value);
    if (!found) return Result.fail(`Nível inválido: ${value}`);
    return Result.ok(found);
  }
  
  /**
   * Retorna o nível filho válido para cascateamento.
   */
  getChildLevel(): Result<CascadeLevel, string> {
    const childOrder = this.order + 1;
    const child = CascadeLevel.ALL.find(l => l.order === childOrder);
    if (!child) return Result.fail(`${this.label} não pode ter filhos`);
    return Result.ok(child);
  }
  
  /**
   * Verifica se pode ser filho do nível informado.
   */
  canBeChildOf(parent: CascadeLevel): boolean {
    return this.order === parent.order + 1;
  }
}
```

## GoalStatus

Status de um objetivo estratégico.

```typescript
interface GoalStatusProps extends Record<string, unknown> {
  value: string;
  label: string;
  color: string;
  isFinal: boolean;
}

class GoalStatus extends ValueObject<GoalStatusProps> {
  static readonly NOT_STARTED = new GoalStatus({ 
    value: 'NOT_STARTED', 
    label: 'Não Iniciada', 
    color: 'gray',
    isFinal: false
  });
  
  static readonly IN_PROGRESS = new GoalStatus({ 
    value: 'IN_PROGRESS', 
    label: 'Em Andamento', 
    color: 'blue',
    isFinal: false
  });
  
  static readonly ON_TRACK = new GoalStatus({ 
    value: 'ON_TRACK', 
    label: 'No Prazo', 
    color: 'green',
    isFinal: false
  });
  
  static readonly AT_RISK = new GoalStatus({ 
    value: 'AT_RISK', 
    label: 'Em Risco', 
    color: 'yellow',
    isFinal: false
  });
  
  static readonly DELAYED = new GoalStatus({ 
    value: 'DELAYED', 
    label: 'Atrasada', 
    color: 'red',
    isFinal: false
  });
  
  static readonly ACHIEVED = new GoalStatus({ 
    value: 'ACHIEVED', 
    label: 'Atingida', 
    color: 'emerald',
    isFinal: true
  });
  
  static readonly CANCELLED = new GoalStatus({ 
    value: 'CANCELLED', 
    label: 'Cancelada', 
    color: 'slate',
    isFinal: true
  });
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get color(): string { return this.props.color; }
  get isFinal(): boolean { return this.props.isFinal; }
  
  /**
   * Calcula status baseado no progresso e prazo.
   */
  static calculate(
    progress: number, 
    dueDate: Date, 
    thresholds: { atRisk: number; delayed: number }
  ): GoalStatus {
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (progress >= 100) return GoalStatus.ACHIEVED;
    if (progress === 0) return GoalStatus.NOT_STARTED;
    if (daysUntilDue < 0) return GoalStatus.DELAYED;
    if (progress < thresholds.atRisk && daysUntilDue < 30) return GoalStatus.AT_RISK;
    if (progress >= thresholds.delayed) return GoalStatus.ON_TRACK;
    return GoalStatus.IN_PROGRESS;
  }
  
  canTransitionTo(target: GoalStatus): boolean {
    if (this.isFinal) return false;
    if (target.value === 'CANCELLED') return true;
    return true; // Status pode mudar livremente exceto de final
  }
}
```

## ExecutionStatus

Status de execução de um follow-up.

```typescript
interface ExecutionStatusProps extends Record<string, unknown> {
  value: string;
  label: string;
  requiresFollowUp: boolean;
  requiresEscalation: boolean;
}

class ExecutionStatus extends ValueObject<ExecutionStatusProps> {
  static readonly EXECUTED_OK = new ExecutionStatus({ 
    value: 'EXECUTED_OK', 
    label: 'Executado OK', 
    requiresFollowUp: false,
    requiresEscalation: false
  });
  
  static readonly EXECUTED_PARTIAL = new ExecutionStatus({ 
    value: 'EXECUTED_PARTIAL', 
    label: 'Executado Parcialmente', 
    requiresFollowUp: true,
    requiresEscalation: false
  });
  
  static readonly NOT_EXECUTED = new ExecutionStatus({ 
    value: 'NOT_EXECUTED', 
    label: 'Não Executado', 
    requiresFollowUp: true,
    requiresEscalation: true
  });
  
  static readonly BLOCKED = new ExecutionStatus({ 
    value: 'BLOCKED', 
    label: 'Bloqueado', 
    requiresFollowUp: true,
    requiresEscalation: true
  });
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get requiresFollowUp(): boolean { return this.props.requiresFollowUp; }
  get requiresEscalation(): boolean { return this.props.requiresEscalation; }
  
  static fromValue(value: string): Result<ExecutionStatus, string> {
    const map: Record<string, ExecutionStatus> = {
      'EXECUTED_OK': ExecutionStatus.EXECUTED_OK,
      'EXECUTED_PARTIAL': ExecutionStatus.EXECUTED_PARTIAL,
      'NOT_EXECUTED': ExecutionStatus.NOT_EXECUTED,
      'BLOCKED': ExecutionStatus.BLOCKED
    };
    const found = map[value];
    if (!found) return Result.fail(`Status de execução inválido: ${value}`);
    return Result.ok(found);
  }
}
```

## PDCACycle

Etapa do ciclo PDCA.

```typescript
interface PDCACycleProps extends Record<string, unknown> {
  value: string;
  label: string;
  order: number;
  description: string;
}

class PDCACycle extends ValueObject<PDCACycleProps> {
  static readonly PLAN = new PDCACycle({ 
    value: 'PLAN', 
    label: 'Planejar', 
    order: 1,
    description: 'Definir metas e métodos'
  });
  
  static readonly DO = new PDCACycle({ 
    value: 'DO', 
    label: 'Executar', 
    order: 2,
    description: 'Executar as tarefas planejadas'
  });
  
  static readonly CHECK = new PDCACycle({ 
    value: 'CHECK', 
    label: 'Verificar', 
    order: 3,
    description: 'Verificar resultados (Follow-up 3G)'
  });
  
  static readonly ACT = new PDCACycle({ 
    value: 'ACT', 
    label: 'Agir', 
    order: 4,
    description: 'Padronizar ou corrigir'
  });
  
  static readonly ALL = [
    PDCACycle.PLAN,
    PDCACycle.DO,
    PDCACycle.CHECK,
    PDCACycle.ACT
  ];
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get order(): number { return this.props.order; }
  get description(): string { return this.props.description; }
  
  /**
   * Retorna próxima etapa do ciclo.
   */
  next(): PDCACycle {
    const nextOrder = this.order < 4 ? this.order + 1 : 1;
    return PDCACycle.ALL.find(p => p.order === nextOrder)!;
  }
  
  /**
   * Verifica se pode avançar para a próxima etapa.
   * Regras:
   * - PLAN → DO: sempre permitido
   * - DO → CHECK: requer completionPercent > 0
   * - CHECK → ACT: requer follow-up registrado
   * - ACT → PLAN: novo ciclo (reproposição ou padronização)
   */
  canAdvanceTo(target: PDCACycle, context: PDCAAdvanceContext): boolean {
    if (target.order !== this.next().order) return false;
    
    switch (this.value) {
      case 'PLAN': return true;
      case 'DO': return context.completionPercent > 0;
      case 'CHECK': return context.hasFollowUp;
      case 'ACT': return context.outcomeDecided;
      default: return false;
    }
  }
  
  static fromValue(value: string): Result<PDCACycle, string> {
    const found = PDCACycle.ALL.find(p => p.value === value);
    if (!found) return Result.fail(`Etapa PDCA inválida: ${value}`);
    return Result.ok(found);
  }
}

interface PDCAAdvanceContext {
  completionPercent: number;
  hasFollowUp: boolean;
  outcomeDecided: boolean;
}
```

## KPITarget

Configuração de meta e thresholds de um KPI.

```typescript
interface KPITargetProps extends Record<string, unknown> {
  value: number;
  unit: string;
  polarity: 'UP' | 'DOWN';
  alertThreshold: number;
  criticalThreshold: number;
}

class KPITarget extends ValueObject<KPITargetProps> {
  get value(): number { return this.props.value; }
  get unit(): string { return this.props.unit; }
  get polarity(): 'UP' | 'DOWN' { return this.props.polarity; }
  get alertThreshold(): number { return this.props.alertThreshold; }
  get criticalThreshold(): number { return this.props.criticalThreshold; }
  
  static create(props: KPITargetProps): Result<KPITarget, string> {
    if (props.value <= 0) return Result.fail('Meta deve ser maior que 0');
    if (props.alertThreshold <= 0 || props.alertThreshold > 100) {
      return Result.fail('Threshold de alerta deve ser entre 0 e 100%');
    }
    if (props.criticalThreshold <= 0 || props.criticalThreshold > 100) {
      return Result.fail('Threshold crítico deve ser entre 0 e 100%');
    }
    if (props.alertThreshold >= props.criticalThreshold) {
      return Result.fail('Threshold de alerta deve ser menor que crítico');
    }
    
    return Result.ok(new KPITarget(props));
  }
  
  /**
   * Calcula status baseado no valor atual.
   */
  calculateStatus(currentValue: number): 'GREEN' | 'YELLOW' | 'RED' {
    const variance = this.calculateVariancePercent(currentValue);
    
    if (this.polarity === 'UP') {
      // Maior é melhor (ex: receita, margem)
      if (variance >= 0) return 'GREEN';
      if (Math.abs(variance) <= this.alertThreshold) return 'YELLOW';
      return 'RED';
    } else {
      // Menor é melhor (ex: custo, tempo)
      if (variance <= 0) return 'GREEN';
      if (variance <= this.alertThreshold) return 'YELLOW';
      return 'RED';
    }
  }
  
  /**
   * Calcula variância absoluta.
   */
  calculateVariance(currentValue: number): number {
    return currentValue - this.value;
  }
  
  /**
   * Calcula variância percentual.
   */
  calculateVariancePercent(currentValue: number): number {
    if (this.value === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - this.value) / this.value) * 100;
  }
}
```

## ProblemSeverity

Severidade de problema encontrado em follow-up.

```typescript
interface ProblemSeverityProps extends Record<string, unknown> {
  value: string;
  label: string;
  color: string;
  escalationDays: number;
}

class ProblemSeverity extends ValueObject<ProblemSeverityProps> {
  static readonly LOW = new ProblemSeverity({ 
    value: 'LOW', 
    label: 'Baixa', 
    color: 'green',
    escalationDays: 30
  });
  
  static readonly MEDIUM = new ProblemSeverity({ 
    value: 'MEDIUM', 
    label: 'Média', 
    color: 'yellow',
    escalationDays: 14
  });
  
  static readonly HIGH = new ProblemSeverity({ 
    value: 'HIGH', 
    label: 'Alta', 
    color: 'orange',
    escalationDays: 7
  });
  
  static readonly CRITICAL = new ProblemSeverity({ 
    value: 'CRITICAL', 
    label: 'Crítica', 
    color: 'red',
    escalationDays: 1
  });
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get color(): string { return this.props.color; }
  get escalationDays(): number { return this.props.escalationDays; }
  
  static fromValue(value: string): Result<ProblemSeverity, string> {
    const map: Record<string, ProblemSeverity> = {
      'LOW': ProblemSeverity.LOW,
      'MEDIUM': ProblemSeverity.MEDIUM,
      'HIGH': ProblemSeverity.HIGH,
      'CRITICAL': ProblemSeverity.CRITICAL
    };
    const found = map[value];
    if (!found) return Result.fail(`Severidade inválida: ${value}`);
    return Result.ok(found);
  }
}
```

## IdeaStatus

Status de uma ideia no banco de ideias.

```typescript
interface IdeaStatusProps extends Record<string, unknown> {
  value: string;
  label: string;
  isEditable: boolean;
  isFinal: boolean;
}

class IdeaStatus extends ValueObject<IdeaStatusProps> {
  static readonly DRAFT = new IdeaStatus({ 
    value: 'DRAFT', 
    label: 'Rascunho', 
    isEditable: true,
    isFinal: false
  });
  
  static readonly SUBMITTED = new IdeaStatus({ 
    value: 'SUBMITTED', 
    label: 'Submetida', 
    isEditable: false,
    isFinal: false
  });
  
  static readonly UNDER_REVIEW = new IdeaStatus({ 
    value: 'UNDER_REVIEW', 
    label: 'Em Análise', 
    isEditable: false,
    isFinal: false
  });
  
  static readonly APPROVED = new IdeaStatus({ 
    value: 'APPROVED', 
    label: 'Aprovada', 
    isEditable: false,
    isFinal: false
  });
  
  static readonly REJECTED = new IdeaStatus({ 
    value: 'REJECTED', 
    label: 'Rejeitada', 
    isEditable: false,
    isFinal: true
  });
  
  static readonly CONVERTED = new IdeaStatus({ 
    value: 'CONVERTED', 
    label: 'Convertida', 
    isEditable: false,
    isFinal: true
  });
  
  static readonly ARCHIVED = new IdeaStatus({ 
    value: 'ARCHIVED', 
    label: 'Arquivada', 
    isEditable: false,
    isFinal: true
  });
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get isEditable(): boolean { return this.props.isEditable; }
  get isFinal(): boolean { return this.props.isFinal; }
  
  canTransitionTo(target: IdeaStatus): boolean {
    if (this.isFinal) return false;
    
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['SUBMITTED'],
      'SUBMITTED': ['UNDER_REVIEW', 'ARCHIVED'],
      'UNDER_REVIEW': ['APPROVED', 'REJECTED'],
      'APPROVED': ['CONVERTED', 'ARCHIVED']
    };
    
    return validTransitions[this.value]?.includes(target.value) ?? false;
  }
}
```

## ConversionTarget

Destino de conversão de uma ideia.

```typescript
interface ConversionTargetProps extends Record<string, unknown> {
  value: string;
  label: string;
  entityType: string;
}

class ConversionTarget extends ValueObject<ConversionTargetProps> {
  static readonly ACTION_PLAN = new ConversionTarget({ 
    value: 'ACTION_PLAN', 
    label: 'Plano de Ação', 
    entityType: 'ActionPlan'
  });
  
  static readonly GOAL = new ConversionTarget({ 
    value: 'GOAL', 
    label: 'Objetivo Estratégico', 
    entityType: 'StrategicGoal'
  });
  
  static readonly PROJECT = new ConversionTarget({ 
    value: 'PROJECT', 
    label: 'Projeto', 
    entityType: 'Project'
  });
  
  static readonly KPI = new ConversionTarget({ 
    value: 'KPI', 
    label: 'KPI', 
    entityType: 'KPI'
  });
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get entityType(): string { return this.props.entityType; }
  
  static fromValue(value: string): Result<ConversionTarget, string> {
    const map: Record<string, ConversionTarget> = {
      'ACTION_PLAN': ConversionTarget.ACTION_PLAN,
      'GOAL': ConversionTarget.GOAL,
      'PROJECT': ConversionTarget.PROJECT,
      'KPI': ConversionTarget.KPI
    };
    const found = map[value];
    if (!found) return Result.fail(`Destino de conversão inválido: ${value}`);
    return Result.ok(found);
  }
}
```
