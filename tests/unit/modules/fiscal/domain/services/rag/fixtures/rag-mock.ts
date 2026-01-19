/**
 * Fixtures para testes RAG
 *
 * @module tests/unit/modules/fiscal/domain/services/rag/fixtures
 */

import type { DocumentExtractionResult } from '@/shared/infrastructure/docling';
import type {
  DocumentChunk,
  SearchResult,
  RAGResponse,
  IndexedDocument,
} from '@/modules/fiscal/domain/services/rag/types';

// ============================================================================
// MOCK EXTRACTION RESULT
// ============================================================================

export const mockLegislationText = `LEI COMPLEMENTAR 87/96

Art. 12. Fato gerador no momento da saída de mercadoria.

Art. 13. Alíquota interestadual 12% Sul/Sudeste para Norte/Nordeste/Centro-Oeste.

Art. 14. Base de cálculo: valor da operação.`;

export const mockDoclingExtraction: DocumentExtractionResult = {
  text: mockLegislationText,
  tables: [],
  metadata: {
    pageCount: 5,
    title: 'Lei Complementar 87/96',
    fileSize: 150000,
  },
  processingTimeMs: 2500,
};

// ============================================================================
// MOCK CHUNKS
// ============================================================================

export const mockChunks: DocumentChunk[] = [
  {
    id: 'lei-kandir-123_chunk_0',
    documentId: 'lei-kandir-123',
    documentTitle: 'Lei Complementar 87/96 - Lei Kandir',
    content: 'Art. 12. Considera-se ocorrido o fato gerador do imposto no momento da saída de mercadoria de estabelecimento de contribuinte.',
    metadata: {
      pageNumber: 1,
      chunkIndex: 0,
      totalChunks: 3,
      source: 'Lei Complementar 87/96',
      section: 'Art. 12',
      category: 'ICMS',
    },
  },
  {
    id: 'lei-kandir-123_chunk_1',
    documentId: 'lei-kandir-123',
    documentTitle: 'Lei Complementar 87/96 - Lei Kandir',
    content: 'Art. 13. A alíquota do imposto nas operações interestaduais será 12% para operações das Regiões Sul e Sudeste destinadas às Regiões Norte, Nordeste e Centro-Oeste.',
    metadata: {
      pageNumber: 2,
      chunkIndex: 1,
      totalChunks: 3,
      source: 'Lei Complementar 87/96',
      section: 'Art. 13',
      category: 'ICMS',
    },
  },
  {
    id: 'lei-kandir-123_chunk_2',
    documentId: 'lei-kandir-123',
    documentTitle: 'Lei Complementar 87/96 - Lei Kandir',
    content: 'Art. 14. A base de cálculo do imposto é, na saída de mercadoria, o valor da operação.',
    metadata: {
      pageNumber: 2,
      chunkIndex: 2,
      totalChunks: 3,
      source: 'Lei Complementar 87/96',
      section: 'Art. 14',
      category: 'ICMS',
    },
  },
];

export const mockChunksWithEmbedding: DocumentChunk[] = mockChunks.map((chunk) => ({
  ...chunk,
  embedding: Array(1536).fill(0.1), // Mock embedding
}));

// ============================================================================
// MOCK SEARCH RESULTS
// ============================================================================

export const mockSearchResults: SearchResult[] = [
  {
    chunk: mockChunks[1],
    score: 0.92,
    distance: 0.08,
  },
  {
    chunk: mockChunks[0],
    score: 0.85,
    distance: 0.15,
  },
];

// ============================================================================
// MOCK RAG RESPONSE
// ============================================================================

export const mockRAGResponse: RAGResponse = {
  answer: 'A alíquota de ICMS para operações interestaduais de SP para RJ é de 12%, conforme Art. 13 da Lei Complementar 87/96.',
  citations: [
    {
      documentTitle: 'Lei Complementar 87/96 - Lei Kandir',
      source: 'Lei Complementar 87/96, Art. 13',
      excerpt: 'A alíquota do imposto nas operações interestaduais será 12%...',
      pageNumber: 2,
      relevanceScore: 0.92,
    },
  ],
  confidence: 0.9,
  processingTimeMs: 1500,
};

// ============================================================================
// MOCK INDEXED DOCUMENTS
// ============================================================================

export const mockIndexedDocuments: IndexedDocument[] = [
  {
    id: 'lei-kandir-123',
    title: 'Lei Complementar 87/96 - Lei Kandir',
    fileName: 'lei_kandir.pdf',
    category: 'ICMS',
    totalChunks: 3,
    indexedAt: new Date('2026-01-18'),
    metadata: {
      pageCount: 5,
      fileSize: 150000,
      processingTimeMs: 2500,
    },
  },
  {
    id: 'manual-cte-456',
    title: 'Manual CTe 4.0',
    fileName: 'manual_cte.pdf',
    category: 'CTe',
    totalChunks: 15,
    indexedAt: new Date('2026-01-17'),
    metadata: {
      pageCount: 50,
      fileSize: 2500000,
      processingTimeMs: 8000,
    },
  },
];

// ============================================================================
// MOCK EMBEDDINGS
// ============================================================================

export const mockEmbedding: number[] = Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1));
export const mockEmbeddings: number[][] = [
  mockEmbedding,
  mockEmbedding.map((v) => v * 0.9),
  mockEmbedding.map((v) => v * 0.8),
];
