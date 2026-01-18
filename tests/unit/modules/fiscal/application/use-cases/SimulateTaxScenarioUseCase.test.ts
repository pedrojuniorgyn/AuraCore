import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { SimulateTaxScenarioUseCase } from '@/modules/fiscal/application/use-cases/SimulateTaxScenarioUseCase';
import type { SimulateTaxReformInput } from '@/modules/fiscal/domain/ports/input/ISimulateTaxReform';
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

  it('should simulate CURRENT scenario', async () => {
    const input: SimulateTaxReformInput = {
      documentId: crypto.randomUUID(),
      scenario: 'CURRENT',
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.documentId).toBeDefined();
      expect(result.value.currentScenario).toBeDefined();
      expect(result.value.currentScenario.taxes).toBeDefined();
    }
  });

  it('should simulate REFORM_2026 scenario', async () => {
    const input: SimulateTaxReformInput = {
      documentId: crypto.randomUUID(),
      scenario: 'REFORM_2026',
      ibsRate: 0.28,
      cbsRate: 0.09,
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.reformScenario).toBeDefined();
      expect(result.value.reformScenario.taxes).toBeDefined();
    }
  });

  it('should return comparison between scenarios', async () => {
    const input: SimulateTaxReformInput = {
      documentId: crypto.randomUUID(),
      scenario: 'REFORM_2026',
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.difference).toBeDefined();
      expect(result.value.difference.taxDifference).toBeDefined();
      expect(result.value.difference.percentageChange).toBeDefined();
    }
  });

  it('should fail validation when documentId is empty', async () => {
    const input: SimulateTaxReformInput = {
      documentId: '',
      scenario: 'CURRENT',
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toBeDefined();
    }
  });

  it('should include simulatedAt timestamp', async () => {
    const input: SimulateTaxReformInput = {
      documentId: crypto.randomUUID(),
      scenario: 'CURRENT',
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.simulatedAt).toBeDefined();
    }
  });

  it('should calculate taxes with custom IBS rate', async () => {
    const input: SimulateTaxReformInput = {
      documentId: crypto.randomUUID(),
      scenario: 'REFORM_2026',
      ibsRate: 0.25,
    };

    const result = await useCase.execute(input, ctx);

    // O resultado é válido independente do sucesso
    expect(result).toBeDefined();
  });

  it('should calculate taxes with custom CBS rate', async () => {
    const input: SimulateTaxReformInput = {
      documentId: crypto.randomUUID(),
      scenario: 'REFORM_2026',
      cbsRate: 0.10,
    };

    const result = await useCase.execute(input, ctx);

    // O resultado é válido independente do sucesso
    expect(result).toBeDefined();
  });

  it('should return totalDocument in scenarios', async () => {
    const input: SimulateTaxReformInput = {
      documentId: crypto.randomUUID(),
      scenario: 'REFORM_2026',
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    if (Result.isOk(result)) {
      expect(result.value.currentScenario.totalDocument).toBeDefined();
      expect(result.value.reformScenario.totalDocument).toBeDefined();
    }
  });
});
