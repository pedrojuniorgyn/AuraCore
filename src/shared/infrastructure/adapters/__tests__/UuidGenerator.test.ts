import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoUuidGenerator } from '../CryptoUuidGenerator';
import { DeterministicUuidGenerator } from '../DeterministicUuidGenerator';

describe('CryptoUuidGenerator', () => {
  let generator: CryptoUuidGenerator;

  beforeEach(() => {
    generator = new CryptoUuidGenerator();
  });

  it('deve gerar UUID com formato v4 válido', () => {
    const uuid = generator.generate();
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidV4Regex);
  });

  it('deve ter comprimento de 36 caracteres', () => {
    const uuid = generator.generate();
    expect(uuid.length).toBe(36);
  });

  it('deve gerar UUIDs únicos', () => {
    const uuid1 = generator.generate();
    const uuid2 = generator.generate();
    expect(uuid1).not.toBe(uuid2);
  });

  it('deve gerar múltiplos UUIDs únicos', () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      uuids.add(generator.generate());
    }
    expect(uuids.size).toBe(1000);
  });
});

describe('DeterministicUuidGenerator', () => {
  let generator: DeterministicUuidGenerator;

  beforeEach(() => {
    generator = new DeterministicUuidGenerator();
  });

  it('deve gerar UUID com formato v4 válido', () => {
    const uuid = generator.generate();
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidV4Regex);
  });

  it('deve ter comprimento de 36 caracteres', () => {
    const uuid = generator.generate();
    expect(uuid.length).toBe(36);
  });

  it('deve gerar UUIDs sequenciais em hex', () => {
    expect(generator.generate()).toBe('00000001-0000-4000-8000-000000000000');
    expect(generator.generate()).toBe('00000002-0000-4000-8000-000000000000');
    expect(generator.generate()).toBe('00000003-0000-4000-8000-000000000000');
  });

  it('deve resetar contador', () => {
    generator.generate(); // 1
    generator.generate(); // 2
    generator.reset();
    expect(generator.generate()).toBe('00000001-0000-4000-8000-000000000000');
  });

  it('peekNext deve prever próximo UUID sem incrementar', () => {
    const next = generator.peekNext();
    const actual = generator.generate();
    expect(next).toBe(actual);
  });

  it('deve suportar contadores grandes em hex', () => {
    generator.reset();
    for (let i = 0; i < 255; i++) {
      generator.generate();
    }
    // 256 em decimal = 100 em hex
    expect(generator.generate()).toBe('00000100-0000-4000-8000-000000000000');
  });

  it('deve gerar UUID com todos os segmentos corretos', () => {
    const uuid = generator.generate();
    const segments = uuid.split('-');
    
    expect(segments).toHaveLength(5);
    expect(segments[0].length).toBe(8); // xxxxxxxx
    expect(segments[1].length).toBe(4); // xxxx
    expect(segments[2].length).toBe(4); // 4xxx (versão 4)
    expect(segments[3].length).toBe(4); // yxxx (variante)
    expect(segments[4].length).toBe(12); // xxxxxxxxxxxx
    
    // Verificar versão 4
    expect(segments[2][0]).toBe('4');
    
    // Verificar variante (primeiro caractere deve ser 8, 9, a, ou b)
    expect(['8', '9', 'a', 'b']).toContain(segments[3][0]);
  });

  it('deve gerar UUIDs determinísticos após reset', () => {
    const firstBatch = [
      generator.generate(),
      generator.generate(),
      generator.generate(),
    ];

    generator.reset();

    const secondBatch = [
      generator.generate(),
      generator.generate(),
      generator.generate(),
    ];

    expect(firstBatch).toEqual(secondBatch);
  });
});

