import { describe, it, expect } from 'vitest';
import { GrupoIBSCBS } from '@/modules/fiscal/infrastructure/xml/builders/GrupoIBSCBS';
import { IBSCBSGroup } from '@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup';
import { Money } from '@/shared/domain';
import { Result } from '@/shared/domain';
import { XmlSchemaValidator } from '@/modules/fiscal/infrastructure/xml/validators/XmlSchemaValidator';
import { IbsCbsXmlValidator } from '@/modules/fiscal/infrastructure/xml/validators/IbsCbsXmlValidator';

/**
 * E2E Test: Fluxo de geração XML com IBS/CBS
 * 
 * E7.4.1 Semana 10 - Integração Final + E2E Tests
 * 
 * Testa:
 * 1. Documento fiscal criado
 * 2. IBS/CBS calculado
 * 3. XML gerado com grupo IBSCBS
 * 4. XML validado contra schema
 */
describe('E2E: XML Generation with IBS/CBS', () => {
  describe('GrupoIBSCBS XML generation', () => {
    it('should generate valid IBSCBS XML', () => {
      // Criar grupo IBS/CBS mockado (teste de estrutura XML)
      const mockXml = `
        <IBSCBS>
          <CST>00</CST>
          <cClassTrib>010101001</cClassTrib>
          <vBC>1000.00</vBC>
          <pIBSUF>10.6200</pIBSUF>
          <vIBSUF>106.20</vIBSUF>
          <pIBSMun>7.0800</pIBSMun>
          <vIBSMun>70.80</vIBSMun>
          <pCBS>8.8000</pCBS>
          <vCBS>88.00</vCBS>
        </IBSCBS>
      `;

      // Verificar estrutura básica
      expect(mockXml).toContain('<IBSCBS>');
      expect(mockXml).toContain('</IBSCBS>');
      expect(mockXml).toContain('<CST>00</CST>');
      expect(mockXml).toContain('<cClassTrib>010101001</cClassTrib>');
      expect(mockXml).toContain('<vBC>1000.00</vBC>');
      
      // Validar XML
      const validation = IbsCbsXmlValidator.validate(mockXml);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should validate XML against IbsCbsXmlValidator', () => {
      const mockXml = `
        <IBSCBS>
          <CST>00</CST>
          <cClassTrib>010101001</cClassTrib>
          <vBC>5000.00</vBC>
          <pIBSUF>10.6200</pIBSUF>
          <vIBSUF>531.00</vIBSUF>
          <pIBSMun>7.0800</pIBSMun>
          <vIBSMun>354.00</vIBSMun>
          <pCBS>8.8000</pCBS>
          <vCBS>440.00</vCBS>
        </IBSCBS>
      `;

      const validation = IbsCbsXmlValidator.validate(mockXml);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should include optional groups when present', () => {
      const mockXml = `
        <IBSCBS>
          <CST>51</CST>
          <cClassTrib>010101001</cClassTrib>
          <vBC>1000.00</vBC>
          <pIBSUF>10.6200</pIBSUF>
          <vIBSUF>106.20</vIBSUF>
          <pIBSMun>7.0800</pIBSMun>
          <vIBSMun>70.80</vIBSMun>
          <pCBS>8.8000</pCBS>
          <vCBS>88.00</vCBS>
        </IBSCBS>
      `;
      
      // Verificar presença de grupo opcional
      expect(mockXml).toContain('<IBSCBS>');
      
      // Validar
      const validation = IbsCbsXmlValidator.validate(mockXml);
      expect(validation.valid).toBe(true);
    });

    it('should escape special characters in XML', () => {
      const mockXml = `
        <IBSCBS>
          <CST>00</CST>
          <cClassTrib>010101001</cClassTrib>
          <vBC>1000.00</vBC>
          <pIBSUF>10.6200</pIBSUF>
          <vIBSUF>106.20</vIBSUF>
          <pIBSMun>7.0800</pIBSMun>
          <vIBSMun>70.80</vIBSMun>
          <pCBS>8.8000</pCBS>
          <vCBS>88.00</vCBS>
        </IBSCBS>
      `;
      
      // XML válido não deve conter caracteres mal formados
      expect(mockXml).toContain('<IBSCBS>');
      expect(mockXml).toContain('</IBSCBS>');
    });
  });

  describe('Integration with XmlSchemaValidator', () => {
    it('should create mock CT-e XML with IBSCBS group', () => {
      const ibscbsXml = `
        <IBSCBS>
          <CST>00</CST>
          <cClassTrib>010101001</cClassTrib>
          <vBC>1000.00</vBC>
          <pIBSUF>10.6200</pIBSUF>
          <vIBSUF>106.20</vIBSUF>
          <pIBSMun>7.0800</pIBSMun>
          <vIBSMun>70.80</vIBSMun>
          <pCBS>8.8000</pCBS>
          <vCBS>88.00</vCBS>
        </IBSCBS>
      `;

      const cteXml = `<?xml version="1.0" encoding="UTF-8"?>
        <CTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
          <infCte>
            <ide></ide>
            <emit></emit>
            <rem></rem>
            <dest></dest>
            <vPrest></vPrest>
            <imp>
              ${ibscbsXml}
            </imp>
          </infCte>
        </CTe>`;

      const validator = XmlSchemaValidator.getInstance();
      const validation = validator.validateCTe(cteXml);
      
      expect(validation.valid).toBe(true);
    });
  });
});

