import { Result } from '@/shared/domain';

/**
 * StockQuantity: Quantidade em estoque com unidade de medida
 * 
 * E7.8 WMS - Semana 1
 * 
 * Validações:
 * - Não negativo para estoque disponível (default)
 * - Pode ser negativo para reservas/backorders (allowNegative = true)
 * - Precisão de 3 casas decimais (para fracionados)
 * - Unidade de medida obrigatória (UN, KG, L, M, etc.)
 * 
 * Padrão: Value Object imutável com validação no create()
 */

/**
 * Unidades de medida suportadas
 */
export enum UnitOfMeasure {
  UNIT = 'UN',          // Unidade
  KILOGRAM = 'KG',      // Quilograma
  GRAM = 'G',           // Grama
  LITER = 'L',          // Litro
  MILLILITER = 'ML',    // Mililitro
  METER = 'M',          // Metro
  CENTIMETER = 'CM',    // Centímetro
  SQUARE_METER = 'M2',  // Metro quadrado
  CUBIC_METER = 'M3',   // Metro cúbico
  BOX = 'CX',           // Caixa
  PACKAGE = 'PCT',      // Pacote
  PALLET = 'PAL',       // Palete
}

/**
 * Verifica se uma string é uma unidade de medida válida
 */
export function isValidUnitOfMeasure(unit: string): unit is UnitOfMeasure {
  return Object.values(UnitOfMeasure).includes(unit as UnitOfMeasure);
}

interface StockQuantityProps {
  value: number;
  unit: UnitOfMeasure;
}

export class StockQuantity {
  private constructor(private readonly props: StockQuantityProps) {
    Object.freeze(this);
  }

  private static readonly PRECISION = 3;

  /**
   * Cria uma nova StockQuantity validando o valor
   * 
   * @param value Valor da quantidade
   * @param unit Unidade de medida
   * @param allowNegative Permite valores negativos (para reservas/backorders)
   * @returns Result<StockQuantity, string>
   */
  static create(
    value: number,
    unit: UnitOfMeasure,
    allowNegative: boolean = false
  ): Result<StockQuantity, string> {
    // Validação: número válido
    if (!Number.isFinite(value)) {
      return Result.fail('Quantity must be a valid number');
    }

    // Validação: não negativo (se não permitido)
    if (!allowNegative && value < 0) {
      return Result.fail('Quantity cannot be negative');
    }

    // Validação: unidade obrigatória
    if (!unit) {
      return Result.fail('Unit of measure is required');
    }

    // Validação: unidade válida
    if (!isValidUnitOfMeasure(unit)) {
      return Result.fail(`Invalid unit of measure: ${unit}`);
    }

    // Arredondar para precisão definida
    const rounded = this.round(value);

    return Result.ok<StockQuantity>(new StockQuantity({ value: rounded, unit }));
  }

  /**
   * Reconstitui StockQuantity sem validação (para carregar do banco)
   */
  static reconstitute(value: number, unit: UnitOfMeasure): Result<StockQuantity, string> {
    // Validação mínima de enum no reconstitute (BUG-INFRA-015)
    if (!isValidUnitOfMeasure(unit)) {
      return Result.fail(`Invalid unit of measure: ${unit}`);
    }
    
    return Result.ok<StockQuantity>(new StockQuantity({ value, unit }));
  }

  /**
   * Cria uma StockQuantity zero
   */
  static zero(unit: UnitOfMeasure): Result<StockQuantity, string> {
    return this.create(0, unit);
  }

