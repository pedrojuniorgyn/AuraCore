import { describe, it, expect } from 'vitest';
import { GrupoCompraGov, GovernmentPurchaseData } from '@/modules/fiscal/infrastructure/xml/builders/GrupoCompraGov';

describe('GrupoCompraGov', () => {
  it('should generate XML for federal government (União)', () => {
    const data: GovernmentPurchaseData = {
      entityType: GrupoCompraGov.ENTITY_TYPES.FEDERAL,
    };

    const xml = GrupoCompraGov.build(data);

    expect(xml).toContain('<compraGov>');
    expect(xml).toContain('<tpEnteGov>1</tpEnteGov>');
    expect(xml).toContain('</compraGov>');
    expect(xml).not.toContain('<UFEnteGov>');
    expect(xml).not.toContain('<cMunEnteGov>');
  });

  it('should generate XML for state government with UF', () => {
    const data: GovernmentPurchaseData = {
      entityType: GrupoCompraGov.ENTITY_TYPES.STATE,
      uf: 'SP',
    };

    const xml = GrupoCompraGov.build(data);

    expect(xml).toContain('<compraGov>');
    expect(xml).toContain('<tpEnteGov>2</tpEnteGov>');
    expect(xml).toContain('<UFEnteGov>SP</UFEnteGov>');
    expect(xml).toContain('</compraGov>');
  });

  it('should generate XML for municipal government with UF and municipality code', () => {
    const data: GovernmentPurchaseData = {
      entityType: GrupoCompraGov.ENTITY_TYPES.MUNICIPAL,
      uf: 'SP',
      municipalityCode: '3550308',
    };

    const xml = GrupoCompraGov.build(data);

    expect(xml).toContain('<compraGov>');
    expect(xml).toContain('<tpEnteGov>3</tpEnteGov>');
    expect(xml).toContain('<UFEnteGov>SP</UFEnteGov>');
    expect(xml).toContain('<cMunEnteGov>3550308</cMunEnteGov>');
    expect(xml).toContain('</compraGov>');
  });

  it('should validate federal government successfully', () => {
    const data: GovernmentPurchaseData = {
      entityType: 1,
    };

    const validation = GrupoCompraGov.validate(data);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should fail validation for state without UF', () => {
    const data: GovernmentPurchaseData = {
      entityType: 2,
      // UF missing
    };

    const validation = GrupoCompraGov.validate(data);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('UF é obrigatória'))).toBe(true);
  });

  it('should fail validation for municipality without municipality code', () => {
    const data: GovernmentPurchaseData = {
      entityType: 3,
      uf: 'SP',
      // municipalityCode missing
    };

    const validation = GrupoCompraGov.validate(data);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Código do município é obrigatório'))).toBe(true);
  });

  it('should fail validation with invalid entity type', () => {
    const data = {
      entityType: 4 as 1, // Cast para contornar validação de tipo
    };

    const validation = GrupoCompraGov.validate(data as GovernmentPurchaseData);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Tipo de ente governamental deve ser'))).toBe(true);
  });

  it('should return correct entity type descriptions', () => {
    expect(GrupoCompraGov.getEntityTypeDescription(1)).toBe('União Federal');
    expect(GrupoCompraGov.getEntityTypeDescription(2)).toBe('Estado ou Distrito Federal');
    expect(GrupoCompraGov.getEntityTypeDescription(3)).toBe('Município');
  });

  it('should fail validation when UF has incorrect length', () => {
    const data: GovernmentPurchaseData = {
      entityType: 2,
      uf: 'SAO', // 3 letras, deveria ser 2
    };

    const validation = GrupoCompraGov.validate(data);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('2 letras'))).toBe(true);
  });
});
