/**
 * CreateFiscalDocument Contract Tests
 * Testes de contrato para validação Zod de criação de documento fiscal
 * 
 * ⚠️ CRÍTICO: Validações fiscais rigorosas (CFOP, NCM, CNPJ)
 */
import { describe, it, expect } from 'vitest';
import { CreateFiscalDocumentDtoSchema } from '@/modules/fiscal/application/dtos/CreateFiscalDocumentDTO';

describe('CreateFiscalDocument Contract', () => {
  const validItem = {
    description: 'Produto de teste',
    quantity: 10,
    unitPrice: 100.00,
    ncm: '85171231',
    cfop: '5102',
    unitOfMeasure: 'UN',
  };

  const validInput = {
    documentType: 'NFE' as const,
    series: '1',
    issueDate: new Date().toISOString(),
    issuerId: 'emitter-123',
    issuerCnpj: '12345678000199',
    issuerName: 'Empresa Emitente',
    items: [validItem],
  };

  describe('Valid Inputs', () => {
    it('should accept valid NFE input', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid CTE input', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        documentType: 'CTE',
        items: [{ ...validItem, cfop: '5353' }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid NFSE input', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        documentType: 'NFSE',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid MDFE input', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        documentType: 'MDFE',
      });
      expect(result.success).toBe(true);
    });

    it('should accept input with recipient', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        recipientId: 'recipient-456',
        recipientCnpjCpf: '98765432000188',
        recipientName: 'Empresa Destinatária',
      });
      expect(result.success).toBe(true);
    });

    it('should accept input with CPF as recipient', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        recipientCnpjCpf: '12345678901',
        recipientName: 'Pessoa Física',
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple items', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [validItem, { ...validItem, description: 'Outro produto' }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Document Type Validation', () => {
    it('should reject invalid document type', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        documentType: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CNPJ Validation', () => {
    it('should reject CNPJ with wrong length', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        issuerCnpj: '1234567800019', // 13 dígitos
      });
      expect(result.success).toBe(false);
    });

    it('should reject CNPJ too long', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        issuerCnpj: '123456780001999', // 15 dígitos
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CFOP Validation', () => {
    it('should reject CFOP with wrong length', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [{ ...validItem, cfop: '510' }], // 3 dígitos
      });
      expect(result.success).toBe(false);
    });

    it('should reject CFOP too long', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [{ ...validItem, cfop: '51021' }], // 5 dígitos
      });
      expect(result.success).toBe(false);
    });
  });

  describe('NCM Validation', () => {
    it('should reject NCM with wrong length', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [{ ...validItem, ncm: '8517123' }], // 7 dígitos
      });
      expect(result.success).toBe(false);
    });

    it('should accept item without NCM (optional)', () => {
      const { ncm, ...itemWithoutNcm } = validItem;
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [itemWithoutNcm],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Items Validation', () => {
    it('should reject empty items array', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [{ ...validItem, quantity: -1 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero quantity', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [{ ...validItem, quantity: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative unit price', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [{ ...validItem, unitPrice: -10 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        items: [{ ...validItem, description: '' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Other Validations', () => {
    it('should reject empty series', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        series: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty issuer name', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        issuerName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 2000 characters', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        notes: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept notes up to 2000 characters', () => {
      const result = CreateFiscalDocumentDtoSchema.safeParse({
        ...validInput,
        notes: 'a'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });
  });
});
