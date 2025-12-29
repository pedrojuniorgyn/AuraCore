import { Result } from '@/shared/domain';
import { ITaxEngine } from './ITaxEngine';
import { CurrentTaxEngine } from './CurrentTaxEngine';
import { TransitionTaxEngine } from './TransitionTaxEngine';
import { NewTaxEngine } from './NewTaxEngine';

/**
 * Tipo de engine tributário
 */
export enum TaxEngineType {
  CURRENT = 'CURRENT', // Sistema atual (até 2025)
  TRANSITION = 'TRANSITION', // Período de transição (2026-2032)
  NEW = 'NEW', // Novo sistema (2033+)
}

/**
 * Tax Engine Factory
 * 
 * Factory responsável por criar e retornar o engine tributário correto
 * baseado na data de emissão do documento fiscal.
 * 
 * Regras de seleção:
 * - Até 31/12/2025: CurrentTaxEngine (ICMS/ISS/IPI/PIS/COFINS)
 * - 01/01/2026 a 31/12/2032: TransitionTaxEngine (híbrido)
 * - A partir de 01/01/2033: NewTaxEngine (IBS/CBS/IS)
 * 
 * Características:
 * - Singleton por tipo de engine (performance)
 * - Thread-safe (engines são stateless)
 * - Cache de instâncias
 * 
 * Uso:
 * ```typescript
 * const factory = new TaxEngineFactory();
 * const engine = factory.getEngine(emissionDate);
 * const result = engine.calculateAll(params);
 * ```
 * 
 * Base Legal: LC 214/2025 (Reforma Tributária)
 */
export class TaxEngineFactory {
  private static currentEngineInstance: CurrentTaxEngine | null = null;
  private static transitionEngineInstance: TransitionTaxEngine | null = null;
  private static newEngineInstance: NewTaxEngine | null = null;

  /**
   * Retorna o engine apropriado para uma data específica
   * 
   * @param emissionDate - Data de emissão do documento fiscal
   * @returns ITaxEngine - Engine tributário apropriado
   */
  getEngine(emissionDate: Date): ITaxEngine {
    const engineType = this.determineEngineType(emissionDate);
    return this.createEngine(engineType);
  }

  /**
   * Retorna o engine por tipo específico
   * Útil para testes ou casos onde o tipo é conhecido
   * 
   * @param engineType - Tipo do engine desejado
   * @returns ITaxEngine - Engine tributário
   */
  getEngineByType(engineType: TaxEngineType): ITaxEngine {
    return this.createEngine(engineType);
  }

  /**
   * Determina o tipo de engine baseado na data de emissão
   * 
   * @param emissionDate - Data de emissão do documento
   * @returns TaxEngineType - Tipo do engine apropriado
   */
  determineEngineType(emissionDate: Date): TaxEngineType {
    const year = emissionDate.getFullYear();

    // Sistema atual: até 2025
    if (year <= 2025) {
      return TaxEngineType.CURRENT;
    }

    // Período de transição: 2026-2032
    if (year >= 2026 && year <= 2032) {
      return TaxEngineType.TRANSITION;
    }

    // Novo sistema: 2033+
    return TaxEngineType.NEW;
  }

  /**
   * Cria ou retorna instância cached do engine
   * Engines são singleton para performance (stateless)
   * 
   * @param engineType - Tipo do engine
   * @returns ITaxEngine - Instância do engine
   */
  private createEngine(engineType: TaxEngineType): ITaxEngine {
    switch (engineType) {
      case TaxEngineType.CURRENT:
        if (!TaxEngineFactory.currentEngineInstance) {
          TaxEngineFactory.currentEngineInstance = new CurrentTaxEngine();
        }
        return TaxEngineFactory.currentEngineInstance;

      case TaxEngineType.TRANSITION:
        if (!TaxEngineFactory.transitionEngineInstance) {
          TaxEngineFactory.transitionEngineInstance = new TransitionTaxEngine();
        }
        return TaxEngineFactory.transitionEngineInstance;

      case TaxEngineType.NEW:
        if (!TaxEngineFactory.newEngineInstance) {
          TaxEngineFactory.newEngineInstance = new NewTaxEngine();
        }
        return TaxEngineFactory.newEngineInstance;

      default:
        // Fallback para sistema atual
        if (!TaxEngineFactory.currentEngineInstance) {
          TaxEngineFactory.currentEngineInstance = new CurrentTaxEngine();
        }
        return TaxEngineFactory.currentEngineInstance;
    }
  }

