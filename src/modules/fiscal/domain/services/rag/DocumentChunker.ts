/**
 * DocumentChunker - Domain Service
 *
 * Divide documentos em chunks para indexação no vector store.
 * 100% Stateless, ZERO dependências externas.
 *
 * @module fiscal/domain/services/rag
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D4
 */

import { Result } from '@/shared/domain';
import type { DocumentExtractionResult } from '@/shared/domain';
import type {
  DocumentChunk,
  ChunkMetadata,
  LegislationCategory,
  ChunkingOptions,
} from './types';

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
  // Artigo: "Art. 12", "Artigo 12º"
  ARTIGO: /\b(?:Art\.?|Artigo)\s*(\d+º?)\b/gi,

  // Parágrafo: "§ 1º", "§1º", "Parágrafo único"
  PARAGRAFO: /(?:§\s*(\d+º?)|Parágrafo\s+único)/gi,

  // Inciso: "I -", "II)", "III."
  INCISO: /\b([IVXLCDM]+)\s*[-).]/g,

  // Alínea: "a)", "b)"
  ALINEA: /\b([a-z])\)/g,

  // Capítulo: "CAPÍTULO I", "Capítulo II"
  CAPITULO: /\b(?:CAP[ÍI]TULO|Cap[íi]tulo)\s+([IVXLCDM]+|\d+)/gi,

  // Seção: "Seção I", "SEÇÃO II"
  SECAO: /\b(?:SE[ÇC][ÃA]O|Se[çc][ãa]o)\s+([IVXLCDM]+|\d+)/gi,

  // Fim de sentença
  SENTENCE_END: /[.!?]\s+/g,

  // Quebra de parágrafo
  PARAGRAPH_BREAK: /\n\s*\n/g,
} as const;

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Chunker de documentos para RAG.
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless (métodos estáticos)
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 * - DOMAIN-SVC-004: NUNCA faz throw
 * - DOMAIN-SVC-005: ZERO dependências de infraestrutura
 */
export class DocumentChunker {
  // Impede instanciação
  private constructor() {}

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Divide documento extraído em chunks para indexação.
   *
   * @param extraction - Resultado da extração do Docling
   * @param documentId - ID único do documento
   * @param documentTitle - Título do documento
   * @param category - Categoria da legislação
   * @param options - Opções de chunking
   * @returns Lista de chunks ou erro
   */
  static chunkDocument(
    extraction: DocumentExtractionResult,
    documentId: string,
    documentTitle: string,
    category: LegislationCategory,
    options?: ChunkingOptions
  ): Result<DocumentChunk[], string> {
    // Validar input
    if (!extraction || !extraction.text) {
      return Result.fail('Extração vazia ou inválida');
    }

    const text = extraction.text.trim();
    if (text.length === 0) {
      return Result.fail('Documento sem texto para indexar');
    }

    if (!documentId) {
      return Result.fail('documentId é obrigatório');
    }

    if (!documentTitle) {
      return Result.fail('documentTitle é obrigatório');
    }

    const chunkSize = options?.chunkSize ?? 1000;
    const chunkOverlap = options?.chunkOverlap ?? 200;
    const detectSections = options?.detectSections ?? true;

    if (chunkSize <= chunkOverlap) {
      return Result.fail('chunkSize deve ser maior que chunkOverlap');
    }

    if (chunkSize < 100) {
      return Result.fail('chunkSize deve ser pelo menos 100 caracteres');
    }

    // Gerar chunks
    const chunks = this.generateChunks(
      text,
      documentId,
      documentTitle,
      category,
      chunkSize,
      chunkOverlap,
      detectSections,
      extraction.metadata.pageCount
    );

    if (chunks.length === 0) {
      return Result.fail('Nenhum chunk gerado');
    }

    return Result.ok(chunks);
  }

