import { describe, it, expect } from 'vitest';
import { Money } from '@/shared/domain';
import { GrupoIS, ISInfo } from '@/modules/fiscal/infrastructure/xml/builders/GrupoIS';

describe('GrupoIS', () => {
  it('should generate XML with all required fields', () => {
    const is: ISInfo = {
      cst: '00',
      baseValue: Money.create(1000, 'BRL').value,
      rate: 10,
      value: Money.create(100, 'BRL').value,
    };

    const xml = GrupoIS.build(is);

    expect(xml).toContain('<IS>');
    expect(xml).toContain('<CST>00</CST>');
    expect(xml).toContain('<vBC>1000.00</vBC>');
    expect(xml).toContain('<pIS>10.00</pIS>');
    expect(xml).toContain('<vIS>100.00</vIS>');
    expect(xml).toContain('</IS>');
  });

  it('should validate IS group successfully', () => {
    const is: ISInfo = {
      cst: '00',
      baseValue: Money.create(1000, 'BRL').value,
      rate: 10,
      value: Money.create(100, 'BRL').value,
    };

    const validation = GrupoIS.validate(is);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should accept zero base value (aligned with Domain)', () => {
    const is: ISInfo = {
      cst: '00',
      baseValue: Money.create(0, 'BRL').value,
      rate: 10,
      value: Money.create(0, 'BRL').value,
    };

    const validation = GrupoIS.validate(is);

    // Zero é válido conforme Domain (IBSCBSGroup permite zero)
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should fail validation when rate is out of range', () => {
    const is: ISInfo = {
      cst: '00',
      baseValue: Money.create(1000, 'BRL').value,
      rate: 150, // Acima de 100%
      value: Money.create(1500, 'BRL').value,
    };

    const validation = GrupoIS.validate(is);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Alíquota deve estar entre 0 e 100%'))).toBe(true);
  });

  it('should fail validation when calculated value does not match', () => {
    const is: ISInfo = {
      cst: '00',
      baseValue: Money.create(1000, 'BRL').value,
      rate: 10,
      value: Money.create(50, 'BRL').value, // Incorreto, deveria ser 100
    };

    const validation = GrupoIS.validate(is);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('não corresponde ao cálculo'))).toBe(true);
  });

  it('should handle decimal rates correctly', () => {
    const is: ISInfo = {
      cst: '00',
      baseValue: Money.create(1000, 'BRL').value,
      rate: 12.5, // 12.5%
      value: Money.create(125, 'BRL').value,
    };

    const xml = GrupoIS.build(is);

    expect(xml).toContain('<pIS>12.50</pIS>');
    expect(xml).toContain('<vIS>125.00</vIS>');
  });
});
