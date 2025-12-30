import { describe, it, expect } from 'vitest';
import { Money } from '@/shared/domain';
import { GrupoIBSCBS } from '@/modules/fiscal/infrastructure/xml/builders/GrupoIBSCBS';
import { IBSCBSGroup } from '@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup';
import { CSTIbsCbs } from '@/modules/fiscal/domain/tax/value-objects/CSTIbsCbs';
import { ClassificacaoTributaria } from '@/modules/fiscal/domain/tax/value-objects/ClassificacaoTributaria';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';

describe('GrupoIBSCBS', () => {
  it('should generate XML with all required fields', () => {
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

    const xml = GrupoIBSCBS.build(group);

    expect(xml).toContain('<IBSCBS>');
    expect(xml).toContain('<CST>00</CST>');
    expect(xml).toContain('<cClassTrib>10101</cClassTrib>');
    expect(xml).toContain('<vBC>1000.00</vBC>');
    expect(xml).toContain('<pIBSUF>0.1000</pIBSUF>');
    expect(xml).toContain('<vIBSUF>1.00</vIBSUF>');
    expect(xml).toContain('<pIBSMun>0.1000</pIBSMun>');
    expect(xml).toContain('<vIBSMun>1.00</vIBSMun>');
    expect(xml).toContain('<pCBS>0.9000</pCBS>');
    expect(xml).toContain('<vCBS>9.00</vCBS>');
    expect(xml).toContain('</IBSCBS>');
  });

  it('should include optional deferral group when present', () => {
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

    const xml = GrupoIBSCBS.build(group);

    expect(xml).toContain('<gDif>');
    expect(xml).toContain('<pDif>50.00</pDif>');
    expect(xml).toContain('<vIBSDif>0.50</vIBSDif>');
    expect(xml).toContain('<vCBSDif>4.50</vCBSDif>');
    expect(xml).toContain('</gDif>');
  });

  it('should include optional presumed credit group when present', () => {
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

    const xml = GrupoIBSCBS.build(group);

    expect(xml).toContain('<gCredPres>');
    expect(xml).toContain('<cCredPres>CP001</cCredPres>');
    expect(xml).toContain('<pCredPres>10.00</pCredPres>');
    expect(xml).toContain('<vCredPresIBS>0.20</vCredPresIBS>');
    expect(xml).toContain('<vCredPresCBS>0.90</vCredPresCBS>');
    expect(xml).toContain('</gCredPres>');
  });

  it('should include optional government purchase group when present', () => {
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
      governmentPurchase: {
        entityType: 1, // União
        reductionRate: 20,
      },
    }).value;

    const xml = GrupoIBSCBS.build(group);

    expect(xml).toContain('<gCompraGov>');
    expect(xml).toContain('<tpEnteGov>1</tpEnteGov>');
    expect(xml).toContain('<pRedCompraGov>20.00</pRedCompraGov>');
    expect(xml).toContain('</gCompraGov>');
  });

  it('should validate group successfully with all required fields', () => {
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

    const validation = GrupoIBSCBS.validate(group);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should accept zero base value (aligned with Domain)', () => {
    const cst = CSTIbsCbs.create('00').value;
    const classification = ClassificacaoTributaria.create('10101').value;
    const baseValue = Money.create(0, 'BRL').value; // Zero é válido
    const ibsUfRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsUfValue = Money.create(0, 'BRL').value;
    const ibsMunRate = AliquotaIBS.fromPercentage(0.10).value;
    const ibsMunValue = Money.create(0, 'BRL').value;
    const cbsRate = AliquotaCBS.fromPercentage(0.90).value;
    const cbsValue = Money.create(0, 'BRL').value;

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

    const validation = GrupoIBSCBS.validate(group);

    // Zero é válido conforme Domain (IBSCBSGroup permite zero)
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
