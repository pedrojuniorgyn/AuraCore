import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { FiscalDocumentIbsCbsMapper } from '@/modules/fiscal/infrastructure/persistence/FiscalDocumentIbsCbsMapper';
import { IBSCBSGroup } from '@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup';
import { CSTIbsCbs } from '@/modules/fiscal/domain/tax/value-objects/CSTIbsCbs';
import { ClassificacaoTributaria } from '@/modules/fiscal/domain/tax/value-objects/ClassificacaoTributaria';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';

describe('FiscalDocumentIbsCbsMapper', () => {
  // Helper para criar timestamps consistentes nos testes
  const testTimestamp = new Date('2025-01-01T00:00:00Z');

  it('should convert domain to persistence with all required fields', () => {
    const cst = CSTIbsCbs.create('00').value;
    const classification = ClassificacaoTributaria.create('10101').value;
    const baseValue = Money.create(1000, 'BRL').value;
    const ibsUfRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsUfValue = Money.create(1, 'BRL').value;
    const ibsMunRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsMunValue = Money.create(1, 'BRL').value;
    const cbsRate = AliquotaCBS.fromPercentage(0.90).value;
    const cbsValue = Money.create(9, 'BRL').value;

    const group = IBSCBSGroup.create({
      cst,
      classificationCode: classification,
      baseValue,
      ibsUfRate,
      ibsUfValue,
      ibsMunRate,
      ibsMunValue,
      cbsRate,
      cbsValue,
    }).value;

    const persistence = FiscalDocumentIbsCbsMapper.toPersistence(
      group,
      'doc-123',
      null,
      1,
      1,
      'ibscbs-123',
      testTimestamp,
      testTimestamp
    );

    // Verificar campos obrigatórios
    expect(persistence.id).toBe('ibscbs-123');
    expect(persistence.fiscalDocumentId).toBe('doc-123');
    expect(persistence.fiscalDocumentItemId).toBe(null);
    expect(persistence.organizationId).toBe(1);
    expect(persistence.branchId).toBe(1);
    expect(persistence.cst).toBe('00');
      expect(persistence.cClassTrib).toBe('10101');
    expect(persistence.baseValue).toBe('1000');
    expect(persistence.baseValueCurrency).toBe('BRL');
    expect(persistence.ibsUfRate).toBe('0.1');
    expect(persistence.ibsUfValue).toBe('1');
    expect(persistence.ibsUfValueCurrency).toBe('BRL');
    expect(persistence.ibsMunRate).toBe('0.1');
    expect(persistence.ibsMunValue).toBe('1');
    expect(persistence.ibsMunValueCurrency).toBe('BRL');
    expect(persistence.cbsRate).toBe('0.9');
    expect(persistence.cbsValue).toBe('9');
    expect(persistence.cbsValueCurrency).toBe('BRL');
    
    // Verificar que timestamps foram preservados (idempotência)
    expect(persistence.createdAt).toBe(testTimestamp);
    expect(persistence.updatedAt).toBe(testTimestamp);
  });

  it('should preserve currency in Money values (INFRA-002)', () => {
    const cst = CSTIbsCbs.create('00').value;
    const classification = ClassificacaoTributaria.create('10101').value;
    const baseValue = Money.create(1000, 'USD').value; // USD
    const ibsUfRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsUfValue = Money.create(1, 'USD').value; // USD
    const ibsMunRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsMunValue = Money.create(1, 'USD').value; // USD
    const cbsRate = AliquotaCBS.fromPercentage(0.90).value;
    const cbsValue = Money.create(9, 'USD').value; // USD

    const group = IBSCBSGroup.create({
      cst,
      classificationCode: classification,
      baseValue,
      ibsUfRate,
      ibsUfValue,
      ibsMunRate,
      ibsMunValue,
      cbsRate,
      cbsValue,
    }).value;

    const persistence = FiscalDocumentIbsCbsMapper.toPersistence(
      group,
      'doc-123',
      null,
      1,
      1,
      'ibscbs-123',
      testTimestamp,
      testTimestamp
    );

    // Verificar que currency USD foi preservada
    expect(persistence.baseValueCurrency).toBe('USD');
    expect(persistence.ibsUfValueCurrency).toBe('USD');
    expect(persistence.ibsMunValueCurrency).toBe('USD');
    expect(persistence.cbsValueCurrency).toBe('USD');
  });

  it('should convert persistence to domain correctly (roundtrip)', () => {
    const cst = CSTIbsCbs.create('00').value;
    const classification = ClassificacaoTributaria.create('10101').value;
    const baseValue = Money.create(1000, 'BRL').value;
    const ibsUfRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsUfValue = Money.create(1, 'BRL').value;
    const ibsMunRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsMunValue = Money.create(1, 'BRL').value;
    const cbsRate = AliquotaCBS.fromPercentage(0.90).value;
    const cbsValue = Money.create(9, 'BRL').value;

    const originalGroup = IBSCBSGroup.create({
      cst,
      classificationCode: classification,
      baseValue,
      ibsUfRate,
      ibsUfValue,
      ibsMunRate,
      ibsMunValue,
      cbsRate,
      cbsValue,
    }).value;

    const persistence = FiscalDocumentIbsCbsMapper.toPersistence(
      originalGroup,
      'doc-123',
      null,
      1,
      1,
      'ibscbs-123',
      testTimestamp,
      testTimestamp
    );

    const result = FiscalDocumentIbsCbsMapper.toDomain(persistence);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      const reconstructedGroup = result.value;
      
      expect(reconstructedGroup.cst.value).toBe(originalGroup.cst.value);
      expect(reconstructedGroup.classificationCode.code).toBe(originalGroup.classificationCode.code);
      expect(reconstructedGroup.baseValue.amount).toBe(originalGroup.baseValue.amount);
      expect(reconstructedGroup.baseValue.currency).toBe(originalGroup.baseValue.currency);
      expect(reconstructedGroup.ibsUfRate.percentual).toBe(originalGroup.ibsUfRate.percentual);
      expect(reconstructedGroup.ibsUfValue.amount).toBe(originalGroup.ibsUfValue.amount);
      expect(reconstructedGroup.cbsRate.percentual).toBe(originalGroup.cbsRate.percentual);
      expect(reconstructedGroup.cbsValue.amount).toBe(originalGroup.cbsValue.amount);
    }
  });

  it('should map optional deferral fields correctly', () => {
    const cst = CSTIbsCbs.create('30').value; // CST 30 = Tributação com diferimento
    const classification = ClassificacaoTributaria.create('10101').value;
    const baseValue = Money.create(1000, 'BRL').value;
    const ibsUfRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsUfValue = Money.create(1, 'BRL').value;
    const ibsMunRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsMunValue = Money.create(1, 'BRL').value;
    const cbsRate = AliquotaCBS.fromPercentage(0.90).value;
    const cbsValue = Money.create(9, 'BRL').value;

    const group = IBSCBSGroup.create({
      cst,
      classificationCode: classification,
      baseValue,
      ibsUfRate,
      ibsUfValue,
      ibsMunRate,
      ibsMunValue,
      cbsRate,
      cbsValue,
      deferral: {
        deferralRate: 50,
        ibsDeferredValue: Money.create(0.50, 'BRL').value,
        cbsDeferredValue: Money.create(4.50, 'BRL').value,
      },
    }).value;

    const persistence = FiscalDocumentIbsCbsMapper.toPersistence(
      group,
      'doc-123',
      null,
      1,
      1,
      'ibscbs-123',
      testTimestamp,
      testTimestamp
    );

    expect(persistence.deferralRate).toBe('50');
    expect(persistence.deferralIbsValue).toBe('0.5');
    expect(persistence.deferralIbsValueCurrency).toBe('BRL');
    expect(persistence.deferralCbsValue).toBe('4.5');
    expect(persistence.deferralCbsValueCurrency).toBe('BRL');
  });

  it('should map optional presumed credit fields correctly', () => {
    const cst = CSTIbsCbs.create('00').value;
    const classification = ClassificacaoTributaria.create('10101').value;
    const baseValue = Money.create(1000, 'BRL').value;
    const ibsUfRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsUfValue = Money.create(1, 'BRL').value;
    const ibsMunRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsMunValue = Money.create(1, 'BRL').value;
    const cbsRate = AliquotaCBS.fromPercentage(0.90).value;
    const cbsValue = Money.create(9, 'BRL').value;

    const group = IBSCBSGroup.create({
      cst,
      classificationCode: classification,
      baseValue,
      ibsUfRate,
      ibsUfValue,
      ibsMunRate,
      ibsMunValue,
      cbsRate,
      cbsValue,
      presumedCredit: {
        creditCode: 'CP001',
        creditRate: 10,
        ibsCreditValue: Money.create(0.20, 'BRL').value,
        cbsCreditValue: Money.create(0.90, 'BRL').value,
      },
    }).value;

    const persistence = FiscalDocumentIbsCbsMapper.toPersistence(
      group,
      'doc-123',
      null,
      1,
      1,
      'ibscbs-123',
      testTimestamp,
      testTimestamp
    );

    expect(persistence.presumedCreditCode).toBe('CP001');
    expect(persistence.presumedCreditRate).toBe('10');
    expect(persistence.presumedCreditIbsValue).toBe('0.2');
    expect(persistence.presumedCreditCbsValue).toBe('0.9');
  });

  it('should fail toDomain with invalid CST (ENFORCE-015)', () => {
    const persistence = {
      id: 'ibscbs-123',
      fiscalDocumentId: 'doc-123',
      fiscalDocumentItemId: null,
      organizationId: 1,
      branchId: 1,
      cst: 'INVALID', // CST inválido
      cClassTrib: '010101001',
      baseValue: '1000',
      baseValueCurrency: 'BRL',
      ibsUfRate: '0.1',
      ibsUfValue: '1',
      ibsUfValueCurrency: 'BRL',
      ibsMunRate: '0.1',
      ibsMunValue: '1',
      ibsMunValueCurrency: 'BRL',
      cbsRate: '0.9',
      cbsValue: '9',
      cbsValueCurrency: 'BRL',
      ibsUfEffectiveRate: null,
      ibsMunEffectiveRate: null,
      cbsEffectiveRate: null,
      deferralRate: null,
      deferralIbsValue: null,
      deferralIbsValueCurrency: null,
      deferralCbsValue: null,
      deferralCbsValueCurrency: null,
      refundIbsValue: null,
      refundIbsValueCurrency: null,
      refundCbsValue: null,
      refundCbsValueCurrency: null,
      reductionIbsRate: null,
      reductionCbsRate: null,
      presumedCreditCode: null,
      presumedCreditRate: null,
      presumedCreditIbsValue: null,
      presumedCreditIbsValueCurrency: null,
      presumedCreditCbsValue: null,
      presumedCreditCbsValueCurrency: null,
      governmentPurchaseEntityType: null,
      governmentPurchaseReductionRate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = FiscalDocumentIbsCbsMapper.toDomain(persistence);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Invalid CST');
    }
  });

  it('should handle optional fields as null when not provided', () => {
    const cst = CSTIbsCbs.create('00').value;
    const classification = ClassificacaoTributaria.create('10101').value;
    const baseValue = Money.create(1000, 'BRL').value;
    const ibsUfRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsUfValue = Money.create(1, 'BRL').value;
    const ibsMunRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsMunValue = Money.create(1, 'BRL').value;
    const cbsRate = AliquotaCBS.fromPercentage(0.90).value;
    const cbsValue = Money.create(9, 'BRL').value;

    const group = IBSCBSGroup.create({
      cst,
      classificationCode: classification,
      baseValue,
      ibsUfRate,
      ibsUfValue,
      ibsMunRate,
      ibsMunValue,
      cbsRate,
      cbsValue,
      // Sem campos opcionais
    }).value;

    const persistence = FiscalDocumentIbsCbsMapper.toPersistence(
      group,
      'doc-123',
      null,
      1,
      1,
      'ibscbs-123',
      testTimestamp,
      testTimestamp
    );

    // Verificar que campos opcionais são null
    expect(persistence.deferralRate).toBe(null);
    expect(persistence.deferralIbsValue).toBe(null);
    expect(persistence.refundIbsValue).toBe(null);
    expect(persistence.reductionIbsRate).toBe(null);
    expect(persistence.presumedCreditCode).toBe(null);
    expect(persistence.governmentPurchaseEntityType).toBe(null);
  });
});

