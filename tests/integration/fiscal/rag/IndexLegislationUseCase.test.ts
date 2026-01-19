/**
 * Testes de Integração - IndexLegislationUseCase
 *
 * @module tests/integration/fiscal/rag
 * @see E-Agent-Fase-D4
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { DocumentChunker } from '@/modules/fiscal/domain/services/rag/DocumentChunker';
import type { DocumentExtractionResult } from '@/shared/infrastructure/docling';

// Mock extraction
const mockExtraction: DocumentExtractionResult = {
  text: 'Art. 12. Fato gerador. Art. 13. Alíquota 12%.',
  tables: [],
  metadata: { pageCount: 2, title: 'Lei 87/96', fileSize: 1000 },
  processingTimeMs: 100,
};

describe('IndexLegislationUseCase Integration', () => {
  describe('DocumentChunker integration', () => {
    it('should chunk extracted document', () => {
      const result = DocumentChunker.chunkDocument(
        mockExtraction,
        'lei-kandir-123',
        'Lei Complementar 87/96',
        'ICMS'
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].documentId).toBe('lei-kandir-123');
      }
    });

    it('should detect category from text', () => {
      const category = DocumentChunker.detectCategory(mockExtraction.text);
      expect(category).toBe('GERAL');
    });

    it('should detect ICMS category from Lei Kandir', () => {
      const category = DocumentChunker.detectCategory('LEI COMPLEMENTAR 87 ICMS');
      expect(category).toBe('ICMS');
    });
  });

  describe('Validation', () => {
    it('should fail on empty filePath', () => {
      // Validation logic is in UseCase - here just verify chunker
      const result = DocumentChunker.chunkDocument(
        mockExtraction,
        '', // empty ID = should fail
        'Test',
        'ICMS'
      );
      expect(Result.isFail(result)).toBe(true);
    });
  });
});
