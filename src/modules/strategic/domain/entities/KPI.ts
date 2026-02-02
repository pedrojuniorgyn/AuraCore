/**
 * Entity: KPI (Key Performance Indicator)
 * Indicadores de desempenho vinculados às metas estratégicas
 *
 * @module strategic/domain/entities
 * @see ADR-0020
 */
import { Entity, Result } from '@/shared/domain';
import { KPICalculatorService } from '../services/KPICalculatorService';

export type KPIPolarity = 'UP' | 'DOWN';
export type KPIFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type KPIStatus = 'GREEN' | 'YELLOW' | 'RED';

interface KPIProps {
  organizationId: number;
  branchId: number;
  goalId: string | null;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  polarity: KPIPolarity;
  frequency: KPIFrequency;
  targetValue: number;
  currentValue: number;
  baselineValue: number | null;
  alertThreshold: number;
  criticalThreshold: number;
  autoCalculate: boolean;
  sourceModule: string | null;
  sourceQuery: string | null;
  status: KPIStatus;
  lastCalculatedAt: Date | null;
  ownerUserId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateKPIProps {
  organizationId: number;
  branchId: number;
  goalId?: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  polarity?: KPIPolarity;
  frequency?: KPIFrequency;
  targetValue: number;
  baselineValue?: number;
  alertThreshold?: number;
  criticalThreshold?: number;
  autoCalculate?: boolean;
  sourceModule?: string;
  sourceQuery?: string;
  ownerUserId: string;
  createdBy: string;
}

export class KPI extends Entity<string> {
  private readonly props: KPIProps;

