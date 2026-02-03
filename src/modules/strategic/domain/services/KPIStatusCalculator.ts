/**
 * Domain Service: KPIStatusCalculator
 * Centraliza lógica de cálculo de status de KPIs baseado em progresso percentual
 * 
 * Diferenças do KPICalculatorService:
 * - KPICalculatorService: calcula status baseado em currentValue vs target (GREEN/YELLOW/RED)
 * - KPIStatusCalculator: calcula status baseado apenas em progress % (ON_TRACK/AT_RISK/CRITICAL)
 * 
 * Regras:
 * - >= 100% = ON_TRACK (verde) - Meta atingida ou superada
 * - >= 80% = AT_RISK (amarelo) - Atenção necessária (80-99%)
 * - < 80% = CRITICAL (vermelho) - Intervenção urgente
 * - null/undefined = NO_DATA (cinza) - Dados insuficientes
 * 
 * @module strategic/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 */

export type KPIStatus = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'NO_DATA';

export interface KPIStatusThresholds {
  /** Threshold para ON_TRACK (default: 100%) */
  onTrackThreshold: number;
  /** Threshold para AT_RISK (default: 80%) */
  atRiskThreshold: number;
}

const DEFAULT_THRESHOLDS: KPIStatusThresholds = {
  onTrackThreshold: 100,
  atRiskThreshold: 80,
};

export class KPIStatusCalculator {
  private constructor() {} // Stateless service (DOMAIN-SVC-002)

  /**
   * Calcula status baseado em progress percentage
   * 
   * @param progress Porcentagem de progresso (0-100)
   * @param thresholds Thresholds customizados (opcional)
   * @returns Status do KPI
   * 
   * @example
   * ```typescript
   * KPIStatusCalculator.calculateStatus(90); // 'ON_TRACK'
   * KPIStatusCalculator.calculateStatus(75); // 'AT_RISK'
   * KPIStatusCalculator.calculateStatus(50); // 'CRITICAL'
   * KPIStatusCalculator.calculateStatus(null); // 'NO_DATA'
   * ```
   */
  static calculateStatus(
    progress: number | null | undefined,
    thresholds: KPIStatusThresholds = DEFAULT_THRESHOLDS
  ): KPIStatus {
    if (progress === null || progress === undefined) {
      return 'NO_DATA';
    }

    if (progress >= thresholds.onTrackThreshold) {
      return 'ON_TRACK';
    }

    if (progress >= thresholds.atRiskThreshold) {
      return 'AT_RISK';
    }

    return 'CRITICAL';
  }

  /**
   * Calcula status baseado em direction (HIGHER/LOWER is better)
   * Útil para casos onde precisamos calcular o progress baseado em target
   * 
   * @param params Parâmetros de cálculo
   * @returns Status do KPI
   * 
   * @example
   * ```typescript
   * // Vendas: maior é melhor, target 100, atual 90 = 90% progress
   * KPIStatusCalculator.calculateStatusWithDirection({
   *   target: 100,
   *   actual: 90,
   *   direction: 'HIGHER_IS_BETTER'
   * }); // 'ON_TRACK'
   * 
   * // Custos: menor é melhor, target 100, atual 90 = 111% progress
   * KPIStatusCalculator.calculateStatusWithDirection({
   *   target: 100,
   *   actual: 90,
   *   direction: 'LOWER_IS_BETTER'
   * }); // 'ON_TRACK'
   * ```
   */
  static calculateStatusWithDirection(params: {
    target: number | null;
    actual: number | null;
    direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
    thresholds?: KPIStatusThresholds;
  }): KPIStatus {
    const { target, actual, direction, thresholds = DEFAULT_THRESHOLDS } = params;

    if (target === null || actual === null) {
      return 'NO_DATA';
    }

    // Evitar divisão por zero
    if (target === 0) {
      return 'NO_DATA';
    }

    let ratio: number;
    if (direction === 'HIGHER_IS_BETTER') {
      // Maior é melhor: ratio = (actual / target) * 100
      ratio = (actual / target) * 100;
    } else {
      // Menor é melhor: ratio = (target / actual) * 100
      // Se actual = 0, consideramos como 100% (meta superada)
      if (actual === 0) {
        return 'ON_TRACK';
      }
      ratio = (target / actual) * 100;
    }

    return KPIStatusCalculator.calculateStatus(ratio, thresholds);
  }

  /**
   * Retorna cor CSS associada ao status
   * 
   * @param status Status do KPI
   * @returns Cor em formato string (nome ou hex)
   */
  static getStatusColor(status: KPIStatus): string {
    const colors: Record<KPIStatus, string> = {
      ON_TRACK: 'green',
      AT_RISK: 'yellow',
      CRITICAL: 'red',
      NO_DATA: 'gray',
    };
    return colors[status];
  }

  /**
   * Retorna cor hexadecimal associada ao status
   * 
   * @param status Status do KPI
   * @returns Cor em formato hexadecimal
   */
  static getStatusColorHex(status: KPIStatus): string {
    const colors: Record<KPIStatus, string> = {
      ON_TRACK: '#22c55e',
      AT_RISK: '#f59e0b',
      CRITICAL: '#ef4444',
      NO_DATA: '#6b7280',
    };
    return colors[status];
  }

  /**
   * Retorna label traduzido do status
   * 
   * @param status Status do KPI
   * @returns Label em português
   */
  static getStatusLabel(status: KPIStatus): string {
    const labels: Record<KPIStatus, string> = {
      ON_TRACK: 'No caminho',
      AT_RISK: 'Em risco',
      CRITICAL: 'Crítico',
      NO_DATA: 'Sem dados',
    };
    return labels[status];
  }

  /**
   * Retorna ícone emoji associado ao status
   * 
   * @param status Status do KPI
   * @returns Emoji representativo
   */
  static getStatusIcon(status: KPIStatus): string {
    const icons: Record<KPIStatus, string> = {
      ON_TRACK: '✅',
      AT_RISK: '⚠️',
      CRITICAL: '🚨',
      NO_DATA: '➖',
    };
    return icons[status];
  }

  /**
   * Retorna descrição detalhada do status
   * 
   * @param status Status do KPI
   * @returns Descrição textual
   */
  static getStatusDescription(status: KPIStatus): string {
    const descriptions: Record<KPIStatus, string> = {
      ON_TRACK: 'KPI está dentro da meta esperada (≥100%)',
      AT_RISK: 'KPI requer atenção e pode precisar de ajustes (80-99%)',
      CRITICAL: 'KPI crítico, intervenção urgente necessária (<80%)',
      NO_DATA: 'Dados insuficientes para calcular status',
    };
    return descriptions[status];
  }
}
