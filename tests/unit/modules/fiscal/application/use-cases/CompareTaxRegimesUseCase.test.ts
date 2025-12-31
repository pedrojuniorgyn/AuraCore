import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { CompareTaxRegimesUseCase } from '@/modules/fiscal/application/use-cases/CompareTaxRegimesUseCase';
import { CompareTaxRegimesInput } from '@/modules/fiscal/application/dtos/CompareTaxRegimesDto';
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
      organizationId: 1,
      branchId: 1,
      fiscalDocumentId: crypto.randomUUID(),
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.currentRegime).toBeDefined();
    expect(result.value.newRegime).toBeDefined();
    expect(result.value.difference).toBeDefined();
    expect(result.value.percentageChange).toBeDefined();
    expect(result.value.recommendation).toBeDefined();
  });

  it('should return current regime with ICMS, PIS, COFINS', async () => {
    const input: CompareTaxRegimesInput = {
      organizationId: 1,
      branchId: 1,
      fiscalDocumentId: crypto.randomUUID(),
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.currentRegime.icms).toBeDefined();
    expect(result.value.currentRegime.pis).toBeDefined();
    expect(result.value.currentRegime.cofins).toBeDefined();
    expect(result.value.currentRegime.total).toBeDefined();
  });

  it('should return new regime with IBS UF, IBS Mun, CBS', async () => {
    const input: CompareTaxRegimesInput = {
      organizationId: 1,
      branchId: 1,
      fiscalDocumentId: crypto.randomUUID(),
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.newRegime.ibsUf).toBeDefined();
    expect(result.value.newRegime.ibsMun).toBeDefined();
    expect(result.value.newRegime.cbs).toBeDefined();
    expect(result.value.newRegime.total).toBeDefined();
  });

  it('should fail validation when fiscalDocumentId is invalid', async () => {
    const input: CompareTaxRegimesInput = {
      organizationId: 1,
      branchId: 1,
      fiscalDocumentId: 'invalid-uuid',
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Validation failed');
  });

  it('should fail when organizationId mismatch', async () => {
    const input: CompareTaxRegimesInput = {
      organizationId: 999,
      branchId: 1,
      fiscalDocumentId: crypto.randomUUID(),
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Access denied');
  });

  it('should fail when branchId mismatch', async () => {
    const input: CompareTaxRegimesInput = {
      organizationId: 1,
      branchId: 999,
      fiscalDocumentId: crypto.randomUUID(),
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Access denied');
  });
});