  private constructor(id: string, props: KPIProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get goalId(): string | null { return this.props.goalId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get unit(): string { return this.props.unit; }
  get polarity(): KPIPolarity { return this.props.polarity; }
  get frequency(): KPIFrequency { return this.props.frequency; }
  get targetValue(): number { return this.props.targetValue; }
  get currentValue(): number { return this.props.currentValue; }
  get baselineValue(): number | null { return this.props.baselineValue; }
  get alertThreshold(): number { return this.props.alertThreshold; }
  get criticalThreshold(): number { return this.props.criticalThreshold; }
  get autoCalculate(): boolean { return this.props.autoCalculate; }
  get sourceModule(): string | null { return this.props.sourceModule; }
  get sourceQuery(): string | null { return this.props.sourceQuery; }
  get status(): KPIStatus { return this.props.status; }
  get lastCalculatedAt(): Date | null { return this.props.lastCalculatedAt; }
  get ownerUserId(): string { return this.props.ownerUserId; }
  get createdBy(): string { return this.props.createdBy; }

  /**
   * Calcula a porcentagem de atingimento da meta
   */
  get achievementPercent(): number {
    if (this.props.targetValue === 0) return 0;
    return (this.props.currentValue / this.props.targetValue) * 100;
  }

  /**
   * Calcula o desvio em relação à meta
   */
  get deviationPercent(): number {
    if (this.props.targetValue === 0) return 0;
    const deviation = ((this.props.currentValue - this.props.targetValue) / this.props.targetValue) * 100;
    return this.props.polarity === 'UP' ? deviation : -deviation;
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateKPIProps): Result<KPI, string> {
    // Validações
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.code?.trim()) return Result.fail('code é obrigatório');
    if (!props.name?.trim()) return Result.fail('name é obrigatório');
    if (!props.unit?.trim()) return Result.fail('unit é obrigatório');
    if (props.targetValue === undefined || props.targetValue === null) {
      return Result.fail('targetValue é obrigatório');
    }
    if (!props.ownerUserId) return Result.fail('ownerUserId é obrigatório');
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const kpi = new KPI(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      goalId: props.goalId ?? null,
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      description: props.description?.trim() ?? null,
      unit: props.unit.trim(),
      polarity: props.polarity ?? 'UP',
      frequency: props.frequency ?? 'MONTHLY',
      targetValue: props.targetValue,
      currentValue: 0,
      baselineValue: props.baselineValue ?? null,
      alertThreshold: props.alertThreshold ?? 10,
      criticalThreshold: props.criticalThreshold ?? 20,
      autoCalculate: props.autoCalculate ?? false,
      sourceModule: props.sourceModule ?? null,
      sourceQuery: props.sourceQuery ?? null,
      status: 'GREEN',
      lastCalculatedAt: null,
      ownerUserId: props.ownerUserId,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(kpi);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: KPIProps & { id: string }): Result<KPI, string> {
    return Result.ok(new KPI(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      goalId: props.goalId,
      code: props.code,
      name: props.name,
      description: props.description,
      unit: props.unit,
      polarity: props.polarity,
      frequency: props.frequency,
      targetValue: props.targetValue,
      currentValue: props.currentValue,
      baselineValue: props.baselineValue,
      alertThreshold: props.alertThreshold,
      criticalThreshold: props.criticalThreshold,
      autoCalculate: props.autoCalculate,
      sourceModule: props.sourceModule,
      sourceQuery: props.sourceQuery,
      status: props.status,
      lastCalculatedAt: props.lastCalculatedAt,
      ownerUserId: props.ownerUserId,
      createdBy: props.createdBy,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Atualiza o valor atual do KPI
   */
  updateValue(newValue: number): Result<void, string> {
    (this.props as { currentValue: number }).currentValue = newValue;
    (this.props as { lastCalculatedAt: Date }).lastCalculatedAt = new Date();
    
    // Recalcula status
    this.recalculateStatus();
    this.touch();
    
    return Result.ok(undefined);
  }

  /**
   * Recalcula o status baseado nos thresholds usando KPICalculatorService
   *
   * Converte alertThreshold de percentual para ratio:
   * - alertThreshold=10 significa "alerta quando estiver 10% abaixo da meta"
   * - Isso equivale a warningRatio=0.9 (90% da meta)
   */
  private recalculateStatus(): void {
    // Converter alertThreshold (percentual) para warningRatio
    // alertThreshold=10 → warningRatio=0.9 (90% da meta)
    const warningRatio = 1.0 - (this.props.alertThreshold / 100);

    const statusResult = KPICalculatorService.calculateStatus(
      this.props.currentValue,
      this.props.targetValue,
      this.props.polarity,
      warningRatio
    );

    // Se o cálculo falhar (valores nulos), manter status atual ou definir como RED
    const newStatus: KPIStatus = Result.isOk(statusResult)
      ? statusResult.value
      : 'RED';

    (this.props as { status: KPIStatus }).status = newStatus;
  }

  /**
   * Atualiza a meta
   */
  updateTarget(newTarget: number): Result<void, string> {
    if (newTarget <= 0 && this.props.polarity === 'UP') {
      return Result.fail('targetValue deve ser maior que 0 para polaridade UP');
    }
    
    (this.props as { targetValue: number }).targetValue = newTarget;
    this.recalculateStatus();
    this.touch();
    
    return Result.ok(undefined);
  }

  /**
   * Configura cálculo automático
   */
  configureAutoCalculation(sourceModule: string, sourceQuery: string): Result<void, string> {
    if (!sourceModule?.trim()) return Result.fail('sourceModule é obrigatório');
    if (!sourceQuery?.trim()) return Result.fail('sourceQuery é obrigatório');
    
    (this.props as { autoCalculate: boolean }).autoCalculate = true;
    (this.props as { sourceModule: string }).sourceModule = sourceModule;
    (this.props as { sourceQuery: string }).sourceQuery = sourceQuery;
    this.touch();
    
    return Result.ok(undefined);
  }

  /**
   * Desativa cálculo automático
   */
  disableAutoCalculation(): Result<void, string> {
    (this.props as { autoCalculate: boolean }).autoCalculate = false;
    (this.props as { sourceModule: string | null }).sourceModule = null;
    (this.props as { sourceQuery: string | null }).sourceQuery = null;
    this.touch();
    
    return Result.ok(undefined);
  }
}
