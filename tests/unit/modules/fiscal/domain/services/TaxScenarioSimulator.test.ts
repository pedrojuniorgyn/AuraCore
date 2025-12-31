import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { TaxScenarioSimulator, SimulateInput } from '@/modules/fiscal/domain/services/TaxScenarioSimulator';

describe('TaxScenarioSimulator', () => {
  const simulator = new TaxScenarioSimulator();

  it('should simulate single year successfully', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.scenarios).toHaveLength(1);
    expect(result.value.scenarios[0].year).toBe(2030);
  });

  it('should simulate multiple years successfully', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2029, 2030, 2031],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.scenarios).toHaveLength(3);
  });

  it('should calculate summary correctly', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.summary.currentSystemTotal).toBeDefined();
    expect(result.value.summary.newSystemTotal).toBeDefined();
    expect(result.value.summary.difference).toBeDefined();
    expect(result.value.summary.percentageChange).toBeDefined();
  });

  it('should fail when years array is empty', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('At least one year must be provided');
  });

  it('should fail when base value is zero', async () => {
    const baseValue = Money.create(0, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Base value must be positive');
  });

  it('should accept zero base value but simulator should fail', async () => {
    const baseValue = Money.create(0, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await simulator.simulate(input);

    // Simulator rejeita base value zero (precisa ser positivo para simulação)
    expect(Result.isFail(result)).toBe(true);
    expect(result.error).toContain('Base value must be positive');
  });

  it('should return TRANSITION regime for year 2030', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.scenarios[0].regime).toBe('TRANSITION');
  });

  it('should return NEW regime for year 2033', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2033],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.scenarios[0].regime).toBe('NEW');
  });

  it('should preserve currency across scenarios', async () => {
    const baseValue = Money.create(1000.00, 'BRL');
    expect(Result.isFail(baseValue)).toBe(false);

    const input: SimulateInput = {
      baseValue: baseValue.value,
      ufOrigem: 'SP',
      ufDestino: 'RJ',
      years: [2030],
    };

    const result = await simulator.simulate(input);

    expect(Result.isFail(result)).toBe(false);
    expect(result.value.scenarios[0].currentSystemTaxes.icms.currency).toBe('BRL');
    expect(result.value.scenarios[0].newSystemTaxes.ibsUf.currency).toBe('BRL');
    expect(result.value.summary.currentSystemTotal.currency).toBe('BRL');
  });
});

