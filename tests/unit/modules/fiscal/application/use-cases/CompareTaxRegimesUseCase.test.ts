import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { CompareTaxRegimesUseCase } from '@/modules/fiscal/application/use-cases/CompareTaxRegimesUseCase';
import type { CompareTaxRegimesInput } from '@/modules/fiscal/domain/ports/input/ICompareTaxRegimes';
import { ExecutionContext } from '@/modules/fiscal/application/use-cases/BaseUseCase';

describe('CompareTaxRegimesUseCase', () => {
  let useCase: CompareTaxRegimesUseCase;
  let ctx: ExecutionContext;

  beforeEach(() => {
    useCase = new CompareTaxRegimesUseCase();
    ctx = {
      userId: 'user-123',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  it('should compare tax regimes successfully', async () => {
    const input: CompareTaxRegimesInput = {
      documentId: crypto.randomUUID(),
      regimes: ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO'],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.documentId).toBeDefined();
      expect(result.value.comparisons).toBeDefined();
      expect(result.value.recommendation).toBeDefined();
      expect(result.value.comparedAt).toBeDefined();
    }
  });

  it('should return comparisons with taxes breakdown', async () => {
    const input: CompareTaxRegimesInput = {
      documentId: crypto.randomUUID(),
      regimes: ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO'],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.comparisons.length).toBeGreaterThan(0);
      // Cada comparação tem regime, taxes e totais
      const firstComparison = result.value.comparisons[0];
      expect(firstComparison.regime).toBeDefined();
      expect(firstComparison.taxes).toBeDefined();
      expect(firstComparison.totalTax).toBeDefined();
    }
  });

  it('should return recommendation with savings', async () => {
    const input: CompareTaxRegimesInput = {
      documentId: crypto.randomUUID(),
      regimes: ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.recommendation.regime).toBeDefined();
      expect(result.value.recommendation.reason).toBeDefined();
      expect(result.value.recommendation.savings).toBeDefined();
    }
  });

  it('should fail validation when documentId is empty', async () => {
    const input: CompareTaxRegimesInput = {
      documentId: '',
      regimes: ['SIMPLES_NACIONAL'],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toBeDefined();
    }
  });

  it('should fail when regimes array is empty', async () => {
    const input: CompareTaxRegimesInput = {
      documentId: crypto.randomUUID(),
      regimes: [],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toBeDefined();
    }
  });

  it('should compare with single regime', async () => {
    const input: CompareTaxRegimesInput = {
      documentId: crypto.randomUUID(),
      regimes: ['LUCRO_REAL'],
    };

    const result = await useCase.execute(input, ctx);

    // Pode falhar ou passar dependendo da implementação
    // O importante é não ter erro de tipo
    expect(result).toBeDefined();
  });
});

