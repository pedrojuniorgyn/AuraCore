import { Result } from '@/shared/domain';
import { InvalidCFOPError } from '../errors/FiscalErrors';

/**
 * Value Object: CFOP (Código Fiscal de Operações e Prestações)
 * 
 * Estrutura: X.YZZ
 * - X: Tipo de operação (1-7)
 * - Y: Grupo (0-9)
 * - ZZ: Operação específica (00-99)
 * 
 * Primeiro dígito:
 * - 1: Entrada estadual
 * - 2: Entrada interestadual
 * - 3: Entrada exterior
 * - 5: Saída estadual
 * - 6: Saída interestadual
 * - 7: Saída exterior
 */
export interface CFOPProps {
  code: string;
  description: string;
}

export class CFOP {
  private readonly _props: CFOPProps;

  private constructor(props: CFOPProps) {
    this._props = Object.freeze({ ...props });
  }

  get code(): string {
    return this._props.code;
  }

  get description(): string {
    return this._props.description;
  }

  /**
   * Primeiro dígito determina tipo de operação
   */
  get firstDigit(): number {
    return parseInt(this._props.code[0], 10);
  }

  /**
   * É operação de entrada?
   */
  get isEntry(): boolean {
    return [1, 2, 3].includes(this.firstDigit);
  }

  /**
   * É operação de saída?
   */
  get isExit(): boolean {
    return [5, 6, 7].includes(this.firstDigit);
  }

  /**
   * É operação estadual?
   */
  get isIntrastate(): boolean {
    return [1, 5].includes(this.firstDigit);
  }

  /**
   * É operação interestadual?
   */
  get isInterstate(): boolean {
    return [2, 6].includes(this.firstDigit);
  }

  /**
   * É operação com exterior?
   */
  get isForeign(): boolean {
    return [3, 7].includes(this.firstDigit);
  }

  /**
   * Código formatado (X.YZZ)
   */
  get formatted(): string {
    const code = this._props.code;
    return `${code[0]}.${code.slice(1)}`;
  }

  /**
   * Factory method
   */
  static create(code: string, description?: string): Result<CFOP, string> {
    // Remover formatação
    const cleanCode = code.replace(/\D/g, '');

    // Validar tamanho
    if (cleanCode.length !== 4) {
      return Result.fail(
        new InvalidCFOPError(code, 'CFOP must have 4 digits').message
      );
    }

    // Validar primeiro dígito
    const firstDigit = parseInt(cleanCode[0], 10);
    if (![1, 2, 3, 5, 6, 7].includes(firstDigit)) {
      return Result.fail(
        new InvalidCFOPError(code, 'First digit must be 1, 2, 3, 5, 6, or 7').message
      );
    }

    // Descrição padrão se não fornecida
    const desc = description ?? CFOP.getDefaultDescription(cleanCode);

    return Result.ok(new CFOP({
      code: cleanCode,
      description: desc,
    }));
  }

  /**
   * Descrições padrão para CFOPs comuns
   */
  private static getDefaultDescription(code: string): string {
    const descriptions: Record<string, string> = {
      '5102': 'Venda de mercadoria adquirida',
      '5405': 'Venda de mercadoria adquirida - ST',
      '5949': 'Outra saída de mercadoria não especificada',
      '6102': 'Venda interestadual',
      '6405': 'Venda interestadual - ST',
      '1102': 'Compra para comercialização',
      '2102': 'Compra interestadual para comercialização',
      '5353': 'Prestação de serviço de transporte',
      '6353': 'Prestação de serviço de transporte interestadual',
    };

    return descriptions[code] ?? `CFOP ${code}`;
  }

  /**
   * Verifica igualdade
   */
  equals(other: CFOP): boolean {
    return this._props.code === other.code;
  }
}