  /**
   * Arredonda valor para precisão definida
   */
  private static round(value: number): number {
    const multiplier = Math.pow(10, this.PRECISION);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Valor da quantidade
   */
  get value(): number {
    return this.props.value;
  }

  /**
   * Unidade de medida
   */
  get unit(): UnitOfMeasure {
    return this.props.unit;
  }

  /**
   * Verifica se a quantidade é zero
   */
  isZero(): boolean {
    return this.props.value === 0;
  }

  /**
   * Verifica se a quantidade é positiva
   */
  isPositive(): boolean {
    return this.props.value > 0;
  }

  /**
   * Verifica se a quantidade é negativa
   */
  isNegative(): boolean {
    return this.props.value < 0;
  }

  /**
   * Soma duas quantidades (mesma unidade)
   * 
   * @param other Outra quantidade
   * @returns Result<StockQuantity, string>
   */
  add(other: StockQuantity): Result<StockQuantity, string> {
    if (this.props.unit !== other.unit) {
      return Result.fail(
        `Cannot add quantities with different units: ${this.props.unit} and ${other.unit}`
      );
    }

    return StockQuantity.create(this.props.value + other.value, this.props.unit, true);
  }

  /**
   * Subtrai duas quantidades (mesma unidade)
   * 
   * @param other Outra quantidade
   * @returns Result<StockQuantity, string>
   */
  subtract(other: StockQuantity): Result<StockQuantity, string> {
    if (this.props.unit !== other.unit) {
      return Result.fail(
        `Cannot subtract quantities with different units: ${this.props.unit} and ${other.unit}`
      );
    }

    return StockQuantity.create(this.props.value - other.value, this.props.unit, true);
  }

  /**
   * Multiplica quantidade por um fator
   * 
   * @param factor Fator de multiplicação
   * @returns Result<StockQuantity, string>
   */
  multiply(factor: number): Result<StockQuantity, string> {
    if (!Number.isFinite(factor)) {
      return Result.fail('Factor must be a valid number');
    }

    return StockQuantity.create(this.props.value * factor, this.props.unit, true);
  }

  /**
   * Compara se esta quantidade é maior que outra
   * 
   * ⚠️ S1.3: Agora retorna Result<boolean, string> para lidar com unidades diferentes
   * 
   * @param other Outra quantidade
   * @returns Result com true se esta quantidade é maior
   */
  isGreaterThan(other: StockQuantity): Result<boolean, string> {
    const assertResult = this.assertSameUnit(other);
    if (Result.isFail(assertResult)) {
      return Result.fail(assertResult.error);
    }
    return Result.ok(this.props.value > other.value);
  }

  /**
   * Compara se esta quantidade é menor que outra
   * 
   * ⚠️ S1.3: Agora retorna Result<boolean, string> para lidar com unidades diferentes
   * 
   * @param other Outra quantidade
   * @returns Result com true se esta quantidade é menor
   */
  isLessThan(other: StockQuantity): Result<boolean, string> {
    const assertResult = this.assertSameUnit(other);
    if (Result.isFail(assertResult)) {
      return Result.fail(assertResult.error);
    }
    return Result.ok(this.props.value < other.value);
  }

  /**
   * Compara se esta quantidade é maior ou igual a outra
   * 
   * ⚠️ S1.3: Agora retorna Result<boolean, string> para lidar com unidades diferentes
   * 
   * @param other Outra quantidade
   * @returns Result com true se esta quantidade é maior ou igual
   */
  isGreaterThanOrEqual(other: StockQuantity): Result<boolean, string> {
    const assertResult = this.assertSameUnit(other);
    if (Result.isFail(assertResult)) {
      return Result.fail(assertResult.error);
    }
    return Result.ok(this.props.value >= other.value);
  }

  /**
   * Garante que duas quantidades têm a mesma unidade
   * 
   * ⚠️ S1.3: Agora retorna Result<void, string> ao invés de throw (DOMAIN-SVC-004)
   */
  private assertSameUnit(other: StockQuantity): Result<void, string> {
    if (this.props.unit !== other.unit) {
      return Result.fail(
        `Cannot compare quantities with different units: ${this.props.unit} and ${other.unit}`
      );
    }
    return Result.ok(undefined);
  }

  /**
   * Igualdade baseada no valor e unidade
   */
  equals(other: StockQuantity): boolean {
    if (!other) return false;
    return this.props.value === other.value && this.props.unit === other.unit;
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.props.value.toFixed(StockQuantity.PRECISION)} ${this.props.unit}`;
  }
}

