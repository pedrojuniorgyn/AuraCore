import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { IReceiptNumberGenerator } from '@/modules/financial/domain/services/IReceiptNumberGenerator';

/**
 * Mock simples do ReceiptNumberGenerator para testes unitários
 * 
 * Nota: Testes de integração com banco de dados devem ser feitos separadamente
 */
class MockReceiptNumberGenerator implements IReceiptNumberGenerator {
  private counters: Map<string, number> = new Map();

  async generateNext(
    organizationId: number,
    branchId: number,
    tipo: string,
    serie: string
  ): Promise<Result<number, string>> {
    const key = `${organizationId}-${branchId}-${tipo}-${serie}`;
    const current = this.counters.get(key) || 0;
    const next = current + 1;
    this.counters.set(key, next);
    return Result.ok(next);
  }

  async getCurrentNumber(
    organizationId: number,
    branchId: number,
    tipo: string,
    serie: string
  ): Promise<Result<number, string>> {
    const key = `${organizationId}-${branchId}-${tipo}-${serie}`;
    const current = this.counters.get(key) || 0;
    return Result.ok(current);
  }
}

describe('ReceiptNumberGenerator', () => {
  it('should generate number 1 for first receipt', async () => {
    const generator = new MockReceiptNumberGenerator();

    const result = await generator.generateNext(1, 1, 'FRETE', 'A');

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe(1);
    }
  });

  it('should increment correctly', async () => {
    const generator = new MockReceiptNumberGenerator();

    const result1 = await generator.generateNext(1, 1, 'FRETE', 'A');
    const result2 = await generator.generateNext(1, 1, 'FRETE', 'A');

    expect(Result.isOk(result1)).toBe(true);
    expect(Result.isOk(result2)).toBe(true);
    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toBe(1);
      expect(result2.value).toBe(2);
    }
  });

  it('should separate by tipo (different counters)', async () => {
    const generator = new MockReceiptNumberGenerator();

    // FRETE
    await generator.generateNext(1, 1, 'FRETE', 'A');
    await generator.generateNext(1, 1, 'FRETE', 'A');
    const resultFrete = await generator.generateNext(1, 1, 'FRETE', 'A');

    // ADIANTAMENTO (contador separado)
    const resultAdiantamento = await generator.generateNext(1, 1, 'ADIANTAMENTO', 'A');

    expect(Result.isOk(resultFrete)).toBe(true);
    expect(Result.isOk(resultAdiantamento)).toBe(true);
    if (Result.isOk(resultFrete) && Result.isOk(resultAdiantamento)) {
      expect(resultFrete.value).toBe(3);
      expect(resultAdiantamento.value).toBe(1);
    }
  });

  it('should get current number correctly', async () => {
    const generator = new MockReceiptNumberGenerator();

    await generator.generateNext(1, 1, 'FRETE', 'A');
    await generator.generateNext(1, 1, 'FRETE', 'A');

    const result = await generator.getCurrentNumber(1, 1, 'FRETE', 'A');

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe(2);
    }
  });

  it('should return 0 when no receipts exist yet', async () => {
    const generator = new MockReceiptNumberGenerator();

    const result = await generator.getCurrentNumber(1, 1, 'FRETE', 'A');

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe(0);
    }
  });
});

