import { describe, it, expect } from 'vitest';
import { Strategy } from '@/modules/strategic/domain/entities/Strategy';
import { Result } from '@/shared/domain';

describe('Strategy Entity - Versioning', () => {
  const validProps = {
    organizationId: 1,
    branchId: 1,
    name: 'Estratégia 2026',
    vision: 'Ser líder de mercado',
    mission: 'Entregar valor',
    values: ['Qualidade', 'Inovação'],
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    createdBy: 'user-123',
  };

  describe('createVersion()', () => {
    it('should create BUDGET version from ACTUAL', () => {
      const strategyResult = Strategy.create(validProps);
      expect(Result.isOk(strategyResult)).toBe(true);

      if (Result.isOk(strategyResult)) {
        const versionResult = strategyResult.value.createVersion('BUDGET', 'Orçamento 2026', 'user-456');

        expect(Result.isOk(versionResult)).toBe(true);
        if (Result.isOk(versionResult)) {
          expect(versionResult.value.versionType).toBe('BUDGET');
          expect(versionResult.value.versionName).toBe('Orçamento 2026');
          expect(versionResult.value.parentStrategyId).toBe(strategyResult.value.id);
          expect(versionResult.value.isLocked).toBe(false);
        }
      }
    });

    it('should fail to create version from non-ACTUAL strategy', () => {
      const strategyResult = Strategy.create(validProps);
      if (Result.isOk(strategyResult)) {
        const budgetResult = strategyResult.value.createVersion('BUDGET', 'Budget', 'user');

        if (Result.isOk(budgetResult)) {
          // Tentar criar versão a partir do BUDGET
          const subVersionResult = budgetResult.value.createVersion('FORECAST', 'Forecast', 'user');
          expect(Result.isFail(subVersionResult)).toBe(true);
        }
      }
    });
  });

  describe('lock() / unlock()', () => {
    it('should lock BUDGET version', () => {
      const strategyResult = Strategy.create(validProps);
      if (Result.isOk(strategyResult)) {
        const budgetResult = strategyResult.value.createVersion('BUDGET', 'Budget', 'user');

        if (Result.isOk(budgetResult)) {
          const lockResult = budgetResult.value.lock('user-456');

          expect(Result.isOk(lockResult)).toBe(true);
          expect(budgetResult.value.isLocked).toBe(true);
          expect(budgetResult.value.lockedBy).toBe('user-456');
        }
      }
    });

    it('should fail to lock ACTUAL version', () => {
      const strategyResult = Strategy.create(validProps);
      if (Result.isOk(strategyResult)) {
        const lockResult = strategyResult.value.lock('user');
        expect(Result.isFail(lockResult)).toBe(true);
      }
    });

    it('should unlock locked version', () => {
      const strategyResult = Strategy.create(validProps);
      if (Result.isOk(strategyResult)) {
        const budgetResult = strategyResult.value.createVersion('BUDGET', 'Budget', 'user');

        if (Result.isOk(budgetResult)) {
          budgetResult.value.lock('user');
          const unlockResult = budgetResult.value.unlock();

          expect(Result.isOk(unlockResult)).toBe(true);
          expect(budgetResult.value.isLocked).toBe(false);
        }
      }
    });
  });

  describe('isEditable', () => {
    it('should be editable when not locked and not archived', () => {
      const strategyResult = Strategy.create(validProps);
      if (Result.isOk(strategyResult)) {
        const budgetResult = strategyResult.value.createVersion('BUDGET', 'Budget', 'user');

        if (Result.isOk(budgetResult)) {
          expect(budgetResult.value.isEditable).toBe(true);
        }
      }
    });

    it('should not be editable when locked', () => {
      const strategyResult = Strategy.create(validProps);
      if (Result.isOk(strategyResult)) {
        const budgetResult = strategyResult.value.createVersion('BUDGET', 'Budget', 'user');

        if (Result.isOk(budgetResult)) {
          budgetResult.value.lock('user');
          expect(budgetResult.value.isEditable).toBe(false);
        }
      }
    });
  });
});
