import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { TaxCalculationOrchestrator, CalculationInput } from '@/modules/fiscal/domain/services/TaxCalculationOrchestrator';

describe('TaxCalculationOrchestrator', () => {
  const orchestrator = new TaxCalculationOrchestrator();

  it('should calculate IBS/CBS for single item', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: CalculationInput = {
      itemId: crypto.randomUUID(),
      baseValue: baseValue.value,
      operationDate: new Date('2030-01-01'),
      cfop: '5102',
      ncm: '12345678',
      ufOrigem: 'SP',
      ufDestino: 'RJ',
    };

    const result = await orchestrator.calculate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.itemId).toBe(input.itemId);
    expect(result.value.regime).toBe('TRANSITION');
  });

  it('should calculate batch of items', async () => {
    const baseValue1 = Money.create(1000.00, 'BRL');
    const baseValue2 = Money.create(500.00, 'BRL');
    expect(Result.isFail(baseValue1)).toBe(false);
    expect(Result.isFail(baseValue2)).toBe(false);

    const inputs: CalculationInput[] = [
      {
        itemId: crypto.randomUUID(),
        baseValue: baseValue1.value,
        operationDate: new Date('2030-01-01'),
        cfop: '5102',
        ncm: '12345678',
        ufOrigem: 'SP',
        ufDestino: 'RJ',
      },
      {
        itemId: crypto.randomUUID(),
        baseValue: baseValue2.value,
        operationDate: new Date('2030-01-01'),
        cfop: '5102',
        ncm: '87654321',
        ufOrigem: 'SP',
        ufDestino: 'MG',
      },
    ];

    const result = await orchestrator.calculateBatch(inputs);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value).toHaveLength(2);
  });

  it('should accept zero base value', async () => {
    const baseValue = Money.create(0, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: CalculationInput = {
      itemId: crypto.randomUUID(),
      baseValue: baseValue.value,
      operationDate: new Date('2030-01-01'),
      cfop: '5102',
      ncm: '12345678',
      ufOrigem: 'SP',
      ufDestino: 'RJ',
    };

    const result = await orchestrator.calculate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.ibsUf.value.amount).toBe(0);
  });

  it('should return CURRENT regime for year 2025', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: CalculationInput = {
      itemId: crypto.randomUUID(),
      baseValue: baseValue.value,
      operationDate: new Date('2025-01-01'),
      cfop: '5102',
      ncm: '12345678',
      ufOrigem: 'SP',
      ufDestino: 'RJ',
    };

    const result = await orchestrator.calculate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.regime).toBe('CURRENT');
  });

  it('should return TRANSITION regime for year 2030', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: CalculationInput = {
      itemId: crypto.randomUUID(),
      baseValue: baseValue.value,
      operationDate: new Date('2030-06-15'),
      cfop: '5102',
      ncm: '12345678',
      ufOrigem: 'SP',
      ufDestino: 'RJ',
    };

    const result = await orchestrator.calculate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.regime).toBe('TRANSITION');
  });

  it('should return NEW regime for year 2033', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: CalculationInput = {
      itemId: crypto.randomUUID(),
      baseValue: baseValue.value,
      operationDate: new Date('2033-06-15'),
      cfop: '5102',
      ncm: '12345678',
      ufOrigem: 'SP',
      ufDestino: 'RJ',
    };

    const result = await orchestrator.calculate(input);

    expect(Result.isFail(result)).toBe(false);
    // TaxEngineType.NEW === 'NEW'
    expect(result.value.regime).toBe('NEW');
  });

  it('should preserve currency in calculation', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: CalculationInput = {
      itemId: crypto.randomUUID(),
      baseValue: baseValue.value,
      operationDate: new Date('2030-01-01'),
      cfop: '5102',
      ncm: '12345678',
      ufOrigem: 'SP',
      ufDestino: 'RJ',
    };

    const result = await orchestrator.calculate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.baseValue.currency).toBe('BRL');
    expect(result.value.ibsUf.value.currency).toBe('BRL');
    expect(result.value.ibsMun.value.currency).toBe('BRL');
    expect(result.value.cbs.value.currency).toBe('BRL');
  });

  it('should get regime info correctly', () => {
    const info2025 = orchestrator.getRegimeInfo(new Date('2025-06-15'));
    expect(info2025.regime).toBe('CURRENT');

    const info2030 = orchestrator.getRegimeInfo(new Date('2030-06-15'));
    expect(info2030.regime).toBe('TRANSITION');

    const info2033 = orchestrator.getRegimeInfo(new Date('2033-06-15'));
    // TaxEngineType.NEW === 'NEW'
    expect(info2033.regime).toBe('NEW');
  });
});