  /**
   * Estima a categoria da legislação a partir do texto.
   */
  static detectCategory(text: string): LegislationCategory {
    const upperText = text.toUpperCase();

    // ICMS
    if (
      upperText.includes('ICMS') ||
      upperText.includes('LEI COMPLEMENTAR 87') ||
      upperText.includes('LEI KANDIR')
    ) {
      return 'ICMS';
    }

    // PIS/COFINS
    if (
      upperText.includes('PIS') ||
      upperText.includes('COFINS') ||
      upperText.includes('LEI 10.637') ||
      upperText.includes('LEI 10.833')
    ) {
      return 'PIS_COFINS';
    }

    // CTe
    if (
      upperText.includes('CONHECIMENTO DE TRANSPORTE') ||
      upperText.includes('CT-E') ||
      upperText.includes('CTE')
    ) {
      return 'CTe';
    }

    // NFe
    if (
      upperText.includes('NOTA FISCAL ELETRONICA') ||
      upperText.includes('NF-E') ||
      upperText.includes('NFE') ||
      upperText.includes('DANFE')
    ) {
      return 'NFe';
    }

    // NFS-e
    if (
      upperText.includes('NOTA FISCAL DE SERVICO') ||
      upperText.includes('NFS-E') ||
      upperText.includes('NFSE')
    ) {
      return 'NFSe';
    }

    // MDFe
    if (
      upperText.includes('MANIFESTO') ||
      upperText.includes('MDF-E') ||
      upperText.includes('MDFE')
    ) {
      return 'MDFe';
    }

    // SPED
    if (
      upperText.includes('SPED') ||
      upperText.includes('ESCRITURACAO DIGITAL') ||
      upperText.includes('EFD')
    ) {
      return 'SPED';
    }

    // IPI
    if (upperText.includes('IPI') || upperText.includes('IMPOSTO SOBRE PRODUTOS INDUSTRIALIZADOS')) {
      return 'IPI';
    }

    // ISS
    if (
      upperText.includes('ISS') ||
      upperText.includes('IMPOSTO SOBRE SERVICO') ||
      upperText.includes('LC 116')
    ) {
      return 'ISS';
    }

    // Reforma Tributária
    if (
      upperText.includes('REFORMA TRIBUTARIA') ||
      upperText.includes('IBS') ||
      upperText.includes('CBS') ||
      upperText.includes('EC 132')
    ) {
      return 'REFORMA_TRIBUTARIA';
    }

    return 'GERAL';
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Gera chunks a partir do texto.
   */
  private static generateChunks(
    text: string,
    documentId: string,
    documentTitle: string,
    category: LegislationCategory,
    chunkSize: number,
    chunkOverlap: number,
    detectSections: boolean,
    totalPages: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let position = 0;
    let chunkIndex = 0;

    while (position < text.length) {
      // Calcular fim do chunk
      let end = Math.min(position + chunkSize, text.length);

      // Ajustar para não cortar no meio de sentença
      if (end < text.length) {
        end = this.findBestBreakPoint(text, position, end);
      }

      const content = text.slice(position, end).trim();

      if (content.length > 0) {
        const chunk: DocumentChunk = {
          id: `${documentId}_chunk_${chunkIndex}`,
          documentId,
          documentTitle,
          content,
          metadata: {
            pageNumber: this.estimatePageNumber(position, text.length, totalPages),
            chunkIndex,
            totalChunks: 0, // Será atualizado depois
            source: documentTitle,
            section: detectSections ? this.detectSection(content) : undefined,
            category,
          },
        };

        chunks.push(chunk);
        chunkIndex++;
      }

      // Avançar posição com overlap
      position = end - chunkOverlap;
      if (position <= 0 && chunkIndex > 0) position = end; // Evitar loop infinito
    }

    // Atualizar totalChunks em todos os chunks
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Encontra melhor ponto de quebra (fim de sentença ou parágrafo).
   */
  private static findBestBreakPoint(
    text: string,
    start: number,
    end: number
  ): number {
    // Janela para procurar quebra (últimos 20% do chunk)
    const windowStart = Math.max(start, end - Math.floor((end - start) * 0.2));

    // Procurar quebra de parágrafo primeiro
    const paragraphBreak = text.lastIndexOf('\n\n', end);
    if (paragraphBreak > windowStart) {
      return paragraphBreak + 2;
    }

    // Procurar fim de sentença
    const window = text.slice(windowStart, end);
    const sentenceEndMatch = window.match(/[.!?]\s+/g);
    if (sentenceEndMatch) {
      const lastMatch = sentenceEndMatch[sentenceEndMatch.length - 1];
      const matchIndex = window.lastIndexOf(lastMatch);
      if (matchIndex !== -1) {
        return windowStart + matchIndex + lastMatch.length;
      }
    }

    // Procurar quebra de linha simples
    const lineBreak = text.lastIndexOf('\n', end);
    if (lineBreak > windowStart) {
      return lineBreak + 1;
    }

    // Procurar espaço
    const space = text.lastIndexOf(' ', end);
    if (space > windowStart) {
      return space + 1;
    }

    return end;
  }

  /**
   * Estima número da página baseado na posição no texto.
   */
  private static estimatePageNumber(
    position: number,
    totalLength: number,
    totalPages: number
  ): number {
    if (totalPages <= 1) return 1;
    if (totalLength === 0) return 1;

    const percentage = position / totalLength;
    const page = Math.floor(percentage * totalPages) + 1;
    return Math.min(page, totalPages);
  }

  /**
   * Detecta seção/artigo no conteúdo do chunk.
   */
  private static detectSection(content: string): string | undefined {
    const sections: string[] = [];

    // Detectar Capítulo
    const capitulo = content.match(PATTERNS.CAPITULO);
    if (capitulo) {
      sections.push(`Capítulo ${capitulo[1]}`);
    }

    // Detectar Seção
    const secao = content.match(PATTERNS.SECAO);
    if (secao) {
      sections.push(`Seção ${secao[1]}`);
    }

    // Detectar Artigo
    const artigos = content.match(PATTERNS.ARTIGO);
    if (artigos && artigos.length > 0) {
      // Pegar primeiro artigo encontrado
      const artigoMatch = artigos[0].match(/(\d+)/);
      if (artigoMatch) {
        sections.push(`Art. ${artigoMatch[1]}`);
      }
    }

    // Detectar Parágrafo
    const paragrafo = content.match(PATTERNS.PARAGRAFO);
    if (paragrafo) {
      if (paragrafo[0].toLowerCase().includes('único')) {
        sections.push('§ único');
      } else if (paragrafo[1]) {
        sections.push(`§ ${paragrafo[1]}`);
      }
    }

    if (sections.length === 0) {
      return undefined;
    }

    return sections.join(', ');
  }
}
