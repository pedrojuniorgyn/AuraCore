/**
 * Testes Unitários - DocumentChunker
 *
 * @module tests/unit/modules/fiscal/domain/services/rag
 * @see E-Agent-Fase-D4
 */
import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { DocumentChunker } from '@/modules/fiscal/domain/services/rag/DocumentChunker';
import type { DocumentExtractionResult } from '@/shared/infrastructure/docling';

const mockExtraction: DocumentExtractionResult = {
  text: 'Art. 12. Fato gerador no momento da saída. Art. 13. Alíquota 12%. Art. 14. Base de cálculo.',
  tables: [],
  metadata: { pageCount: 2, title: 'Lei 87/96', fileSize: 1000 },
  processingTimeMs: 100,
};

describe('DocumentChunker', () => {
  describe('chunkDocument', () => {
    it('should chunk document successfully', () => {
      const result = DocumentChunker.chunkDocument(mockExtraction, 'doc-123', 'Test', 'ICMS');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].documentId).toBe('doc-123');
      }
    });

    it('should generate unique chunk IDs', () => {
      const result = DocumentChunker.chunkDocument(mockExtraction, 'doc-123', 'Test', 'ICMS');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const ids = result.value.map((c) => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('should set correct metadata', () => {
      const result = DocumentChunker.chunkDocument(mockExtraction, 'doc-123', 'Test Doc', 'ICMS');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value[0].metadata.category).toBe('ICMS');
        expect(result.value[0].metadata.source).toBe('Test Doc');
      }
    });
  });

  describe('validation', () => {
    it('should fail if text is empty', () => {
      const empty = { ...mockExtraction, text: '' };
      const result = DocumentChunker.chunkDocument(empty, 'doc-1', 'Test', 'ICMS');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail if documentId is empty', () => {
      const result = DocumentChunker.chunkDocument(mockExtraction, '', 'Test', 'ICMS');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail if documentTitle is empty', () => {
      const result = DocumentChunker.chunkDocument(mockExtraction, 'doc-1', '', 'ICMS');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail if chunkSize too small', () => {
      const result = DocumentChunker.chunkDocument(mockExtraction, 'doc-1', 'Test', 'ICMS', { chunkSize: 50 });
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail if chunkOverlap >= chunkSize', () => {
      const result = DocumentChunker.chunkDocument(mockExtraction, 'doc-1', 'Test', 'ICMS', { chunkSize: 100, chunkOverlap: 100 });
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('detectCategory', () => {
    it('should detect ICMS', () => {
      expect(DocumentChunker.detectCategory('Lei Kandir ICMS')).toBe('ICMS');
    });

    it('should detect PIS_COFINS', () => {
      expect(DocumentChunker.detectCategory('COFINS Lei 10.833')).toBe('PIS_COFINS');
    });

    it('should detect CTe', () => {
      expect(DocumentChunker.detectCategory('Conhecimento de Transporte CT-e')).toBe('CTe');
    });

    it('should detect NFe', () => {
      expect(DocumentChunker.detectCategory('Nota Fiscal Eletrônica NFe')).toBe('NFe');
    });

    it('should detect SPED', () => {
      expect(DocumentChunker.detectCategory('SPED Fiscal EFD')).toBe('SPED');
    });

    it('should detect REFORMA_TRIBUTARIA', () => {
      expect(DocumentChunker.detectCategory('Reforma Tributária IBS CBS')).toBe('REFORMA_TRIBUTARIA');
    });

    it('should default to GERAL', () => {
      expect(DocumentChunker.detectCategory('Texto genérico')).toBe('GERAL');
    });
  });
});
