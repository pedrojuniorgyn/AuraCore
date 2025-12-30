import { describe, it, expect } from 'vitest';
import { GrupoCompraGov } from '@/modules/fiscal/infrastructure/xml/builders/GrupoCompraGov';

describe('GrupoCompraGov XML Builder', () => {
  describe('build', () => {
    it('should generate valid XML for government purchase', () => {
      const xml = GrupoCompraGov.build({
        entityType: 2,
        reductionRate: 20.5,
      });

      expect(xml).toContain('<compraGov>');
      expect(xml).toContain('<tpEnte>2</tpEnte>');
      expect(xml).toContain('<pReducao>20.50</pReducao>');
      expect(xml).toContain('</compraGov>');
    });

    it('should format decimal with 2 places', () => {
      const xml = GrupoCompraGov.build({
        entityType: 1,
        reductionRate: 15,
      });

      expect(xml).toContain('<pReducao>15.00</pReducao>');
    });
  });

  describe('validate', () => {
    it('should validate valid government purchase params', () => {
      const validation = GrupoCompraGov.validate({
        entityType: 2,
        reductionRate: 20.5,
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation with invalid entity type (too low)', () => {
      const validation = GrupoCompraGov.validate({
        entityType: 0,
        reductionRate: 20,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Tipo de ente'))).toBe(true);
    });

    it('should fail validation with invalid entity type (too high)', () => {
      const validation = GrupoCompraGov.validate({
        entityType: 4,
        reductionRate: 20,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Tipo de ente'))).toBe(true);
    });

    it('should fail validation with negative reduction rate', () => {
      const validation = GrupoCompraGov.validate({
        entityType: 2,
        reductionRate: -10,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('entre 0 e 100'))).toBe(true);
    });

    it('should fail validation with reduction rate > 100', () => {
      const validation = GrupoCompraGov.validate({
        entityType: 2,
        reductionRate: 101,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('entre 0 e 100'))).toBe(true);
    });
  });

  describe('getEntityTypeName', () => {
    it('should return correct names for entity types', () => {
      expect(GrupoCompraGov.getEntityTypeName(1)).toBe('Federal');
      expect(GrupoCompraGov.getEntityTypeName(2)).toBe('Estadual/DF');
      expect(GrupoCompraGov.getEntityTypeName(3)).toBe('Municipal');
      expect(GrupoCompraGov.getEntityTypeName(99)).toBe('Desconhecido');
    });
  });

  describe('calculateReduction', () => {
    it('should calculate reduction correctly', () => {
      const reduction = GrupoCompraGov.calculateReduction(1000, 20);
      expect(reduction).toBe(200);
    });

    it('should handle 0% reduction', () => {
      const reduction = GrupoCompraGov.calculateReduction(1000, 0);
      expect(reduction).toBe(0);
    });

    it('should handle 100% reduction', () => {
      const reduction = GrupoCompraGov.calculateReduction(1000, 100);
      expect(reduction).toBe(1000);
    });

    it('should throw error for negative rate', () => {
      expect(() => GrupoCompraGov.calculateReduction(1000, -10)).toThrow();
    });

    it('should throw error for rate > 100', () => {
      expect(() => GrupoCompraGov.calculateReduction(1000, 101)).toThrow();
    });
  });

  describe('applyReduction', () => {
    it('should apply reduction correctly', () => {
      const finalValue = GrupoCompraGov.applyReduction(1000, 20);
      expect(finalValue).toBe(800);
    });

    it('should handle 0% reduction', () => {
      const finalValue = GrupoCompraGov.applyReduction(1000, 0);
      expect(finalValue).toBe(1000);
    });

    it('should handle 100% reduction', () => {
      const finalValue = GrupoCompraGov.applyReduction(1000, 100);
      expect(finalValue).toBe(0);
    });
  });
});

