import { Result } from '@/shared/domain';

/**
 * Value Object: Categoria de Despesa
 * 
 * Representa as categorias permitidas para despesas corporativas.
 * Cada categoria pode ter limites e políticas específicas.
 */
export type ExpenseCategory =
  | 'TRANSPORTE_AEREO'
  | 'TRANSPORTE_TERRESTRE'
  | 'TRANSPORTE_APLICATIVO'
  | 'HOSPEDAGEM'
  | 'ALIMENTACAO'
  | 'COMBUSTIVEL'
  | 'ESTACIONAMENTO'
  | 'PEDAGIO'
  | 'COMUNICACAO'
  | 'MATERIAL'
  | 'OUTROS';

/**
 * Lista de todas as categorias válidas
 */
export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'TRANSPORTE_AEREO',
  'TRANSPORTE_TERRESTRE',
  'TRANSPORTE_APLICATIVO',
  'HOSPEDAGEM',
  'ALIMENTACAO',
  'COMBUSTIVEL',
  'ESTACIONAMENTO',
  'PEDAGIO',
  'COMUNICACAO',
  'MATERIAL',
  'OUTROS',
] as const;

/**
 * Descrições das categorias
 */
export const EXPENSE_CATEGORY_DESCRIPTIONS: Record<ExpenseCategory, string> = {
  TRANSPORTE_AEREO: 'Transporte Aéreo (passagens, taxas aeroportuárias)',
  TRANSPORTE_TERRESTRE: 'Transporte Terrestre (ônibus, trem, metrô)',
  TRANSPORTE_APLICATIVO: 'Transporte por Aplicativo (Uber, 99, etc)',
  HOSPEDAGEM: 'Hospedagem (hotel, pousada, Airbnb)',
  ALIMENTACAO: 'Alimentação (refeições durante atividade)',
  COMBUSTIVEL: 'Combustível (abastecimento de veículo)',
  ESTACIONAMENTO: 'Estacionamento',
  PEDAGIO: 'Pedágio',
  COMUNICACAO: 'Comunicação (telefone, internet)',
  MATERIAL: 'Material de Escritório/Trabalho',
  OUTROS: 'Outras Despesas',
};

/**
 * Verifica se um valor é uma categoria válida
 */
export function isValidExpenseCategory(category: string): category is ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory);
}

/**
 * Cria um Value Object de categoria
 */
export function createExpenseCategory(category: string): Result<ExpenseCategory, string> {
  if (!isValidExpenseCategory(category)) {
    return Result.fail(
      `Invalid expense category: ${category}. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
    );
  }
  
  return Result.ok(category);
}

/**
 * Obtém a descrição de uma categoria
 */
export function getExpenseCategoryDescription(category: ExpenseCategory): string {
  return EXPENSE_CATEGORY_DESCRIPTIONS[category];
}

