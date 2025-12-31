import { describe, it, expect } from 'vitest';
import { XmlSchemaValidator, XmlValidatorFactory } from '@/modules/fiscal/infrastructure/xml/validators/XmlSchemaValidator';

describe('XmlSchemaValidator', () => {
  const validator = XmlSchemaValidator.getInstance();

  describe('validateCTe()', () => {
    it('should validate valid CT-e XML structure', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <CTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
          <infCte>
            <ide></ide>
            <emit></emit>
            <rem></rem>
            <dest></dest>
            <vPrest></vPrest>
            <imp></imp>
          </infCte>
        </CTe>`;
      
      const result = validator.validateCTe(xml);
      expect(result.valid).toBe(true);
    });

    it('should fail when required field is missing', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <CTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
          <infCte>
            <ide></ide>
          </infCte>
        </CTe>`;
      
      const result = validator.validateCTe(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateNFe()', () => {
    it('should validate valid NF-e XML structure', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <NFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <infNFe>
            <ide></ide>
            <emit></emit>
            <dest></dest>
            <det></det>
            <total></total>
            <transp></transp>
            <cobr></cobr>
          </infNFe>
        </NFe>`;
      
      const result = validator.validateNFe(xml);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMDFe()', () => {
    it('should validate valid MDF-e XML structure', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <MDFe xmlns="http://www.portalfiscal.inf.br/mdfe" versao="3.00">
          <infMDFe>
            <ide></ide>
            <emit></emit>
            <infModal></infModal>
            <infDoc></infDoc>
          </infMDFe>
        </MDFe>`;
      
      const result = validator.validateMDFe(xml);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateNFSe()', () => {
    it('should validate valid NFS-e XML structure', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.04">
          <InfNfse>
            <Numero></Numero>
            <Prestador></Prestador>
            <Tomador></Tomador>
            <Servico></Servico>
            <Valores></Valores>
          </InfNfse>
        </CompNfse>`;
      
      const result = validator.validateNFSe(xml);
      expect(result.valid).toBe(true);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = XmlSchemaValidator.getInstance();
      const instance2 = XmlSchemaValidator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('XmlValidatorFactory', () => {
    it('should create validator instance', () => {
      const validator = XmlValidatorFactory.create();
      expect(validator).toBeDefined();
      expect(typeof validator.validate).toBe('function');
    });
  });
});

