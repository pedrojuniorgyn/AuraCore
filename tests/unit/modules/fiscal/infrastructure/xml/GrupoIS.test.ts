import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { GrupoIS } from '@/modules/fiscal/infrastructure/xml/builders/GrupoIS';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects/Aliquota';

describe('GrupoIS XML Builder', () => {
  describe('build', () => {
    it('should generate valid XML for IS group', () => {
      const baseResult = Money.create(1000, 'BRL');
      const aliquotaResult = Aliquota.fromPercentage(1.5);
      const valorISResult = Money.create(15, 'BRL');

      expect(Result.isOk(baseResult)).toBe(true);
      expect(Result.isOk(aliquotaResult)).toBe(true);
      expect(Result.isOk(valorISResult)).toBe(true);

      const xml = GrupoIS.build({
        baseCalculo: (baseResult as { value: Money }).value,
        aliquota: (aliquotaResult as { value: Aliquota }).value,
        valorIS: (valorISResult as { value: Money }).value,
        ncm: '22030000',
        categoria: 'Bebidas Alcoólicas',
      });

      expect(xml).toContain('<IS>');
      expect(xml).toContain('<NCM>22030000</NCM>');
      expect(xml).toContain('<catProd>Bebidas Alcoólicas</catProd>');
      expect(xml).toContain('<vBCIS>1000.00</vBCIS>');
      expect(xml).toContain('<pIS>1.50</pIS>');
      expect(xml).toContain('<vIS>15.00</vIS>');
      expect(xml).toContain('</IS>');
    });

    it('should escape special XML characters in category', () => {
      const baseResult = Money.create(1000, 'BRL');
      const aliquotaResult = Aliquota.fromPercentage(1.5);
      const valorISResult = Money.create(15, 'BRL');

      const xml = GrupoIS.build({
        baseCalculo: (baseResult as { value: Money }).value,
        aliquota: (aliquotaResult as { value: Aliquota }).value,
        valorIS: (valorISResult as { value: Money }).value,
        ncm: '22030000',
        categoria: 'Bebidas & Similares <Teste>',
      });

      expect(xml).toContain('<catProd>Bebidas &amp; Similares &lt;Teste&gt;</catProd>');
    });
  });

  describe('validate', () => {
    it('should validate valid IS params', () => {
      const baseResult = Money.create(1000, 'BRL');
      const aliquotaResult = Aliquota.fromPercentage(1.5);
      const valorISResult = Money.create(15, 'BRL');

      const validation = GrupoIS.validate({
        baseCalculo: (baseResult as { value: Money }).value,
        aliquota: (aliquotaResult as { value: Aliquota }).value,
        valorIS: (valorISResult as { value: Money }).value,
        ncm: '22030000',
        categoria: 'Bebidas Alcoólicas',
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation with empty NCM', () => {
      const baseResult = Money.create(1000, 'BRL');
      const aliquotaResult = Aliquota.fromPercentage(1.5);
      const valorISResult = Money.create(15, 'BRL');

      const validation = GrupoIS.validate({
        baseCalculo: (baseResult as { value: Money }).value,
        aliquota: (aliquotaResult as { value: Aliquota }).value,
        valorIS: (valorISResult as { value: Money }).value,
        ncm: '',
        categoria: 'Bebidas Alcoólicas',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('NCM');
    });

    it('should fail validation with invalid NCM length', () => {
      const baseResult = Money.create(1000, 'BRL');
      const aliquotaResult = Aliquota.fromPercentage(1.5);
      const valorISResult = Money.create(15, 'BRL');

      const validation = GrupoIS.validate({
        baseCalculo: (baseResult as { value: Money }).value,
        aliquota: (aliquotaResult as { value: Aliquota }).value,
        valorIS: (valorISResult as { value: Money }).value,
        ncm: '2203',
        categoria: 'Bebidas Alcoólicas',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('8 dígitos'))).toBe(true);
    });

    it('should fail validation with empty category', () => {
      const baseResult = Money.create(1000, 'BRL');
      const aliquotaResult = Aliquota.fromPercentage(1.5);
      const valorISResult = Money.create(15, 'BRL');

      const validation = GrupoIS.validate({
        baseCalculo: (baseResult as { value: Money }).value,
        aliquota: (aliquotaResult as { value: Aliquota }).value,
        valorIS: (valorISResult as { value: Money }).value,
        ncm: '22030000',
        categoria: '',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Categoria'))).toBe(true);
    });
  });

  describe('isSubjectToIS', () => {
    it('should return true for alcoholic beverages NCM', () => {
      expect(GrupoIS.isSubjectToIS('22030000')).toBe(true);
      expect(GrupoIS.isSubjectToIS('22040000')).toBe(true);
      expect(GrupoIS.isSubjectToIS('22080000')).toBe(true);
    });

    it('should return true for cigarettes NCM', () => {
      expect(GrupoIS.isSubjectToIS('24020000')).toBe(true);
      expect(GrupoIS.isSubjectToIS('24030000')).toBe(true);
    });

    it('should return true for vehicles NCM', () => {
      expect(GrupoIS.isSubjectToIS('87030000')).toBe(true);
      expect(GrupoIS.isSubjectToIS('87110000')).toBe(true);
    });

    it('should return false for non-IS NCM', () => {
      expect(GrupoIS.isSubjectToIS('84714100')).toBe(false);
      expect(GrupoIS.isSubjectToIS('39269090')).toBe(false);
    });
  });
});

