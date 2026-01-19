/**
 * Value Object: KPITarget
 * Meta de um KPI com thresholds para alertas
 * 
 * @module strategic/domain/value-objects
 * @see ADR-0020
 */
import { ValueObject, Result } from '@/shared/domain';

type Polarity = 'UP' | 'DOWN';
type KPIStatus = 'GREEN' | 'YELLOW' | 'RED';

interface KPITargetProps extends Record<string, unknown> {
  value: number;
  unit: string;
  polarity: Polarity;
  alertThreshold: number;    // % de desvio para alerta (yellow)
  criticalThreshold: number; // % de desvio para crítico (red)
}

export class KPITarget extends ValueObject<KPITargetProps> {
  private constructor(props: KPITargetProps) {
    super(props);
    Object.freeze(this);
  }

  get value(): number { return this.props.value; }
  get unit(): string { return this.props.unit; }
  get polarity(): Polarity { return this.props.polarity; }
  get alertThreshold(): number { return this.props.alertThreshold; }
  get criticalThreshold(): number { return this.props.criticalThreshold; }

  /**
   * Cria uma meta de KPI
   */
  static create(props: {
    value: number;
    unit: string;
    polarity?: Polarity;
    alertThreshold?: number;
    criticalThreshold?: number;
  }): Result<KPITarget, string> {
    if (props.value === undefined || props.value === null) {
      return Result.fail('value é obrigatório');
    }
    if (!props.unit?.trim()) {
      return Result.fail('unit é obrigatório');
    }

    const alertThreshold = props.alertThreshold ?? 10;
    const criticalThreshold = props.criticalThreshold ?? 20;

    if (alertThreshold < 0 || alertThreshold > 100) {
      return Result.fail('alertThreshold deve ser entre 0 e 100');
    }
    if (criticalThreshold < 0 || criticalThreshold > 100) {
      return Result.fail('criticalThreshold deve ser entre 0 e 100');
    }
    if (alertThreshold >= criticalThreshold) {
      return Result.fail('alertThreshold deve ser menor que criticalThreshold');
    }

    return Result.ok(new KPITarget({
      value: props.value,
      unit: props.unit,
      polarity: props.polarity ?? 'UP',
      alertThreshold,
      criticalThreshold,
    }));
  }

  /**
   * Calcula o status do KPI baseado no valor atual
   */
  calculateStatus(currentValue: number): KPIStatus {
    const variancePercent = this.calculateVariancePercent(currentValue);
    
    // Para polarity UP: valor acima da meta é bom
    // Para polarity DOWN: valor abaixo da meta é bom
    const isGood = this.polarity === 'UP' 
      ? variancePercent >= 0 
      : variancePercent <= 0;

    if (isGood) return 'GREEN';
    
    const absVariance = Math.abs(variancePercent);
    if (absVariance <= this.alertThreshold) return 'YELLOW';
    return 'RED';
  }

  /**
   * Calcula a variância absoluta
   */
  calculateVariance(currentValue: number): number {
    return currentValue - this.value;
  }

  /**
   * Calcula a variância percentual
   */
  calculateVariancePercent(currentValue: number): number {
    if (this.value === 0) {
      return currentValue === 0 ? 0 : (currentValue > 0 ? 100 : -100);
    }
    return ((currentValue - this.value) / Math.abs(this.value)) * 100;
  }

  /**
   * Calcula o progresso em relação à meta (0-100%)
   */
  calculateProgress(currentValue: number, baselineValue?: number): number {
    const baseline = baselineValue ?? 0;
    const target = this.value;
    
    if (target === baseline) return 100;
    
    const progress = ((currentValue - baseline) / (target - baseline)) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  toString(): string {
    return `${this.value} ${this.unit} (${this.polarity === 'UP' ? '↑' : '↓'})`;
  }
}
