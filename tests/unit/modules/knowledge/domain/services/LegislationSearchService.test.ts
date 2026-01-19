/**
 * Tests for LegislationSearchService Domain Service
 * @see Phase D8 - RAG for Fiscal Legislation
 */

import { describe, it, expect } from 'vitest';
import { LegislationSearchService } from '@/modules/knowledge/domain/services/LegislationSearchService';
import { Result } from '@/shared/domain';
import type { SearchResult, DocumentMetadata, DocumentChunk } from '@/modules/knowledge/domain/types';

describe('LegislationSearchService', () => {
  // Helper para criar mock de SearchResult
  function createMockResult(
    title: string,
    content: string,
    score: number
  ): SearchResult {
    const doc: DocumentMetadata = {
      id: 'doc_' + title.toLowerCase().replace(/\s/g, '_'),
      title,
      type: 'LEGISLATION',
      legislationType: 'ICMS',
      source: '/path/to/file.txt',
      tags: ['icms', 'teste'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const chunk: DocumentChunk = {
      id: doc.id + '_chunk_0',
      documentId: doc.id,
      content,
      chunkIndex: 0,
      metadata: {},
    };

    return { chunk, document: doc, score };
  }

  describe('formatSearchResults', () => {
    it('deve formatar resultados com sucesso', () => {
      const results: SearchResult[] = [
        createMockResult('Lei Kandir', 'Art. 1º O ICMS incide sobre...', 0.9),
        createMockResult('Convênio CONFAZ', 'Fica estabelecido que...', 0.7),
      ];

      const formatted = LegislationSearchService.formatSearchResults(results, 'icms');

      expect(Result.isOk(formatted)).toBe(true);
      if (Result.isOk(formatted)) {
        expect(formatted.value.sources.length).toBe(2);
        expect(formatted.value.confidence).toBeGreaterThan(0);
        expect(formatted.value.disclaimer).toContain('ATENÇÃO');
      }
    });

    it('deve retornar mensagem para resultados vazios', () => {
      const formatted = LegislationSearchService.formatSearchResults([], 'icms');

      expect(Result.isOk(formatted)).toBe(true);
      if (Result.isOk(formatted)) {
        expect(formatted.value.sources.length).toBe(0);
        expect(formatted.value.confidence).toBe(0);
        expect(formatted.value.answer).toContain('Não foram encontrados');
      }
    });

    it('deve ordenar por score e pegar top 5', () => {
      const results: SearchResult[] = [
        createMockResult('Doc 1', 'Conteúdo 1', 0.5),
        createMockResult('Doc 2', 'Conteúdo 2', 0.9),
        createMockResult('Doc 3', 'Conteúdo 3', 0.7),
        createMockResult('Doc 4', 'Conteúdo 4', 0.8),
        createMockResult('Doc 5', 'Conteúdo 5', 0.6),
        createMockResult('Doc 6', 'Conteúdo 6', 0.4),
      ];

      const formatted = LegislationSearchService.formatSearchResults(results, 'teste');

      expect(Result.isOk(formatted)).toBe(true);
      if (Result.isOk(formatted)) {
        expect(formatted.value.sources.length).toBe(5);
        // Primeiro deve ser o de maior score
        expect(formatted.value.sources[0]?.relevance).toBe(90);
      }
    });

    it('deve calcular confiança média', () => {
      const results: SearchResult[] = [
        createMockResult('Doc 1', 'Conteúdo', 0.8),
        createMockResult('Doc 2', 'Conteúdo', 0.6),
      ];

      const formatted = LegislationSearchService.formatSearchResults(results, 'teste');

      expect(Result.isOk(formatted)).toBe(true);
      if (Result.isOk(formatted)) {
        expect(formatted.value.confidence).toBe(0.7); // (0.8 + 0.6) / 2
      }
    });
  });

  describe('identifyLegislationType', () => {
    it('deve identificar ICMS', () => {
      const types = LegislationSearchService.identifyLegislationType(
        'Qual a alíquota do ICMS para transporte interestadual?'
      );

      expect(types).toContain('ICMS');
    });

    it('deve identificar PIS/COFINS', () => {
      const types = LegislationSearchService.identifyLegislationType(
        'Como funciona o regime não cumulativo do PIS e COFINS?'
      );

      expect(types).toContain('PIS_COFINS');
    });

    it('deve identificar Reforma 2026', () => {
      const types = LegislationSearchService.identifyLegislationType(
        'O que é o IBS da reforma tributária de 2026?'
      );

      expect(types).toContain('REFORMA_2026');
    });

    it('deve identificar legislação trabalhista', () => {
      const types = LegislationSearchService.identifyLegislationType(
        'Qual o tempo de descanso obrigatório para motorista?'
      );

      expect(types).toContain('TRABALHISTA');
    });

    it('deve identificar múltiplos tipos', () => {
      const types = LegislationSearchService.identifyLegislationType(
        'Qual a diferença entre ICMS e PIS no transporte de carga?'
      );

      expect(types).toContain('ICMS');
      expect(types).toContain('PIS_COFINS');
    });

    it('deve retornar OUTROS para query genérica', () => {
      const types = LegislationSearchService.identifyLegislationType(
        'Qual é a legislação aplicável?'
      );

      expect(types).toEqual(['OUTROS']);
    });
  });

  describe('extractEntities', () => {
    it('deve extrair números de lei', () => {
      const entities = LegislationSearchService.extractEntities(
        'Conforme a Lei 10.637/02 e Lei Complementar 87/96'
      );

      expect(entities.laws.length).toBeGreaterThan(0);
    });

    it('deve extrair artigos', () => {
      const entities = LegislationSearchService.extractEntities(
        'Veja o artigo 12 e art. 155 da Constituição'
      );

      expect(entities.articles).toContain('12');
      expect(entities.articles).toContain('155');
    });

    it('deve extrair datas', () => {
      const entities = LegislationSearchService.extractEntities(
        'A lei entrou em vigor em 01/01/2024 e vale até 2026'
      );

      expect(entities.dates.length).toBeGreaterThan(0);
    });

    it('deve retornar arrays vazios quando não há entidades', () => {
      const entities = LegislationSearchService.extractEntities(
        'Texto simples sem referências'
      );

      expect(entities.laws).toEqual([]);
      expect(entities.articles).toEqual([]);
    });
  });

  describe('classifyQueryComplexity', () => {
    it('deve classificar query simples', () => {
      const complexity = LegislationSearchService.classifyQueryComplexity(
        'O que é ICMS?'
      );

      expect(complexity).toBe('simple');
    });

    it('deve classificar query moderada', () => {
      const complexity = LegislationSearchService.classifyQueryComplexity(
        'Qual a alíquota do ICMS conforme o artigo 155 da Constituição?'
      );

      expect(complexity).toBe('moderate');
    });

    it('deve classificar query complexa com comparação', () => {
      const complexity = LegislationSearchService.classifyQueryComplexity(
        'Qual a diferença entre ICMS e IBS após a reforma tributária?'
      );

      expect(complexity).toBe('complex');
    });

    it('deve classificar query complexa com múltiplos tipos e referências', () => {
      const complexity = LegislationSearchService.classifyQueryComplexity(
        'Como conciliar a Lei 10.637/02 do PIS com a substituição tributária do ICMS no transporte?'
      );

      expect(complexity).toBe('complex');
    });
  });
});
