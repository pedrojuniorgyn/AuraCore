import { describe, it, expect } from 'vitest';
import { IbsCbsXmlValidator } from '@/modules/fiscal/infrastructure/xml/validators/IbsCbsXmlValidator';

describe('IbsCbsXmlValidator', () => {
  const validXml = `
    <IBSCBS>
      <CST>00</CST>
      <cClassTrib>010101001</cClassTrib>
      <vBC>1000.00</vBC>
      <pIBSUF>0.1000</pIBSUF>
      <vIBSUF>1.00</vIBSUF>
      <pIBSMun>0.1000</pIBSMun>
      <vIBSMun>1.00</vIBSMun>
      <pCBS>0.9000</pCBS>
      <vCBS>9.00</vCBS>
    </IBSCBS>
  `;

  describe('validate()', () => {
    it('should validate correct IBSCBS XML', () => {
      const result = IbsCbsXmlValidator.validate(validXml);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail when CST is missing', () => {
      const xml = validXml.replace('<CST>00</CST>', '');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'CST')).toBe(true);
    });

    it('should fail when cClassTrib is missing', () => {
      const xml = validXml.replace('<cClassTrib>010101001</cClassTrib>', '');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'cClassTrib')).toBe(true);
    });

    it('should fail when base value is negative', () => {
      const xml = validXml.replace('<vBC>1000.00</vBC>', '<vBC>-10.00</vBC>');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'vBC')).toBe(true);
    });

    it('should fail when rate exceeds 100%', () => {
      const xml = validXml.replace('<pIBSUF>0.1000</pIBSUF>', '<pIBSUF>150.0000</pIBSUF>');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'pIBSUF' && e.code === 'INVALID_RATE')).toBe(true);
    });

    it('should fail when CST is invalid', () => {
      const xml = validXml.replace('<CST>00</CST>', '<CST>99</CST>');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'CST' && e.code === 'INVALID_CST')).toBe(true);
    });

    it('should fail when cClassTrib has wrong format', () => {
      const xml = validXml.replace('<cClassTrib>010101001</cClassTrib>', '<cClassTrib>123</cClassTrib>');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'cClassTrib' && e.code === 'INVALID_CLASS_TRIB')).toBe(true);
    });

    it('should fail when vIBSUF is inconsistent with calculation', () => {
      const xml = validXml.replace('<vIBSUF>1.00</vIBSUF>', '<vIBSUF>99.00</vIBSUF>');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'vIBSUF' && e.code === 'INCONSISTENT_VALUE')).toBe(true);
    });

    it('should warn when rate is unusually high', () => {
      const xml = validXml.replace('<pCBS>0.9000</pCBS>', '<pCBS>25.0000</pCBS>')
                          .replace('<vCBS>9.00</vCBS>', '<vCBS>250.00</vCBS>');
      const result = IbsCbsXmlValidator.validate(xml);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'pCBS')).toBe(true);
    });

    it('should validate object input', () => {
      const obj = {
        CST: '00',
        cClassTrib: '010101001',
        vBC: '1000.00',
        pIBSUF: '0.1000',
        vIBSUF: '1.00',
        pIBSMun: '0.1000',
        vIBSMun: '1.00',
        pCBS: '0.9000',
        vCBS: '9.00',
      };
      const result = IbsCbsXmlValidator.validate(obj);
      expect(result.valid).toBe(true);
    });
  });
});

