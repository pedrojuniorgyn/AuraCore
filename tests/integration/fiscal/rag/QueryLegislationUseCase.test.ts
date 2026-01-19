/**
 * Testes de Integração - QueryLegislationUseCase
 *
 * @module tests/integration/fiscal/rag
 * @see E-Agent-Fase-D4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { QueryLegislationUseCase } from '@/modules/fiscal/application/queries/query-legislation';
import type { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';
import type { RAGResponse } from '@/modules/fiscal/domain/services/rag/types';

// Mock response
const mockRAGResponse: RAGResponse = {
  answer: 'A alíquota é 12%.',
  citations: [{ documentTitle: 'Lei 87/96', source: 'Art. 13', excerpt: '12%', pageNumber: 1, relevanceScore: 0.9 }],
  confidence: 0.9,
  processingTimeMs: 100,
};

describe('QueryLegislationUseCase Integration', () => {
  let useCase: QueryLegislationUseCase;
  let mockRAG: {
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRAG = {
      query: vi.fn().mockResolvedValue(Result.ok(mockRAGResponse)),
    };

    useCase = new QueryLegislationUseCase(mockRAG as unknown as LegislationRAG);
  });

  describe('execute', () => {
    it('should execute query successfully', async () => {
      const result = await useCase.execute({
        question: 'Qual a alíquota de ICMS?',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.answer).toBeDefined();
      }
    });

    it('should call RAG query', async () => {
      await useCase.execute({ question: 'Test question?' });

      expect(mockRAG.query).toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('should fail on empty question', async () => {
      const result = await useCase.execute({ question: '' });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail on short question', async () => {
      const result = await useCase.execute({ question: 'O?' });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should propagate RAG errors', async () => {
      mockRAG.query.mockResolvedValueOnce(Result.fail('RAG error'));

      const result = await useCase.execute({ question: 'Test question?' });

      expect(Result.isFail(result)).toBe(true);
    });
  });
});
