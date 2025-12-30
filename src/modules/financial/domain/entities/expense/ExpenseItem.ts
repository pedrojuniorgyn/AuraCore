import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ExpenseCategory, isValidExpenseCategory } from '../../value-objects/expense/ExpenseCategory';

/**
 * Tipo de comprovante
 */
export type ComprovanteType = 'NF' | 'CUPOM' | 'RECIBO' | 'OUTRO';

/**
 * Props do ExpenseItem
 */
export interface ExpenseItemProps {
  id: string;
  expenseReportId: string;
  
  categoria: ExpenseCategory;
  data: Date;
  descricao: string;
  
  valor: Money;
  
  comprovanteType?: ComprovanteType;
  comprovanteNumero?: string;
  comprovanteUrl?: string;
  
  dentroPolitica: boolean;
  motivoViolacao?: string;
}

/**
 * Entity: Item de Despesa
 * 
 * Representa uma despesa individual dentro de um relatório.
 * Cada item possui categoria, valor, data e comprovante.
 */
export class ExpenseItem {
  private constructor(private readonly _props: ExpenseItemProps) {}

  // Getters
  get id(): string {
    return this._props.id;
  }

  get expenseReportId(): string {
    return this._props.expenseReportId;
  }

  get categoria(): ExpenseCategory {
    return this._props.categoria;
  }

  get data(): Date {
    return this._props.data;
  }

  get descricao(): string {
    return this._props.descricao;
  }

  get valor(): Money {
    return this._props.valor;
  }

  get comprovanteType(): ComprovanteType | undefined {
    return this._props.comprovanteType;
  }

  get comprovanteNumero(): string | undefined {
    return this._props.comprovanteNumero;
  }

  get comprovanteUrl(): string | undefined {
    return this._props.comprovanteUrl;
  }

  get dentroPolitica(): boolean {
    return this._props.dentroPolitica;
  }

  get motivoViolacao(): string | undefined {
    return this._props.motivoViolacao;
  }

  /**
   * Cria um novo item de despesa
   */
  static create(
    props: Omit<ExpenseItemProps, 'dentroPolitica'>
  ): Result<ExpenseItem, string> {
    // Validações
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Item ID is required');
    }

    if (!props.expenseReportId || props.expenseReportId.trim() === '') {
      return Result.fail('Expense Report ID is required');
    }

    if (!isValidExpenseCategory(props.categoria)) {
      return Result.fail(`Invalid categoria: ${props.categoria}`);
    }

    if (!props.descricao || props.descricao.trim() === '') {
      return Result.fail('Descrição is required');
    }

    if (props.valor.amount <= 0) {
      return Result.fail('Valor must be greater than 0');
    }

    const item = new ExpenseItem({
      ...props,
      dentroPolitica: true, // Default, será validado pela política
    });

    return Result.ok(item);
  }

  /**
   * Reconstitui item do banco
   */
  static reconstitute(props: ExpenseItemProps): Result<ExpenseItem, string> {
    if (!props.id || props.id.trim() === '') {
      return Result.fail('ExpenseItem id is required for reconstitution');
    }

    if (!props.expenseReportId || props.expenseReportId.trim() === '') {
      return Result.fail('ExpenseItem expenseReportId is required for reconstitution');
    }

    if (!isValidExpenseCategory(props.categoria)) {
      return Result.fail(`Invalid categoria: ${props.categoria}`);
    }

    const item = new ExpenseItem(props);
    return Result.ok(item);
  }

  /**
   * Marca como violação de política
   */
  markAsViolation(motivoViolacao: string): ExpenseItem {
    return new ExpenseItem({
      ...this._props,
      dentroPolitica: false,
      motivoViolacao,
    });
  }

  /**
   * Marca como dentro da política
   */
  markAsCompliant(): ExpenseItem {
    return new ExpenseItem({
      ...this._props,
      dentroPolitica: true,
      motivoViolacao: undefined,
    });
  }

  /**
   * Atualiza URL do comprovante
   */
  attachReceipt(url: string, type: ComprovanteType, numero?: string): ExpenseItem {
    return new ExpenseItem({
      ...this._props,
      comprovanteUrl: url,
      comprovanteType: type,
      comprovanteNumero: numero,
    });
  }
}

