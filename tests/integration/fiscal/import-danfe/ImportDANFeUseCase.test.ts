/**
 * Testes de Integração - ImportDANFeUseCase
 *
 * Testes do caso de uso de importação de DANFe com mocks do Docling.
 *
 * @module tests/integration/fiscal/import-danfe
 * @see E-Agent-Fase-D2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { ImportDANFeUseCase } from '@/modules/fiscal/application/commands/import-danfe';
import type { DoclingClient } from '@/shared/infrastructure/docling';
import {
  mockDoclingExtraction,
  mockExtractionEmpty,
} from '../../../unit/modules/fiscal/domain/services/danfe/fixtures/danfe-extraction-mock';

// ============================================================================
// MOCK DOCLING CLIENT
// ============================================================================

function createMockDoclingClient(
  processDocumentResult: ReturnType<typeof Result.ok | typeof Result.fail>
): DoclingClient {
  return {
    processDocument: vi.fn().mockResolvedValue(processDocumentResult),
    extractTables: vi.fn().mockResolvedValue(Result.ok([])),
    extractText: vi.fn().mockResolvedValue(Result.ok('')),
    healthCheck: vi.fn().mockResolvedValue(Result.ok({ status: 'healthy', version: '1.0.0', uptime: 100, doclingVersion: '2.0.0' })),
  } as unknown as DoclingClient;
}

// ============================================================================
// TESTES
// ============================================================================

describe('ImportDANFeUseCase', () => {
  let useCase: ImportDANFeUseCase;
  let mockDoclingClient: DoclingClient;

  beforeEach(() => {
    mockDoclingClient = createMockDoclingClient(Result.ok(mockDoclingExtraction));
    useCase = new ImportDANFeUseCase(mockDoclingClient);
  });

  // ==========================================================================
  // SUCCESSFUL IMPORTS
  // ==========================================================================

  describe('Successful imports', () => {
    it('should import DANFe successfully', async () => {
      const result = await useCase.execute({
        filePath: 'danfe.pdf',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.danfe).toBeDefined();
        expect(result.value.danfe.chaveAcesso).toBeTruthy();
        expect(result.value.danfe.emitente).toBeDefined();
        expect(result.value.danfe.destinatario).toBeDefined();
        expect(result.value.danfe.produtos.length).toBeGreaterThan(0);
      }
    });

    it('should return extraction metadata', async () => {
      const result = await useCase.execute({
        filePath: 'danfe.pdf',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.extractionMetadata).toBeDefined();
        expect(result.value.extractionMetadata.processingTimeMs).toBe(1500);
        expect(result.value.extractionMetadata.pageCount).toBe(1);
        expect(result.value.extractionMetadata.tablesFound).toBe(1);
      }
    });

    it('should call DoclingClient.processDocument with correct path', async () => {
      await useCase.execute({
        filePath: 'uploads/test.pdf',
      });

      expect(mockDoclingClient.processDocument).toHaveBeenCalledWith('uploads/test.pdf');
    });
  });

  // ==========================================================================
  // INPUT VALIDATION
  // ==========================================================================

  describe('Input validation', () => {
    it('should fail if input is null', async () => {
      const result = await useCase.execute(null as unknown as { filePath: string });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('obrigatório');
      }
    });

    it('should fail if filePath is empty', async () => {
      const result = await useCase.execute({
        filePath: '',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Caminho');
      }
    });

    it('should fail if filePath is not PDF', async () => {
      const result = await useCase.execute({
        filePath: 'document.docx',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('PDF');
      }
    });

    it('should fail if filePath contains path traversal', async () => {
      const result = await useCase.execute({
        filePath: '../../../etc/secret.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('inválido');
      }
    });

    it('should fail if filePath is absolute', async () => {
      const result = await useCase.execute({
        filePath: '/absolute/path/file.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('inválido');
      }
    });

    it('should accept PDF with uppercase extension', async () => {
      const result = await useCase.execute({
        filePath: 'document.PDF',
      });

      expect(Result.isOk(result)).toBe(true);
    });
  });

  // ==========================================================================
  // DOCLING ERRORS
  // ==========================================================================

  describe('Docling errors', () => {
    it('should fail if Docling returns error', async () => {
      mockDoclingClient = createMockDoclingClient(
        Result.fail('Connection refused')
      );
      useCase = new ImportDANFeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'danfe.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('processar PDF');
        expect(result.error).toContain('Connection refused');
      }
    });

    it('should fail if Docling returns empty extraction', async () => {
      mockDoclingClient = createMockDoclingClient(
        Result.ok(mockExtractionEmpty)
      );
      useCase = new ImportDANFeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'danfe.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('extrair dados');
      }
    });
  });

  // ==========================================================================
  // PARSING ERRORS
  // ==========================================================================

  describe('Parsing errors', () => {
    it('should fail if chave de acesso not found', async () => {
      const extractionNoChave = {
        ...mockDoclingExtraction,
        text: 'Texto sem chave de acesso',
      };
      mockDoclingClient = createMockDoclingClient(Result.ok(extractionNoChave));
      useCase = new ImportDANFeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'danfe.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.toLowerCase()).toContain('chave');
      }
    });

    it('should fail if products table not found', async () => {
      const extractionNoProducts = {
        ...mockDoclingExtraction,
        tables: [],
      };
      mockDoclingClient = createMockDoclingClient(Result.ok(extractionNoProducts));
      useCase = new ImportDANFeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'danfe.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.toLowerCase()).toContain('produto');
      }
    });
  });
});
