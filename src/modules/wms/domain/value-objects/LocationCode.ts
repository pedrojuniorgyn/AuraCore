import { Result } from '@/shared/domain';

/**
 * LocationCode: Código de localização no armazém
 * 
 * E7.8 WMS - Semana 1
 * 
 * Formato: ARMAZEM-CORREDOR-PRATELEIRA-POSICAO
 * Exemplo: "ARM01-A-03-12"
 * 
 * Validações:
 * - Formato válido (regex)
 * - Máximo 20 caracteres
 * - Apenas alfanumérico + hífen
 * 
 * Padrão: Value Object imutável com validação no create()
 */

interface LocationCodeProps {
  value: string;
}

export class LocationCode {
  private constructor(private readonly props: LocationCodeProps) {
    Object.freeze(this);
  }

  /**
   * Regex para validar formato do código de localização
   * Permite alfanuméricos e hífen, mínimo 3 caracteres
   */
  private static readonly CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
  
  private static readonly MAX_LENGTH = 20;

  /**
   * Cria um novo LocationCode validando o formato
   * 
   * @param value Código da localização
   * @returns Result<LocationCode, string>
   */
  static create(value: string): Result<LocationCode, string> {
    // Validação: não vazio
    if (!value || value.trim().length === 0) {
      return Result.fail('Location code cannot be empty');
    }

    // Normalizar: uppercase e trim
    const normalized = value.trim().toUpperCase();

    // Validação: tamanho máximo
    if (normalized.length > this.MAX_LENGTH) {
      return Result.fail(`Location code cannot exceed ${this.MAX_LENGTH} characters`);
    }

    // Validação: formato (alfanumérico + hífen)
    if (!this.CODE_REGEX.test(normalized)) {
      return Result.fail(
        'Location code must contain only alphanumeric characters and hyphens (e.g., ARM01-A-03-12)'
      );
    }

    return Result.ok<LocationCode>(new LocationCode({ value: normalized }));
  }

  /**
   * Reconstitui LocationCode sem validação (para carregar do banco)
   * 
   * @param value Código da localização
   * @returns Result<LocationCode, string>
   */
  static reconstitute(value: string): Result<LocationCode, string> {
    return Result.ok<LocationCode>(new LocationCode({ value }));
  }

  /**
   * Valor do código de localização
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Extrai parte do armazém (primeira parte antes do hífen)
   * Ex: "ARM01-A-03-12" → "ARM01"
   */
  get warehouse(): string {
    return this.props.value.split('-')[0];
  }

  /**
   * Extrai parte do corredor (segunda parte)
   * Ex: "ARM01-A-03-12" → "A"
   */
  get aisle(): string | undefined {
    const parts = this.props.value.split('-');
    return parts[1];
  }

  /**
   * Extrai parte da prateleira (terceira parte)
   * Ex: "ARM01-A-03-12" → "03"
   */
  get shelf(): string | undefined {
    const parts = this.props.value.split('-');
    return parts[2];
  }

  /**
   * Extrai parte da posição (quarta parte)
   * Ex: "ARM01-A-03-12" → "12"
   */
  get position(): string | undefined {
    const parts = this.props.value.split('-');
    return parts[3];
  }

  /**
   * Retorna o nível hierárquico do código
   * 1 = armazém, 2 = corredor, 3 = prateleira, 4 = posição
   */
  get level(): number {
    return this.props.value.split('-').length;
  }

  /**
   * Verifica se este código é pai de outro código
   * Ex: "ARM01" é pai de "ARM01-A"
   * 
   * @param other Outro LocationCode
   * @returns true se este código é pai do outro
   */
  isParentOf(other: LocationCode): boolean {
    return other.value.startsWith(this.props.value + '-');
  }

  /**
   * Verifica se este código é filho de outro código
   * 
   * @param other Outro LocationCode
   * @returns true se este código é filho do outro
   */
  isChildOf(other: LocationCode): boolean {
    return this.props.value.startsWith(other.value + '-');
  }

  /**
   * Igualdade baseada no valor
   */
  equals(other: LocationCode): boolean {
    if (!other) return false;
    return this.props.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.props.value;
  }
}

