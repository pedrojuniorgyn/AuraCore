import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { SimulateTaxScenarioUseCase } from '@/modules/fiscal/application/use-cases/SimulateTaxScenarioUseCase';
import { SimulateTaxScenarioInput } from '@/modules/fiscal/application/dtos/SimulateTaxScenarioDto';
import { ExecutionContext } from '@/modules/fiscal/application/use-cases/BaseUseCase';

describe('SimulateTaxScenarioUseCase', () => {
  let useCase: SimulateTaxScenarioUseCase;
  let ctx: ExecutionContext;

  beforeEach(() => {
    useCase = new SimulateTaxScenarioUseCase();
    ctx = {
      userId: 'user-123',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  it('should simulate scenarios for single year', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: 1,
      branchId: 1,
      baseValue: 1000.00,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.scenarios).toHaveLength(1);
    expect(result.value.scenarios[0].year).toBe(2030);
    expect(result.value.scenarios[0].regime).toBe('TRANSITION');
  });

  it('should simulate scenarios for multiple years', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: 1,
      branchId: 1,
      baseValue: 1000.00,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2029, 2030, 2031, 2032, 2033],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.scenarios).toHaveLength(5);
    expect(result.value.comparison.currentSystemTotal).toBeDefined();
    expect(result.value.comparison.newSystemTotal).toBeDefined();
  });

  it('should calculate comparison correctly', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: 1,
      branchId: 1,
      baseValue: 1000.00,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.comparison.difference).toBeDefined();
    expect(result.value.comparison.percentageChange).toBeDefined();
    expect(typeof result.value.comparison.percentageChange).toBe('number');
  });

  it('should fail validation when organizationId is negative', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: -1,
      branchId: 1,
      baseValue: 1000.00,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Validation failed');
  });

  it('should fail validation when baseValue is zero or negative', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: 1,
      branchId: 1,
      baseValue: 0,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Validation failed');
  });

  it('should fail validation when years array is empty', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: 1,
      branchId: 1,
      baseValue: 1000.00,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Validation failed');
  });

  it('should fail when organizationId mismatch', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: 999,
      branchId: 1,
      baseValue: 1000.00,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Access denied');
  });

  it('should fail when branchId mismatch', async () => {
    const input: SimulateTaxScenarioInput = {
      organizationId: 1,
      branchId: 999,
      baseValue: 1000.00,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Access denied');
  });
});

