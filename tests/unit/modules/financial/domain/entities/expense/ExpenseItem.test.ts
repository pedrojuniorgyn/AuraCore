import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ExpenseItem } from '@/modules/financial/domain/entities/expense/ExpenseItem';

describe('ExpenseItem', () => {
  const createValidProps = () => ({
    id: 'item-1',
    expenseReportId: 'report-1',
    categoria: 'ALIMENTACAO' as const,
    data: new Date(),
    descricao: 'Almoço executivo',
    valor: Money.create(80, 'BRL').value,
  });

  describe('create', () => {
    it('should create valid item', () => {
      const result = ExpenseItem.create(createValidProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.dentroPolitica).toBe(true);
      }
    });

    it('should fail without id', () => {
      const props = createValidProps();
      props.id = '';

      const result = ExpenseItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Item ID is required');
      }
    });

    it('should fail without expenseReportId', () => {
      const props = createValidProps();
      props.expenseReportId = '';

      const result = ExpenseItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Expense Report ID is required');
      }
    });

    it('should fail with invalid categoria', () => {
      const props = createValidProps();
      (props as any).categoria = 'INVALID';

      const result = ExpenseItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Invalid categoria');
      }
    });

    it('should fail without descricao', () => {
      const props = createValidProps();
      props.descricao = '';

      const result = ExpenseItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Descrição is required');
      }
    });

    it('should fail if valor <= 0', () => {
      const props = createValidProps();
      props.valor = Money.create(0, 'BRL').value;

      const result = ExpenseItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Valor must be greater than 0');
      }
    });
  });

  describe('markAsViolation', () => {
    it('should mark item as violation', () => {
      const itemResult = ExpenseItem.create(createValidProps());
      if (Result.isFail(itemResult)) return;

      const item = itemResult.value;
      const violated = item.markAsViolation('Excede limite da categoria');

      expect(violated.dentroPolitica).toBe(false);
      expect(violated.motivoViolacao).toBe('Excede limite da categoria');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from persistence', () => {
      const props = {
        ...createValidProps(),
        dentroPolitica: true,
      };

      const result = ExpenseItem.reconstitute(props);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('item-1');
      }
    });

    it('should fail with invalid categoria on reconstitute', () => {
      const props = {
        ...createValidProps(),
        categoria: 'INVALID' as any,
        dentroPolitica: true,
      };

      const result = ExpenseItem.reconstitute(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Invalid categoria');
      }
    });
  });
});

