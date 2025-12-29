import { Result } from '@/shared/domain';

/**
 * Value Object: Regime Tributário
 * 
 * Define qual motor de tributação usar baseado na data de emissão.
 * 
 * Regimes:
 * - CURRENT: Sistema atual (ICMS/ISS/PIS/COFINS) - Até 31/12/2025
 * - TRANSITION: Período de transição (Ambos os sistemas) - 01/01/2026 a 31/12/2032
 * - NEW: Sistema novo (IBS/CBS/IS) - A partir de 01/01/2033
 * 
 * Base Legal: EC 132/2023 + LC 214/2025
 */

export enum TaxRegimeType {
  CURRENT = 'CURRENT',
  TRANSITION = 'TRANSITION',
  NEW = 'NEW',
}

export interface TaxRegimeProps {
  type: TaxRegimeType;
}

export class TaxRegime {
  private readonly _props: TaxRegimeProps;

  private constructor(props: TaxRegimeProps) {
    this._props = Object.freeze({ ...props });
  }

  get type(): TaxRegimeType {
    return this._props.type;
  }

  get value(): string {
    return this._props.type;
  }

  /**
   * É regime atual (ICMS/ISS/PIS/COFINS)?
   */
  get isCurrent(): boolean {
    return this._props.type === TaxRegimeType.CURRENT;
  }

  /**
   * É regime de transição (dupla tributação)?
   */
  get isTransition(): boolean {
    return this._props.type === TaxRegimeType.TRANSITION;
  }

  /**
   * É regime novo (IBS/CBS/IS)?
   */
  get isNew(): boolean {
    return this._props.type === TaxRegimeType.NEW;
  }

  /**
   * Descrição do regime
   */
  get description(): string {
    const descriptions: Record<TaxRegimeType, string> = {
      [TaxRegimeType.CURRENT]: 'Sistema Atual (ICMS/ISS/PIS/COFINS)',
      [TaxRegimeType.TRANSITION]: 'Período de Transição (2026-2032)',
      [TaxRegimeType.NEW]: 'Sistema Novo (IBS/CBS/IS)',
    };
    return descriptions[this._props.type];
  }

  /**
   * Factory method: Cria regime a partir de tipo
   */
  static create(type: TaxRegimeType): Result<TaxRegime, string> {
    const validTypes = Object.values(TaxRegimeType);
    if (!validTypes.includes(type)) {
      return Result.fail(`Invalid tax regime type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    return Result.ok(new TaxRegime({ type }));
  }

  /**
   * Factory method: Determina regime baseado na data de emissão
   */
  static fromDate(emissionDate: Date): Result<TaxRegime, string> {
    const transitionStart = new Date('2026-01-01');
    const newRegimeStart = new Date('2033-01-01');

    let type: TaxRegimeType;

    if (emissionDate < transitionStart) {
      type = TaxRegimeType.CURRENT;
    } else if (emissionDate < newRegimeStart) {
      type = TaxRegimeType.TRANSITION;
    } else {
      type = TaxRegimeType.NEW;
    }

    return TaxRegime.create(type);
  }

  /**
   * Regime atual (padrão para datas < 2026)
   */
  static current(): TaxRegime {
    const result = TaxRegime.create(TaxRegimeType.CURRENT);
    if (Result.isFail(result)) {
      throw new Error('Failed to create CURRENT tax regime');
    }
    return result.value;
  }

  /**
   * Regime de transição (2026-2032)
   */
  static transition(): TaxRegime {
    const result = TaxRegime.create(TaxRegimeType.TRANSITION);
    if (Result.isFail(result)) {
      throw new Error('Failed to create TRANSITION tax regime');
    }
    return result.value;
  }

  /**
   * Regime novo (2033+)
   */
  static new(): TaxRegime {
    const result = TaxRegime.create(TaxRegimeType.NEW);
    if (Result.isFail(result)) {
      throw new Error('Failed to create NEW tax regime');
    }
    return result.value;
  }

  /**
   * Verifica igualdade
   */
  equals(other: TaxRegime): boolean {
    return this._props.type === other.type;
  }
}

