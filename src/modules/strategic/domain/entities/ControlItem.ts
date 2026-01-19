/**
 * Entity: ControlItem (Item de Controle)
 * Mede o RESULTADO de um processo (Metodologia GEROT/Falconi)
 * 
 * @module strategic/domain/entities
 */
import { AggregateRoot, Result } from '@/shared/domain';

export type ControlItemStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
export type MeasurementFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

interface ControlItemProps {
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  description: string | null;
  processArea: string;
  responsibleUserId: string;
  measurementFrequency: MeasurementFrequency;
  unit: string;
  targetValue: number;
  upperLimit: number;
  lowerLimit: number;
  currentValue: number;
  status: ControlItemStatus;
  kpiId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateControlItemProps {
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  description?: string;
  processArea: string;
  responsibleUserId: string;
  measurementFrequency: MeasurementFrequency;
  unit: string;
  targetValue: number;
  upperLimit: number;
  lowerLimit: number;
  kpiId?: string;
  createdBy: string;
}

export class ControlItem extends AggregateRoot<string> {
  private constructor(id: string, private readonly props: ControlItemProps) {
    super(id);
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get processArea(): string { return this.props.processArea; }
  get responsibleUserId(): string { return this.props.responsibleUserId; }
  get measurementFrequency(): MeasurementFrequency { return this.props.measurementFrequency; }
  get unit(): string { return this.props.unit; }
  get targetValue(): number { return this.props.targetValue; }
  get upperLimit(): number { return this.props.upperLimit; }
  get lowerLimit(): number { return this.props.lowerLimit; }
  get currentValue(): number { return this.props.currentValue; }
  get status(): ControlItemStatus { return this.props.status; }
  get kpiId(): string | null { return this.props.kpiId; }
  get createdBy(): string { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Verifica se o valor atual está dentro dos limites de controle
   */
  isWithinLimits(): boolean {
    return this.props.currentValue >= this.props.lowerLimit &&
           this.props.currentValue <= this.props.upperLimit;
  }

  /**
   * Verifica se o valor atual atingiu a meta
   */
  isOnTarget(): boolean {
    return this.props.currentValue >= this.props.targetValue;
  }

  /**
   * Calcula o desvio percentual em relação à meta
   */
  calculateDeviation(): number {
    if (this.props.targetValue === 0) return 0;
    return ((this.props.currentValue - this.props.targetValue) / this.props.targetValue) * 100;
  }

  /**
   * Retorna o status visual baseado nos limites
   */
  getVisualStatus(): 'OK' | 'WARNING' | 'CRITICAL' {
    if (!this.isWithinLimits()) return 'CRITICAL';
    if (!this.isOnTarget()) return 'WARNING';
    return 'OK';
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateControlItemProps): Result<ControlItem, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.code?.trim()) return Result.fail('Código é obrigatório');
    if (!props.name?.trim()) return Result.fail('Nome é obrigatório');
    if (!props.processArea?.trim()) return Result.fail('Área do processo é obrigatória');
    if (!props.responsibleUserId) return Result.fail('Responsável é obrigatório');
    if (!props.unit?.trim()) return Result.fail('Unidade é obrigatória');
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');
    if (props.upperLimit < props.lowerLimit) {
      return Result.fail('Limite superior deve ser maior ou igual ao limite inferior');
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new ControlItem(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      description: props.description?.trim() ?? null,
      processArea: props.processArea.trim(),
      responsibleUserId: props.responsibleUserId,
      measurementFrequency: props.measurementFrequency,
      unit: props.unit.trim(),
      targetValue: props.targetValue,
      upperLimit: props.upperLimit,
      lowerLimit: props.lowerLimit,
      currentValue: 0,
      status: 'ACTIVE',
      kpiId: props.kpiId ?? null,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: ControlItemProps & { id: string }): Result<ControlItem, string> {
    return Result.ok(new ControlItem(props.id, props));
  }

  // Métodos de negócio

  /**
   * Atualiza o valor atual e detecta anomalias
   */
  updateValue(newValue: number): Result<{ anomalyDetected: boolean; previousValue: number }, string> {
    const previousValue = this.props.currentValue;
    (this.props as { currentValue: number }).currentValue = newValue;
    (this.props as { updatedAt: Date }).updatedAt = new Date();

    // Verificar se gerou anomalia (fora dos limites)
    const anomalyDetected = !this.isWithinLimits();

    // Se anomalia detectada, podemos emitir evento via handler externo
    // A entidade apenas retorna o resultado da operação

    return Result.ok({ anomalyDetected, previousValue });
  }

  /**
   * Atualiza a meta e limites
   */
  updateLimits(
    targetValue: number,
    upperLimit: number,
    lowerLimit: number
  ): Result<void, string> {
    if (upperLimit < lowerLimit) {
      return Result.fail('Limite superior deve ser maior ou igual ao limite inferior');
    }

    (this.props as { targetValue: number }).targetValue = targetValue;
    (this.props as { upperLimit: number }).upperLimit = upperLimit;
    (this.props as { lowerLimit: number }).lowerLimit = lowerLimit;
    (this.props as { updatedAt: Date }).updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Vincula a um KPI
   */
  linkToKPI(kpiId: string): Result<void, string> {
    if (!kpiId) return Result.fail('kpiId é obrigatório');
    (this.props as { kpiId: string | null }).kpiId = kpiId;
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Desativa o item de controle
   */
  deactivate(): Result<void, string> {
    if (this.props.status === 'INACTIVE') {
      return Result.fail('Item de controle já está inativo');
    }
    (this.props as { status: ControlItemStatus }).status = 'INACTIVE';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Reativa o item de controle
   */
  activate(): Result<void, string> {
    if (this.props.status === 'ACTIVE') {
      return Result.fail('Item de controle já está ativo');
    }
    (this.props as { status: ControlItemStatus }).status = 'ACTIVE';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    return Result.ok(undefined);
  }
}
