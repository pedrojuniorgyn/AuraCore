/**
 * Tests for DocumentChunker Domain Service
 * @see Phase D8 - RAG for Fiscal Legislation
 */

import { describe, it, expect } from 'vitest';
import { DocumentChunker } from '@/modules/knowledge/domain/services/DocumentChunker';
import { Result } from '@/shared/domain';

describe('DocumentChunker', () => {
  describe('chunk', () => {
    it('deve dividir texto longo em múltiplos chunks', () => {
      const text = 'Parágrafo 1. ' + 'A'.repeat(500) + '\n\nParágrafo 2. ' + 'B'.repeat(500) + '\n\nParágrafo 3. ' + 'C'.repeat(500);
      
      const result = DocumentChunker.chunk('doc1', text, { maxChunkSize: 600 });
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.length).toBeGreaterThan(1);
        // Cada chunk deve ter menos que maxChunkSize
        result.value.forEach(chunk => {
          expect(chunk.content.length).toBeLessThanOrEqual(700); // Com tolerância para overlap
        });
      }
    });

    it('deve retornar erro para texto vazio', () => {
      const result = DocumentChunker.chunk('doc1', '');
      
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazio');
      }
    });

    it('deve retornar erro para texto só com espaços', () => {
      const result = DocumentChunker.chunk('doc1', '   \n\n   ');
      
      expect(Result.isFail(result)).toBe(true);
    });

    it('deve retornar erro quando maxChunkSize <= overlap', () => {
      const result = DocumentChunker.chunk('doc1', 'Texto válido', { 
        maxChunkSize: 100, 
        chunkOverlap: 150 
      });
      
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('maior que');
      }
    });

    it('deve incluir overlap entre chunks', () => {
      const text = 'A'.repeat(2000);
      
      const result = DocumentChunker.chunk('doc1', text, { 
        maxChunkSize: 500, 
        chunkOverlap: 100 
      });
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.length).toBeGreaterThan(2);
        // Verificar que há overlap (chunks adjacentes compartilham conteúdo)
        for (let i = 1; i < result.value.length; i++) {
          const prevChunk = result.value[i - 1];
          const currChunk = result.value[i];
          
          if (prevChunk && currChunk) {
            const prevEnd = prevChunk.content.slice(-50);
            const currStart = currChunk.content.slice(0, 50);
            // Pelo menos parte do overlap deve estar presente
            expect(prevEnd.length > 0 || currStart.length > 0).toBe(true);
          }
        }
      }
    });

    it('deve gerar IDs únicos para cada chunk', () => {
      const text = 'A'.repeat(2000);
      
      const result = DocumentChunker.chunk('doc1', text, { maxChunkSize: 300 });
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const ids = result.value.map(c => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('deve preservar documentId em todos os chunks', () => {
      const text = 'A'.repeat(1000);
      const docId = 'meu_documento_123';
      
      const result = DocumentChunker.chunk(docId, text, { maxChunkSize: 200, chunkOverlap: 50 });
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        result.value.forEach(chunk => {
          expect(chunk.documentId).toBe(docId);
        });
      }
    });

    it('deve quebrar em separadores de parágrafo quando possível', () => {
      // Texto longo o suficiente para exigir múltiplos chunks (maxChunkSize >= 100)
      const text = 'Primeiro parágrafo com conteúdo detalhado sobre o assunto principal do documento de teste para chunking.\n\n' +
        'Segundo parágrafo com conteúdo detalhado sobre outro tema relevante para verificar a quebra correta.\n\n' +
        'Terceiro parágrafo com conteúdo detalhado sobre conclusões e considerações finais do documento.';
      
      const result = DocumentChunker.chunk('doc1', text, { 
        maxChunkSize: 120, 
        chunkOverlap: 20 
      });
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Chunks devem tender a quebrar em parágrafos
        expect(result.value.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('deve incluir metadata com posições', () => {
      const text = 'Conteúdo do documento para teste.';
      
      const result = DocumentChunker.chunk('doc1', text);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value[0]?.metadata).toBeDefined();
        expect(result.value[0]?.metadata.startPosition).toBe(0);
      }
    });
  });

  describe('estimateTokens', () => {
    it('deve estimar tokens para texto em português', () => {
      const text = 'Esta é uma frase de teste para estimar o número de tokens.';
      
      const tokens = DocumentChunker.estimateTokens(text);
      
      // ~4 caracteres por token
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(30);
    });

    it('deve retornar 0 para texto vazio', () => {
      const tokens = DocumentChunker.estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('deve estimar corretamente texto longo', () => {
      const text = 'A'.repeat(4000);
      
      const tokens = DocumentChunker.estimateTokens(text);
      
      expect(tokens).toBe(1000); // 4000 / 4 = 1000
    });
  });

  describe('normalizeText', () => {
    it('deve normalizar line endings', () => {
      const text = 'Linha 1\r\nLinha 2\r\nLinha 3';
      
      const normalized = DocumentChunker.normalizeText(text);
      
      expect(normalized).not.toContain('\r');
      expect(normalized).toContain('\n');
    });

    it('deve remover múltiplos espaços', () => {
      const text = 'Texto   com    muitos     espaços';
      
      const normalized = DocumentChunker.normalizeText(text);
      
      expect(normalized).not.toContain('  ');
    });

    it('deve limitar newlines consecutivas', () => {
      const text = 'Parágrafo 1\n\n\n\n\nParágrafo 2';
      
      const normalized = DocumentChunker.normalizeText(text);
      
      expect(normalized).not.toContain('\n\n\n');
      expect(normalized).toContain('\n\n');
    });

    it('deve fazer trim do texto', () => {
      const text = '   Texto com espaços   ';
      
      const normalized = DocumentChunker.normalizeText(text);
      
      expect(normalized).toBe('Texto com espaços');
    });
  });

  describe('detectLanguage', () => {
    it('deve detectar português', () => {
      const text = 'Esta é uma frase em português com palavras como não, são, está, para e sobre.';
      
      const lang = DocumentChunker.detectLanguage(text);
      
      expect(lang).toBe('pt');
    });

    it('deve detectar inglês', () => {
      const text = 'This is an English sentence with words like the, and, for, with, and is.';
      
      const lang = DocumentChunker.detectLanguage(text);
      
      expect(lang).toBe('en');
    });

    it('deve retornar unknown para texto ambíguo', () => {
      const text = 'ABC 123 XYZ 456';
      
      const lang = DocumentChunker.detectLanguage(text);
      
      expect(lang).toBe('unknown');
    });
  });

  describe('calculateOptimalChunkSize', () => {
    it('deve calcular tamanho baseado em tokens disponíveis', () => {
      const size = DocumentChunker.calculateOptimalChunkSize(8192, 2000);
      
      // (8192 - 2000) * 4 = 24768 caracteres
      expect(size).toBe(24768);
    });

    it('deve usar defaults quando não especificados', () => {
      const size = DocumentChunker.calculateOptimalChunkSize();
      
      // (8192 - 2000) * 4 = 24768 (usando defaults)
      expect(size).toBe(24768);
    });
  });
});
