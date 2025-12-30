import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { GrupoIBSCBS } from '@/modules/fiscal/infrastructure/xml/builders/GrupoIBSCBS';
import { IBSCBSGroup } from '@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup';
import { CSTIbsCbs } from '@/modules/fiscal/domain/tax/value-objects/CSTIbsCbs';
import { ClassificacaoTributaria } from '@/modules/fiscal/domain/tax/value-objects/ClassificacaoTributaria';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';

describe('GrupoIBSCBS XML Builder', () => {
  describe('build', () => {
    it('should generate valid XML for basic IBS/CBS group', () => {
      const cstResult = CSTIbsCbs.create('00');
      const cClassTribResult = ClassificacaoTributaria.create('12345');
      const baseMoneyResult = Money.create(1000, 'BRL');
      const ibsUfRateResult = AliquotaIBS.fromPercentage(17.7);
      const ibsMunRateResult = AliquotaIBS.fromPercentage(0);
      const cbsRateResult = AliquotaCBS.fromPercentage(8.8);

      const ibsUfMoneyResult = Money.create(177, 'BRL');
      const ibsMunMoneyResult = Money.create(0, 'BRL');
      const cbsMoneyResult = Money.create(88, 'BRL');

      expect(Result.isOk(cstResult)).toBe(true);
      expect(Result.isOk(cClassTribResult)).toBe(true);
      expect(Result.isOk(baseMoneyResult)).toBe(true);
      expect(Result.isOk(ibsUfRateResult)).toBe(true);
      expect(Result.isOk(ibsMunRateResult)).toBe(true);
      expect(Result.isOk(cbsRateResult)).toBe(true);
      expect(Result.isOk(ibsUfMoneyResult)).toBe(true);
      expect(Result.isOk(ibsMunMoneyResult)).toBe(true);
      expect(Result.isOk(cbsMoneyResult)).toBe(true);

      const groupResult = IBSCBSGroup.create({
        cst: (cstResult as { value: CSTIbsCbs }).value,
        classificationCode: (cClassTribResult as { value: ClassificacaoTributaria }).value,
        baseValue: (baseMoneyResult as { value: Money }).value,
        ibsUfRate: (ibsUfRateResult as { value: AliquotaIBS }).value,
        ibsUfValue: (ibsUfMoneyResult as { value: Money }).value,
        ibsMunRate: (ibsMunRateResult as { value: AliquotaIBS }).value,
        ibsMunValue: (ibsMunMoneyResult as { value: Money }).value,
        cbsRate: (cbsRateResult as { value: AliquotaCBS }).value,
        cbsValue: (cbsMoneyResult as { value: Money }).value,
      });

      expect(Result.isOk(groupResult)).toBe(true);
      const group = (groupResult as { value: IBSCBSGroup }).value;

      const xml = GrupoIBSCBS.build(group);

      expect(xml).toContain('<IBSCBS>');
      expect(xml).toContain('<CST>00</CST>');
      expect(xml).toContain('<cClassTrib>12345</cClassTrib>');
      expect(xml).toContain('<vBC>1000.00</vBC>');
      expect(xml).toContain('<pIBSUF>17.70</pIBSUF>');
      expect(xml).toContain('<vIBSUF>177.00</vIBSUF>');
      expect(xml).toContain('<pIBSMun>0.00</pIBSMun>');
      expect(xml).toContain('<vIBSMun>0.00</vIBSMun>');
      expect(xml).toContain('<pCBS>8.80</pCBS>');
      expect(xml).toContain('<vCBS>88.00</vCBS>');
      expect(xml).toContain('</IBSCBS>');
    });

    it('should include optional deferral fields when present', () => {
      const cstResult = CSTIbsCbs.create('50');
      const cClassTribResult = ClassificacaoTributaria.create('12345');
      const baseMoneyResult = Money.create(1000, 'BRL');
      const ibsUfRateResult = AliquotaIBS.fromPercentage(17.7);
      const ibsMunRateResult = AliquotaIBS.fromPercentage(0);
      const cbsRateResult = AliquotaCBS.fromPercentage(8.8);

      const ibsUfMoneyResult = Money.create(177, 'BRL');
      const ibsMunMoneyResult = Money.create(0, 'BRL');
      const cbsMoneyResult = Money.create(88, 'BRL');

      const deferralIbsResult = Money.create(53.1, 'BRL');
      const deferralCbsResult = Money.create(26.4, 'BRL');

      expect(Result.isOk(cstResult)).toBe(true);
      expect(Result.isOk(cClassTribResult)).toBe(true);
      expect(Result.isOk(baseMoneyResult)).toBe(true);
      expect(Result.isOk(ibsUfRateResult)).toBe(true);
      expect(Result.isOk(ibsMunRateResult)).toBe(true);
      expect(Result.isOk(cbsRateResult)).toBe(true);
      expect(Result.isOk(ibsUfMoneyResult)).toBe(true);
      expect(Result.isOk(ibsMunMoneyResult)).toBe(true);
      expect(Result.isOk(cbsMoneyResult)).toBe(true);
      expect(Result.isOk(deferralIbsResult)).toBe(true);
      expect(Result.isOk(deferralCbsResult)).toBe(true);

      const groupResult = IBSCBSGroup.create({
        cst: (cstResult as { value: CSTIbsCbs }).value,
        classificationCode: (cClassTribResult as { value: ClassificacaoTributaria }).value,
        baseValue: (baseMoneyResult as { value: Money }).value,
        ibsUfRate: (ibsUfRateResult as { value: AliquotaIBS }).value,
        ibsUfValue: (ibsUfMoneyResult as { value: Money }).value,
        ibsMunRate: (ibsMunRateResult as { value: AliquotaIBS }).value,
        ibsMunValue: (ibsMunMoneyResult as { value: Money }).value,
        cbsRate: (cbsRateResult as { value: AliquotaCBS }).value,
        cbsValue: (cbsMoneyResult as { value: Money }).value,
        deferral: {
          deferralRate: 30,
          ibsDeferredValue: (deferralIbsResult as { value: Money }).value,
          cbsDeferredValue: (deferralCbsResult as { value: Money }).value,
        },
      });

      if (Result.isFail(groupResult)) {
        throw new Error(`IBSCBSGroup creation failed: ${groupResult.error}`);
      }
      expect(Result.isOk(groupResult)).toBe(true);
      const group = (groupResult as { value: IBSCBSGroup }).value;

      const xml = GrupoIBSCBS.build(group);

      expect(xml).toContain('<pDiferimento>30.00</pDiferimento>');
      expect(xml).toContain('<vDiferimentoIBS>53.10</vDiferimentoIBS>');
      expect(xml).toContain('<vDiferimentoCBS>26.40</vDiferimentoCBS>');
    });

    it('should include government purchase fields when present', () => {
      const cstResult = CSTIbsCbs.create('00');
      const cClassTribResult = ClassificacaoTributaria.create('12345');
      const baseMoneyResult = Money.create(1000, 'BRL');
      const ibsUfRateResult = AliquotaIBS.fromPercentage(17.7);
      const ibsMunRateResult = AliquotaIBS.fromPercentage(0);
      const cbsRateResult = AliquotaCBS.fromPercentage(8.8);

      const ibsUfMoneyResult = Money.create(177, 'BRL');
      const ibsMunMoneyResult = Money.create(0, 'BRL');
      const cbsMoneyResult = Money.create(88, 'BRL');

      const groupResult = IBSCBSGroup.create({
        cst: (cstResult as { value: CSTIbsCbs }).value,
        classificationCode: (cClassTribResult as { value: ClassificacaoTributaria }).value,
        baseValue: (baseMoneyResult as { value: Money }).value,
        ibsUfRate: (ibsUfRateResult as { value: AliquotaIBS }).value,
        ibsUfValue: (ibsUfMoneyResult as { value: Money }).value,
        ibsMunRate: (ibsMunRateResult as { value: AliquotaIBS }).value,
        ibsMunValue: (ibsMunMoneyResult as { value: Money }).value,
        cbsRate: (cbsRateResult as { value: AliquotaCBS }).value,
        cbsValue: (cbsMoneyResult as { value: Money }).value,
        governmentPurchase: {
          entityType: 2,
          reductionRate: 20.5,
        },
      });

      expect(Result.isOk(groupResult)).toBe(true);
      const group = (groupResult as { value: IBSCBSGroup }).value;

      const xml = GrupoIBSCBS.build(group);

      expect(xml).toContain('<compraGov>');
      expect(xml).toContain('<tpEnte>2</tpEnte>');
      expect(xml).toContain('<pReducao>20.50</pReducao>');
      expect(xml).toContain('</compraGov>');
    });
  });

  describe('validate', () => {
    it('should validate valid IBSCBSGroup', () => {
      const cstResult = CSTIbsCbs.create('00');
      const cClassTribResult = ClassificacaoTributaria.create('12345');
      const baseMoneyResult = Money.create(1000, 'BRL');
      const ibsUfRateResult = AliquotaIBS.fromPercentage(17.7);
      const ibsMunRateResult = AliquotaIBS.fromPercentage(0);
      const cbsRateResult = AliquotaCBS.fromPercentage(8.8);

      const ibsUfMoneyResult = Money.create(177, 'BRL');
      const ibsMunMoneyResult = Money.create(0, 'BRL');
      const cbsMoneyResult = Money.create(88, 'BRL');

      const groupResult = IBSCBSGroup.create({
        cst: (cstResult as { value: CSTIbsCbs }).value,
        classificationCode: (cClassTribResult as { value: ClassificacaoTributaria }).value,
        baseValue: (baseMoneyResult as { value: Money }).value,
        ibsUfRate: (ibsUfRateResult as { value: AliquotaIBS }).value,
        ibsUfValue: (ibsUfMoneyResult as { value: Money }).value,
        ibsMunRate: (ibsMunRateResult as { value: AliquotaIBS }).value,
        ibsMunValue: (ibsMunMoneyResult as { value: Money }).value,
        cbsRate: (cbsRateResult as { value: AliquotaCBS }).value,
        cbsValue: (cbsMoneyResult as { value: Money }).value,
      });

      expect(Result.isOk(groupResult)).toBe(true);
      const group = (groupResult as { value: IBSCBSGroup }).value;

      const validation = GrupoIBSCBS.validate(group);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});

