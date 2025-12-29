import { describe, it, expect } from 'vitest';
import { IBSCBSGroup } from '@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup';
import { CSTIbsCbs } from '@/modules/fiscal/domain/tax/value-objects/CSTIbsCbs';
import { ClassificacaoTributaria } from '@/modules/fiscal/domain/tax/value-objects/ClassificacaoTributaria';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';
import { Money } from '@/shared/domain';
import { Result } from '@/shared/domain';

describe('IBSCBSGroup', () => {
  const createValidProps = (): import('@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup').IBSCBSGroupProps => ({
    cst: CSTIbsCbs.tributacaoNormal(),
    classificationCode: ClassificacaoTributaria.tributacaoIntegral(),
    baseValue: Money.create(1000, 'BRL').value as Money,
    ibsUfRate: AliquotaIBS.fromPercentage(0.1).value as AliquotaIBS,
    ibsUfValue: Money.create(1, 'BRL').value as Money, // 1000 * 0.1% = 1
    ibsMunRate: AliquotaIBS.zero(),
    ibsMunValue: Money.create(0, 'BRL').value as Money,
    cbsRate: AliquotaCBS.fromPercentage(0.9).value as AliquotaCBS,
    cbsValue: Money.create(9, 'BRL').value as Money, // 1000 * 0.9% = 9
  });

  describe('create', () => {
    it('should create valid IBSCBS group', () => {
      const result = IBSCBSGroup.create(createValidProps());

      expect(Result.isOk(result)).toBe(true);
      const group = result.value as IBSCBSGroup;
      expect(group.cst.code).toBe('00');
      expect(group.classificationCode.code).toBe('10100');
      expect(group.baseValue.amount).toBe(1000);
      expect(group.ibsUfValue.amount).toBe(1);
      expect(group.cbsValue.amount).toBe(9);
    });

    it('should calculate total IBS correctly', () => {
      const props = createValidProps();
      props.ibsMunValue = Money.create(0.5, 'BRL').value as Money;
      props.ibsMunRate = AliquotaIBS.fromPercentage(0.05).value as AliquotaIBS;

      const group = IBSCBSGroup.create(props).value as IBSCBSGroup;

      expect(group.totalIbs.amount).toBeCloseTo(1.5);
    });

    it('should calculate total tax correctly', () => {
      const group = IBSCBSGroup.create(createValidProps()).value as IBSCBSGroup;

      expect(group.totalTax.amount).toBeCloseTo(10); // 1 + 0 + 9
    });

    it('should fail with negative base value', () => {
      const props = createValidProps();
      props.baseValue = Money.create(-100, 'BRL').value as Money;

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Base value cannot be negative');
    });

    it('should fail with inconsistent currency', () => {
      const props = createValidProps();
      props.cbsValue = Money.create(9, 'USD').value as Money; // Different currency

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('same currency');
    });

    it('should fail when IBS UF value inconsistent with base and rate', () => {
      const props = createValidProps();
      props.ibsUfValue = Money.create(100, 'BRL').value as Money; // Wrong value

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('IBS UF value');
      expect(result.error).toContain('inconsistent');
    });

    it('should fail when IBS Municipal value inconsistent with base and rate', () => {
      const props = createValidProps();
      props.ibsMunRate = AliquotaIBS.fromPercentage(0.1).value as AliquotaIBS;
      props.ibsMunValue = Money.create(50, 'BRL').value as Money; // Wrong value

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('IBS Municipal value');
      expect(result.error).toContain('inconsistent');
    });

    it('should fail when CBS value inconsistent with base and rate', () => {
      const props = createValidProps();
      props.cbsValue = Money.create(100, 'BRL').value as Money; // Wrong value

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('CBS value');
      expect(result.error).toContain('inconsistent');
    });

    it('should fail with negative IBS UF value', () => {
      const props = createValidProps();
      props.ibsUfValue = Money.create(-1, 'BRL').value as Money;
      props.ibsUfRate = AliquotaIBS.zero();

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('IBS UF value cannot be negative');
    });

    it('should fail with negative CBS value', () => {
      const props = createValidProps();
      props.cbsValue = Money.create(-1, 'BRL').value as Money;
      props.cbsRate = AliquotaCBS.zero();

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('CBS value cannot be negative');
    });
  });

  describe('deferral', () => {
    it('should create with valid deferral info', () => {
      const props = createValidProps();
      props.deferral = {
        deferralRate: 50,
        ibsDeferredValue: Money.create(0.5, 'BRL').value as Money,
        cbsDeferredValue: Money.create(4.5, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isOk(result)).toBe(true);
      const group = result.value as IBSCBSGroup;
      expect(group.deferral?.deferralRate).toBe(50);
      expect(group.deferral?.ibsDeferredValue.amount).toBe(0.5);
    });

    it('should fail with invalid deferral rate', () => {
      const props = createValidProps();
      props.deferral = {
        deferralRate: 150, // > 100%
        ibsDeferredValue: Money.create(0, 'BRL').value as Money,
        cbsDeferredValue: Money.create(0, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Deferral rate must be between 0% and 100%');
    });

    it('should fail with negative deferred value', () => {
      const props = createValidProps();
      props.deferral = {
        deferralRate: 50,
        ibsDeferredValue: Money.create(-1, 'BRL').value as Money,
        cbsDeferredValue: Money.create(0, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('IBS deferred value cannot be negative');
    });
  });

  describe('refund', () => {
    it('should create with valid refund info', () => {
      const props = createValidProps();
      props.refund = {
        ibsRefundValue: Money.create(0.5, 'BRL').value as Money,
        cbsRefundValue: Money.create(4.5, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isOk(result)).toBe(true);
      const group = result.value as IBSCBSGroup;
      expect(group.refund?.ibsRefundValue.amount).toBe(0.5);
      expect(group.refund?.cbsRefundValue.amount).toBe(4.5);
    });

    it('should fail with negative refund value', () => {
      const props = createValidProps();
      props.refund = {
        ibsRefundValue: Money.create(-1, 'BRL').value as Money,
        cbsRefundValue: Money.create(0, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('IBS refund value cannot be negative');
    });
  });

  describe('reduction', () => {
    it('should create with valid reduction info', () => {
      const props = createValidProps();
      props.reduction = {
        ibsReductionRate: 20,
        cbsReductionRate: 15,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isOk(result)).toBe(true);
      const group = result.value as IBSCBSGroup;
      expect(group.reduction?.ibsReductionRate).toBe(20);
      expect(group.reduction?.cbsReductionRate).toBe(15);
    });

    it('should fail with invalid reduction rate', () => {
      const props = createValidProps();
      props.reduction = {
        ibsReductionRate: 150, // > 100%
        cbsReductionRate: 0,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('IBS reduction rate must be between 0% and 100%');
    });
  });

  describe('presumed credit', () => {
    it('should create with valid presumed credit info', () => {
      const props = createValidProps();
      props.presumedCredit = {
        creditCode: 'CRED001',
        creditRate: 30,
        ibsCreditValue: Money.create(0.3, 'BRL').value as Money,
        cbsCreditValue: Money.create(2.7, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isOk(result)).toBe(true);
      const group = result.value as IBSCBSGroup;
      expect(group.presumedCredit?.creditCode).toBe('CRED001');
      expect(group.presumedCredit?.creditRate).toBe(30);
    });

    it('should fail with empty credit code', () => {
      const props = createValidProps();
      props.presumedCredit = {
        creditCode: '',
        creditRate: 30,
        ibsCreditValue: Money.create(0, 'BRL').value as Money,
        cbsCreditValue: Money.create(0, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Presumed credit code is required');
    });

    it('should fail with invalid credit rate', () => {
      const props = createValidProps();
      props.presumedCredit = {
        creditCode: 'CRED001',
        creditRate: 150, // > 100%
        ibsCreditValue: Money.create(0, 'BRL').value as Money,
        cbsCreditValue: Money.create(0, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Presumed credit rate must be between 0% and 100%');
    });

    it('should fail with negative credit value', () => {
      const props = createValidProps();
      props.presumedCredit = {
        creditCode: 'CRED001',
        creditRate: 30,
        ibsCreditValue: Money.create(-1, 'BRL').value as Money,
        cbsCreditValue: Money.create(0, 'BRL').value as Money,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('IBS credit value cannot be negative');
    });
  });

  describe('government purchase', () => {
    it('should create with valid government purchase info', () => {
      const props = createValidProps();
      props.governmentPurchase = {
        entityType: 1, // União
        reductionRate: 20,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isOk(result)).toBe(true);
      const group = result.value as IBSCBSGroup;
      expect(group.governmentPurchase?.entityType).toBe(1);
      expect(group.governmentPurchase?.reductionRate).toBe(20);
    });

    it('should fail with invalid entity type', () => {
      const props = createValidProps();
      props.governmentPurchase = {
        entityType: 4 as 1, // Invalid
        reductionRate: 20,
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Government entity type must be 1 (União), 2 (Estado), or 3 (Município)');
    });

    it('should fail with invalid reduction rate', () => {
      const props = createValidProps();
      props.governmentPurchase = {
        entityType: 1,
        reductionRate: 150, // > 100%
      };

      const result = IBSCBSGroup.create(props);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Government purchase reduction rate must be between 0% and 100%');
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const props = createValidProps();
      const group1 = IBSCBSGroup.create(props).value as IBSCBSGroup;
      const group2 = IBSCBSGroup.create(props).value as IBSCBSGroup;

      expect(group1.equals(group2)).toBe(true);
    });

    it('should return false for different CST', () => {
      const props1 = createValidProps();
      const props2 = createValidProps();
      props2.cst = CSTIbsCbs.isencao();

      const group1 = IBSCBSGroup.create(props1).value as IBSCBSGroup;
      const group2 = IBSCBSGroup.create(props2).value as IBSCBSGroup;

      expect(group1.equals(group2)).toBe(false);
    });
  });
});

