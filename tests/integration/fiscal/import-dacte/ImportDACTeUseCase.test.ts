/**
 * Testes de Integração - ImportDACTeUseCase
 *
 * Testes do caso de uso de importação de DACTe com mocks do Docling.
 *
 * @module tests/integration/fiscal/import-dacte
 * @see E-Agent-Fase-D3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { ImportDACTeUseCase } from '@/modules/fiscal/application/commands/import-dacte';
import type { DoclingClient } from '@/shared/infrastructure/docling';
import {
  mockDoclingExtraction,
  mockExtractionEmpty,
} from '../../../unit/modules/fiscal/domain/services/dacte/fixtures/dacte-extraction-mock';

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

describe('ImportDACTeUseCase', () => {
  let useCase: ImportDACTeUseCase;
  let mockDoclingClient: DoclingClient;

  beforeEach(() => {
    mockDoclingClient = createMockDoclingClient(Result.ok(mockDoclingExtraction));
    useCase = new ImportDACTeUseCase(mockDoclingClient);
  });

  // ==========================================================================
  // SUCCESSFUL IMPORTS
  // ==========================================================================

  describe('Successful imports', () => {
    it('should import DACTe successfully', async () => {
      const result = await useCase.execute({
        filePath: 'dacte.pdf',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.dacte).toBeDefined();
        expect(result.value.dacte.chaveCTe).toBeTruthy();
        expect(result.value.dacte.emitente).toBeDefined();
        expect(result.value.dacte.remetente).toBeDefined();
        expect(result.value.dacte.destinatario).toBeDefined();
        expect(result.value.dacte.modal).toBe('RODOVIARIO');
      }
    });

    it('should return extraction metadata', async () => {
      const result = await useCase.execute({
        filePath: 'dacte.pdf',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.extractionMetadata).toBeDefined();
        expect(result.value.extractionMetadata.processingTimeMs).toBe(1800);
        expect(result.value.extractionMetadata.pageCount).toBe(1);
        expect(result.value.extractionMetadata.tablesFound).toBe(2);
        expect(result.value.extractionMetadata.documentsFound).toBeGreaterThanOrEqual(0);
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
      useCase = new ImportDACTeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'dacte.pdf',
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
      useCase = new ImportDACTeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'dacte.pdf',
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
    it('should fail if chave CTe not found', async () => {
      const extractionNoChave = {
        ...mockDoclingExtraction,
        text: 'Texto sem chave CTe',
      };
      mockDoclingClient = createMockDoclingClient(Result.ok(extractionNoChave));
      useCase = new ImportDACTeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'dacte.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.toLowerCase()).toContain('chave');
      }
    });

    it('should fail if chave is NFe (wrong model)', async () => {
      // Chave de NFe (modelo 55) ao invés de CTe (modelo 57)
      const extractionWrongModel = {
        ...mockDoclingExtraction,
        text: mockDoclingExtraction.text.replace(
          '35260111222333000181570010000012341000000015', // Chave CTe válida
          '35260111222333000181550010000012341000000018' // Modelo 55 (NFe)
        ),
      };
      mockDoclingClient = createMockDoclingClient(Result.ok(extractionWrongModel));
      useCase = new ImportDACTeUseCase(mockDoclingClient);

      const result = await useCase.execute({
        filePath: 'dacte.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        // O erro pode ser "modelo 57" ou "chave cte inválida" dependendo 
        // de se encontra chave NFe primeiro
        expect(result.error.toLowerCase()).toMatch(/modelo 57|chave.*inv|não encontrad/);
      }
    });
  });
});
