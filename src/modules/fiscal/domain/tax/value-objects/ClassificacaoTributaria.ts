import { Result } from '@/shared/domain';

/**
 * Value Object: Classificação Tributária (cClassTrib)
 * 
 * Código de 5 dígitos que identifica a classificação tributária
 * na Lei Complementar 214/2025 (Reforma Tributária).
 * 
 * Cada código corresponde a um artigo específico da LC 214/2025
 * que define o tratamento tributário (alíquota, isenção, diferimento, etc.)
 * 
 * Faixas de códigos:
 * 10000-19999: Tributação integral
 * 20000-29999: Alíquota reduzida
 * 30000-39999: Isenção
 * 40000-49999: Imunidade
 * 50000-59999: Diferimento
 * 60000-69999: Suspensão
 * 70000-79999: Regimes específicos
 * 80000-89999: Crédito presumido
 * 90000-99999: Outros
 * 
 * Base Legal: LC 214/2025, Informe Técnico 2025.002 RTC
 */

export interface ClassificacaoTributariaProps {
  code: string;
}

export class ClassificacaoTributaria {
  private readonly _props: ClassificacaoTributariaProps;

  private constructor(props: ClassificacaoTributariaProps) {
    this._props = Object.freeze({ ...props });
  }

  get code(): string {
    return this._props.code;
  }

  get value(): string {
    return this._props.code;
  }

  /**
   * Primeiro dígito determina a categoria
   */
  get firstDigit(): number {
    return parseInt(this._props.code[0], 10);
  }

  /**
   * Faixa do código (ex: 10000-19999)
   */
  get rangeStart(): number {
    return this.firstDigit * 10000;
  }

  /**
   * É tributação integral?
   */
  get isTributacaoIntegral(): boolean {
    return this.firstDigit === 1;
  }

  /**
   * Tem alíquota reduzida?
   */
  get hasAliquotaReduzida(): boolean {
    return this.firstDigit === 2;
  }

  /**
   * É isento?
   */
  get isIsento(): boolean {
    return this.firstDigit === 3;
  }

  /**
   * Tem imunidade?
   */
  get hasImunidade(): boolean {
    return this.firstDigit === 4;
  }

  /**
   * Tem diferimento?
   */
  get hasDiferimento(): boolean {
    return this.firstDigit === 5;
  }

  /**
   * Tem suspensão?
   */
  get hasSuspensao(): boolean {
    return this.firstDigit === 6;
  }

  /**
   * É regime específico?
   */
  get isRegimeEspecifico(): boolean {
    return this.firstDigit === 7;
  }

  /**
   * Tem crédito presumido?
   */
  get hasCreditoPresumido(): boolean {
    return this.firstDigit === 8;
  }

  /**
   * É outros?
   */
  get isOutros(): boolean {
    return this.firstDigit === 9;
  }

  /**
   * Descrição da faixa
   */
  get rangeDescription(): string {
    const descriptions: Record<number, string> = {
      1: 'Tributação integral',
      2: 'Alíquota reduzida',
      3: 'Isenção',
      4: 'Imunidade',
      5: 'Diferimento',
      6: 'Suspensão',
      7: 'Regimes específicos',
      8: 'Crédito presumido',
      9: 'Outros',
    };
    return descriptions[this.firstDigit] ?? 'Desconhecido';
  }

  /**
   * Factory method
   */
  static create(code: string): Result<ClassificacaoTributaria, string> {
    // Remover formatação
    const cleanCode = code.replace(/\D/g, '');

    // Validar tamanho
    if (cleanCode.length !== 5) {
      return Result.fail(`cClassTrib must have 5 digits, got: ${code}`);
    }

    // Validar que é numérico
    const numericValue = parseInt(cleanCode, 10);
    if (isNaN(numericValue)) {
      return Result.fail(`cClassTrib must be numeric, got: ${code}`);
    }

    // Validar faixa (10000-99999)
    if (numericValue < 10000 || numericValue > 99999) {
      return Result.fail(`cClassTrib must be between 10000 and 99999, got: ${cleanCode}`);
    }

    return Result.ok(new ClassificacaoTributaria({ code: cleanCode }));
  }

  /**
   * Tributação integral padrão (10100)
   * 
   * ⚠️ S1.3: Agora retorna Result<ClassificacaoTributaria, string> ao invés de throw
   */
  static tributacaoIntegral(): Result<ClassificacaoTributaria, string> {
    return ClassificacaoTributaria.create('10100');
  }

  /**
   * Isenção padrão (30100)
   * 
   * ⚠️ S1.3: Agora retorna Result<ClassificacaoTributaria, string> ao invés de throw
   */
  static isencao(): Result<ClassificacaoTributaria, string> {
    return ClassificacaoTributaria.create('30100');
  }

  /**
   * Verifica igualdade
   */
  equals(other: ClassificacaoTributaria): boolean {
    return this._props.code === other.code;
  }
}

