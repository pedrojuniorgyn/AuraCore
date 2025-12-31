import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { CalculateIbsCbsUseCase } from '@/modules/fiscal/application/use-cases/CalculateIbsCbsUseCase';
import { CalculateIbsCbsInput } from '@/modules/fiscal/application/dtos/CalculateIbsCbsDto';
import { ExecutionContext } from '@/modules/fiscal/application/use-cases/BaseUseCase';

describe('CalculateIbsCbsUseCase', () => {
  let useCase: CalculateIbsCbsUseCase;
  let ctx: ExecutionContext;

  beforeEach(() => {
    useCase = new CalculateIbsCbsUseCase();
    ctx = {
      userId: 'user-123',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  it('should calculate IBS/CBS for single item', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: crypto.randomUUID(),
      organizationId: 1,
      branchId: 1,
      operationDate: new Date('2030-01-01'),
      items: [
        {
          itemId: crypto.randomUUID(),
          baseValue: 1000.00,
          cfop: '5102',
          ncm: '12345678',
          ufOrigem: 'SP',
          ufDestino: 'RJ',
        },
      ],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.regime).toBe('TRANSITION');
    expect(result.value.items).toHaveLength(1);
    expect(result.value.totals.totalBaseValue.amount).toBe(1000.00);
  });

  it('should calculate IBS/CBS for multiple items', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: crypto.randomUUID(),
      organizationId: 1,
      branchId: 1,
      operationDate: new Date('2030-01-01'),
      items: [
        {
          itemId: crypto.randomUUID(),
          baseValue: 1000.00,
          cfop: '5102',
          ncm: '12345678',
          ufOrigem: 'SP',
          ufDestino: 'RJ',
        },
        {
          itemId: crypto.randomUUID(),
          baseValue: 500.00,
          cfop: '5102',
          ncm: '87654321',
          ufOrigem: 'SP',
          ufDestino: 'MG',
        },
      ],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.items).toHaveLength(2);
    expect(result.value.totals.totalBaseValue.amount).toBe(1500.00);
  });

  it('should fail validation when fiscalDocumentId is invalid', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: 'invalid-uuid',
      organizationId: 1,
      branchId: 1,
      operationDate: new Date('2030-01-01'),
      items: [],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Validation failed');
  });

  it('should fail validation when organizationId is negative', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: crypto.randomUUID(),
      organizationId: -1,
      branchId: 1,
      operationDate: new Date('2030-01-01'),
      items: [],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Validation failed');
  });

  it('should fail validation when items array is empty', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: crypto.randomUUID(),
      organizationId: 1,
      branchId: 1,
      operationDate: new Date('2030-01-01'),
      items: [],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Validation failed');
  });

  it('should fail when organizationId mismatch', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: crypto.randomUUID(),
      organizationId: 999, // Different from ctx.organizationId
      branchId: 1,
      operationDate: new Date('2030-01-01'),
      items: [
        {
          itemId: crypto.randomUUID(),
          baseValue: 1000.00,
          cfop: '5102',
          ncm: '12345678',
          ufOrigem: 'SP',
          ufDestino: 'RJ',
        },
      ],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Access denied');
  });

  it('should fail when branchId mismatch', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: crypto.randomUUID(),
      organizationId: 1,
      branchId: 999, // Different from ctx.branchId
      operationDate: new Date('2030-01-01'),
      items: [
        {
          itemId: crypto.randomUUID(),
          baseValue: 1000.00,
          cfop: '5102',
          ncm: '12345678',
          ufOrigem: 'SP',
          ufDestino: 'RJ',
        },
      ],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Access denied');
  });

  it('should calculate with TRANSITION regime for year 2030', async () => {
    const input: CalculateIbsCbsInput = {
      fiscalDocumentId: crypto.randomUUID(),
      organizationId: 1,
      branchId: 1,
      operationDate: new Date('2030-06-15'),
      items: [
        {
          itemId: crypto.randomUUID(),
          baseValue: 1000.00,
          cfop: '5102',
          ncm: '12345678',
          ufOrigem: 'SP',
          ufDestino: 'RJ',
        },
      ],
    };

    const result = await useCase.execute(input, ctx);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.regime).toBe('TRANSITION');
  });
});