  /**
   * Limpa cache de engines (útil para testes)
   */
  static clearCache(): void {
    TaxEngineFactory.currentEngineInstance = null;
    TaxEngineFactory.transitionEngineInstance = null;
    TaxEngineFactory.newEngineInstance = null;
  }

  /**
   * Retorna informações sobre o período tributário de uma data
   * Útil para exibir informações ao usuário
   * 
   * @param date - Data para consulta
   * @returns Informações sobre o período
   */
  getPeriodInfo(date: Date): {
    engineType: TaxEngineType;
    year: number;
    description: string;
    applicableTaxes: string[];
  } {
    const engineType = this.determineEngineType(date);
    const year = date.getFullYear();

    switch (engineType) {
      case TaxEngineType.CURRENT:
        return {
          engineType,
          year,
          description: 'Sistema Tributário Atual',
          applicableTaxes: ['ICMS', 'ISS', 'IPI', 'PIS', 'COFINS'],
        };

      case TaxEngineType.TRANSITION:
        return {
          engineType,
          year,
          description: `Período de Transição (ano ${year})`,
          applicableTaxes: this.getTransitionApplicableTaxes(year),
        };

      case TaxEngineType.NEW:
        return {
          engineType,
          year,
          description: 'Novo Sistema Tributário',
          applicableTaxes: ['IBS', 'CBS', 'IS'],
        };

      default:
        return {
          engineType: TaxEngineType.CURRENT,
          year,
          description: 'Sistema Tributário Atual (fallback)',
          applicableTaxes: ['ICMS', 'ISS', 'IPI', 'PIS', 'COFINS'],
        };
    }
  }

  /**
   * Retorna impostos aplicáveis durante o período de transição
   * Varia conforme o ano
   */
  private getTransitionApplicableTaxes(year: number): string[] {
    const taxes: string[] = ['IPI']; // IPI mantido em todo período

    // 2026: Todos os impostos (teste)
    if (year === 2026) {
      taxes.push('ICMS', 'ISS', 'PIS', 'COFINS', 'CBS (teste)', 'IBS (teste)');
    }
    // 2027+: PIS/COFINS extintos
    else if (year >= 2027 && year <= 2032) {
      taxes.push('ICMS (redução gradual)', 'ISS (redução gradual)', 'CBS', 'IBS (aumento gradual)');
    }

    return taxes;
  }

  /**
   * Valida se uma data está dentro do range suportado
   * Sistema suporta documentos de 2020 até 2050
   */
  static isDateSupported(date: Date): Result<void, string> {
    const year = date.getFullYear();

    if (year < 2020) {
      return Result.fail('Documents before 2020 are not supported');
    }

    if (year > 2050) {
      return Result.fail('Documents after 2050 are not supported');
    }

    if (isNaN(date.getTime())) {
      return Result.fail('Invalid date');
    }

    return Result.ok(undefined);
  }

  /**
   * Retorna datas importantes da Reforma Tributária
   */
  static getReformMilestones(): {
    date: string;
    description: string;
    changes: string[];
  }[] {
    return [
      {
        date: '2026-01-01',
        description: 'Início da Reforma Tributária',
        changes: ['CBS em teste (0,9%)', 'IBS em teste (0,1%)', 'PIS/COFINS mantidos'],
      },
      {
        date: '2027-01-01',
        description: 'Extinção de PIS/COFINS',
        changes: ['PIS/COFINS extintos', 'CBS alíquota cheia (8,8%)', 'IBS ainda em teste (0,1%)'],
      },
      {
        date: '2029-01-01',
        description: 'Início da transição ICMS/ISS → IBS',
        changes: ['ICMS/ISS reduzidos para 90%', 'IBS sobe para 1,77% (10%)'],
      },
      {
        date: '2030-01-01',
        description: 'Continuação da transição',
        changes: ['ICMS/ISS reduzidos para 80%', 'IBS sobe para 3,54% (20%)'],
      },
      {
        date: '2031-01-01',
        description: 'Aceleração da transição',
        changes: ['ICMS/ISS reduzidos para 60%', 'IBS sobe para 7,08% (40%)'],
      },
      {
        date: '2032-01-01',
        description: 'Fase final da transição',
        changes: ['ICMS/ISS reduzidos para 40%', 'IBS sobe para 10,62% (60%)'],
      },
      {
        date: '2033-01-01',
        description: 'Novo Sistema Tributário 100% implementado',
        changes: ['ICMS/ISS extintos', 'IBS alíquota cheia (17,7%)', 'CBS mantida (8,8%)', 'IS implementado'],
      },
    ];
  }
}

