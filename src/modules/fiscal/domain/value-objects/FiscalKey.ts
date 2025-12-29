import { Result } from '@/shared/domain';
import { InvalidFiscalKeyError } from '../errors/FiscalErrors';

/**
 * Value Object: Chave de Acesso Fiscal (44 dígitos)
 * 
 * Estrutura (NFe/CTe/MDFe):
 * - Posições 01-02: cUF (código IBGE da UF)
 * - Posições 03-06: AAMM (ano e mês de emissão)
 * - Posições 07-20: CNPJ do emitente
 * - Posições 21-22: mod (modelo do documento)
 * - Posições 23-25: série
 * - Posições 26-34: número do documento
 * - Posições 35-35: tpEmis (tipo de emissão)
 * - Posições 36-43: código numérico
 * - Posição 44: dígito verificador
 */
export interface FiscalKeyProps {
  key: string;
}

export interface FiscalKeyParts {
  uf: string;
  yearMonth: string;
  cnpj: string;
  model: string;
  series: string;
  number: string;
  emissionType: string;
  numericCode: string;
  checkDigit: string;
}

export class FiscalKey {
  private readonly _props: FiscalKeyProps;

  private constructor(props: FiscalKeyProps) {
    this._props = Object.freeze({ ...props });
  }

  get value(): string {
    return this._props.key;
  }

  /**
   * Retorna partes da chave
   */
  get parts(): FiscalKeyParts {
    const key = this._props.key;
    return {
      uf: key.substring(0, 2),
      yearMonth: key.substring(2, 6),
      cnpj: key.substring(6, 20),
      model: key.substring(20, 22),
      series: key.substring(22, 25),
      number: key.substring(25, 34),
      emissionType: key.substring(34, 35),
      numericCode: key.substring(35, 43),
      checkDigit: key.substring(43, 44),
    };
  }

  /**
   * Formata para exibição (grupos de 4)
   */
  get formatted(): string {
    return this._props.key.replace(/(\d{4})/g, '$1 ').trim();
  }

  /**
   * Código da UF
   */
  get ufCode(): string {
    return this.parts.uf;
  }

  /**
   * CNPJ do emitente
   */
  get cnpj(): string {
    return this.parts.cnpj;
  }

  /**
   * Número do documento
   */
  get documentNumber(): string {
    return this.parts.number;
  }

  /**
   * Série do documento
   */
  get series(): string {
    return this.parts.series;
  }

  /**
   * Factory method
   */
  static create(key: string): Result<FiscalKey, string> {
    // Remover formatação
    const cleanKey = key.replace(/\D/g, '');

    // Validar tamanho
    if (cleanKey.length !== 44) {
      return Result.fail(
        new InvalidFiscalKeyError(key, 'Key must have exactly 44 digits').message
      );
    }

    // Validar dígito verificador
    if (!FiscalKey.validateCheckDigit(cleanKey)) {
      return Result.fail(
        new InvalidFiscalKeyError(key, 'Invalid check digit').message
      );
    }

    return Result.ok(new FiscalKey({ key: cleanKey }));
  }

  /**
   * Gera chave fiscal
   */
  static generate(params: {
    ufCode: string;
    yearMonth: string;
    cnpj: string;
    model: string;
    series: string;
    number: string;
    emissionType: string;
    numericCode: string;
  }): Result<FiscalKey, string> {
    // Construir chave sem dígito verificador
    const keyWithoutDV = [
      params.ufCode.padStart(2, '0'),
      params.yearMonth.padStart(4, '0'),
      params.cnpj.padStart(14, '0'),
      params.model.padStart(2, '0'),
      params.series.padStart(3, '0'),
      params.number.padStart(9, '0'),
      params.emissionType.padStart(1, '0'),
      params.numericCode.padStart(8, '0'),
    ].join('');

    if (keyWithoutDV.length !== 43) {
      return Result.fail('Invalid key components');
    }

    // Calcular dígito verificador
    const checkDigit = FiscalKey.calculateCheckDigit(keyWithoutDV);
    const fullKey = keyWithoutDV + checkDigit;

    return FiscalKey.create(fullKey);
  }

  /**
   * Calcula dígito verificador (Módulo 11)
   */
  private static calculateCheckDigit(keyWithoutDV: string): string {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    let weightIndex = 0;

    // Percorrer da direita para esquerda
    for (let i = keyWithoutDV.length - 1; i >= 0; i--) {
      sum += parseInt(keyWithoutDV[i], 10) * weights[weightIndex];
      weightIndex = (weightIndex + 1) % weights.length;
    }

    const remainder = sum % 11;
    const digit = remainder < 2 ? 0 : 11 - remainder;

    return digit.toString();
  }

  /**
   * Valida dígito verificador
   */
  private static validateCheckDigit(key: string): boolean {
    const keyWithoutDV = key.substring(0, 43);
    const providedDV = key.substring(43, 44);
    const calculatedDV = FiscalKey.calculateCheckDigit(keyWithoutDV);

    return providedDV === calculatedDV;
  }

  /**
   * Verifica igualdade
   */
  equals(other: FiscalKey): boolean {
    return this._props.key === other.value;
  }
}

