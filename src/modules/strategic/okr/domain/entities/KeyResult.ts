/**
 * Value Object: KeyResult
 * Representa um resultado-chave de um OKR
 * 
 * @module strategic/okr/domain/entities
 */
import { ValueObject } from '../../../../../shared/domain/entities/ValueObject';
import { Result } from '../../../../../shared/domain/types/Result';

export type KeyResultMetricType = 'number' | 'percentage' | 'currency' | 'boolean';
export type KeyResultStatus = 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';

interface KeyResultProps extends Record<string, unknown> {
  title: string;
  description?: string;
  metricType: KeyResultMetricType;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit?: string;
  status: KeyResultStatus;
  weight: number; // 0-100 (peso do KR no OKR)
  order: number; // Ordem de exibição
  linkedKpiId?: string;
  linkedActionPlanId?: string;
}

export class KeyResult extends ValueObject<KeyResultProps> {
  private constructor(props: KeyResultProps) {
    super(props);
  }

  // Getters
  get title(): string {
    return this.props.title as string;
  }

  get description(): string | undefined {
    return this.props.description as string | undefined;
  }

  get metricType(): KeyResultMetricType {
    return this.props.metricType as KeyResultMetricType;
  }

  get startValue(): number {
    return this.props.startValue as number;
  }

  get targetValue(): number {
    return this.props.targetValue as number;
  }

  get currentValue(): number {
    return this.props.currentValue as number;
  }

  get unit(): string | undefined {
    return this.props.unit as string | undefined;
  }

  get status(): KeyResultStatus {
    return this.props.status as KeyResultStatus;
  }

  get weight(): number {
    return this.props.weight as number;
  }

  get order(): number {
    return this.props.order as number;
  }

  get linkedKpiId(): string | undefined {
    return this.props.linkedKpiId as string | undefined;
  }

  get linkedActionPlanId(): string | undefined {
    return this.props.linkedActionPlanId as string | undefined;
  }

  /**
   * Calcula o progresso do Key Result (0-100)
   */
  get progress(): number {
    const targetValue = this.props.targetValue as number;
    const startValue = this.props.startValue as number;
    const currentValue = this.props.currentValue as number;

    if (targetValue === startValue) {
      return 100; // Se start = target, considera completo
    }

    const range = targetValue - startValue;
    const current = currentValue - startValue;
    const progress = (current / range) * 100;

    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  /**
   * Factory Method: create() COM validações
   */
  static create(
    props: Omit<KeyResultProps, 'status'> & { status?: KeyResultStatus }
  ): Result<KeyResult, string> {
    // Validações de domínio
    const title = props.title as string;
    const description = props.description as string | undefined;
    const weight = props.weight as number;
    const order = props.order as number;
    const startValue = props.startValue as number;
    const targetValue = props.targetValue as number;
    const currentValue = props.currentValue as number;

    if (!title?.trim()) {
      return Result.fail('Key Result title é obrigatório');
    }

    if (title.length > 200) {
      return Result.fail('Key Result title deve ter no máximo 200 caracteres');
    }

    if (description && description.length > 1000) {
      return Result.fail('Key Result description deve ter no máximo 1000 caracteres');
    }

    if (weight < 0 || weight > 100) {
      return Result.fail('Key Result weight deve estar entre 0 e 100');
    }

    if (order < 0) {
      return Result.fail('Key Result order deve ser não-negativo');
    }

    // Calcular status inicial baseado no progresso
    let status: KeyResultStatus = props.status || 'not_started';

    if (!props.status) {
      const range = targetValue - startValue;
      const current = currentValue - startValue;
      const progress = range === 0 ? 100 : (current / range) * 100;

      if (progress === 0) {
        status = 'not_started';
      } else if (progress >= 100) {
        status = 'completed';
      } else if (progress >= 70) {
        status = 'on_track';
      } else if (progress >= 40) {
        status = 'at_risk';
      } else {
        status = 'behind';
      }
    }

    return Result.ok(
      new KeyResult({
        ...props,
        title: title.trim(),
        description: description?.trim(),
        status,
      } as KeyResultProps)
    );
  }

  /**
   * Atualiza o valor atual e recalcula status
   */
  updateCurrentValue(newValue: number): Result<KeyResult, string> {
    if (newValue < 0) {
      return Result.fail('Current value não pode ser negativo');
    }

    return KeyResult.create({
      ...(this.props as unknown as Omit<KeyResultProps, 'status'>),
      currentValue: newValue,
    });
  }

  /**
   * Atualiza o status manualmente
   */
  updateStatus(newStatus: KeyResultStatus): KeyResult {
    return new KeyResult({
      ...(this.props as unknown as KeyResultProps),
      status: newStatus,
    });
  }
}
