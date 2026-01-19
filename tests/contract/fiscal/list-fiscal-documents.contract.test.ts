/**
 * ListFiscalDocuments Contract Tests
 * Testes de contrato para validação Zod de listagem de documentos fiscais
 */
import { describe, it, expect } from 'vitest';
import { ListFiscalDocumentsDtoSchema } from '@/modules/fiscal/application/dtos/ListFiscalDocumentsDTO';

describe('ListFiscalDocuments Contract', () => {
  describe('Valid Inputs', () => {
    it('should accept empty input with defaults', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('should accept all valid document types', () => {
      const types = ['NFE', 'CTE', 'MDFE', 'NFSE'] as const;
      
      for (const documentType of types) {
        const result = ListFiscalDocumentsDtoSchema.safeParse({ documentType });
        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid statuses', () => {
      const statuses = ['DRAFT', 'VALIDATED', 'SUBMITTED', 'AUTHORIZED', 'CANCELLED', 'REJECTED'] as const;
      
      for (const status of statuses) {
        const result = ListFiscalDocumentsDtoSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should accept date range filter', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        issueDateFrom: new Date('2026-01-01'),
        issueDateTo: new Date('2026-12-31'),
      });
      expect(result.success).toBe(true);
    });

    it('should accept recipient CNPJ filter', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        recipientCnpjCpf: '12345678000199',
      });
      expect(result.success).toBe(true);
    });

    it('should accept recipient CPF filter', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        recipientCnpjCpf: '12345678901',
      });
      expect(result.success).toBe(true);
    });

    it('should accept custom pagination', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        page: 5,
        pageSize: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should accept series filter', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        series: '1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject invalid document type', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        documentType: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        status: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should reject recipient CNPJ/CPF too short', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        recipientCnpjCpf: '1234567890', // 10 dígitos
      });
      expect(result.success).toBe(false);
    });

    it('should reject recipient CNPJ/CPF too long', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        recipientCnpjCpf: '123456780001999', // 15 dígitos
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        page: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero page', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject pageSize greater than 100', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        pageSize: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject pageSize less than 1', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        pageSize: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject series too long', () => {
      const result = ListFiscalDocumentsDtoSchema.safeParse({
        series: 'a'.repeat(11),
      });
      expect(result.success).toBe(false);
    });
  });
});
