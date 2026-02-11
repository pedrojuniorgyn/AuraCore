/**
 * DocumentChunker - Domain Service
 * 
 * Serviço stateless para divisão de documentos em chunks
 * otimizados para indexação vetorial e busca semântica.
 * 
 * @module knowledge/domain/services
 * @see DOMAIN-SVC-001 to DOMAIN-SVC-010
 */

import { Result } from '@/shared/domain';
import type {
  DocumentChunk,
  ChunkOptions,
} from '../types';
import { DEFAULT_CHUNK_OPTIONS } from '../types';

/**
 * Domain Service para chunking de documentos
 * 100% stateless, métodos estáticos (DOMAIN-SVC-001)
 */
export class DocumentChunker {
  // Constructor privado (DOMAIN-SVC-002)
  private constructor() {}

  /**
   * Divide texto em chunks para indexação vetorial
   * 
   * @param documentId - ID do documento pai
   * @param text - Texto completo do documento
   * @param options - Opções de chunking
   * @returns Array de chunks ou erro
   */
  static chunk(
    documentId: string,
    text: string,
    options: ChunkOptions = {}
  ): Result<DocumentChunk[], string> {
    // Mesclar opções com defaults
    const maxSize = options.maxChunkSize ?? DEFAULT_CHUNK_OPTIONS.maxChunkSize;
    const overlap = options.chunkOverlap ?? DEFAULT_CHUNK_OPTIONS.chunkOverlap;
    const separators = options.separators ?? DEFAULT_CHUNK_OPTIONS.separators;

    // Validações
    if (!text || text.trim().length === 0) {
      return Result.fail('Texto vazio não pode ser dividido em chunks');
    }

    if (maxSize <= overlap) {
      return Result.fail('maxChunkSize deve ser maior que chunkOverlap');
    }

    if (maxSize < 100) {
      return Result.fail('maxChunkSize deve ser pelo menos 100 caracteres');
    }

    const chunks: DocumentChunk[] = [];
    let currentPosition = 0;
    let chunkIndex = 0;
    const textLength = text.length;

    while (currentPosition < textLength) {
      // Calcular fim do chunk
      let chunkEnd = Math.min(currentPosition + maxSize, textLength);

      // Se não chegou ao fim, tentar quebrar em um separador
      if (chunkEnd < textLength) {
        const searchStart = Math.max(currentPosition + maxSize - 200, currentPosition);
        const searchText = text.slice(searchStart, chunkEnd);
        
        let bestSplit = -1;
        for (const sep of separators) {
          const lastIndex = searchText.lastIndexOf(sep);
          if (lastIndex > bestSplit) {
            bestSplit = lastIndex;
          }
        }

        if (bestSplit > 0) {
          chunkEnd = searchStart + bestSplit + 1;
        }
      }

      const chunkContent = text.slice(currentPosition, chunkEnd).trim();

      if (chunkContent.length > 0) {
        chunks.push({
          id: `${documentId}_chunk_${String(chunkIndex).padStart(4, '0')}`,
          documentId,
          content: chunkContent,
          chunkIndex,
          metadata: {
            startPosition: currentPosition,
            endPosition: chunkEnd,
            charCount: chunkContent.length,
          },
        });
        chunkIndex++;
      }

      // Se chegou ao fim do texto, parar (todo conteúdo já foi processado)
      if (chunkEnd >= textLength) {
        break;
      }

      // Mover posição com overlap, garantindo progresso para frente
      currentPosition = Math.max(chunkEnd - overlap, currentPosition + 1);
    }

    return Result.ok(chunks);
  }

  /**
   * Estima número de tokens (aproximação para português)
   * 1 token ≈ 4 caracteres em português
   * 
   * @param text - Texto para estimar
   * @returns Número aproximado de tokens
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calcula tamanho ideal de chunk baseado no modelo
   * 
   * @param modelMaxTokens - Limite de tokens do modelo (ex: 8192)
   * @param reserveForContext - Tokens reservados para contexto
   * @returns Tamanho máximo em caracteres
   */
  static calculateOptimalChunkSize(
    modelMaxTokens: number = 8192,
    reserveForContext: number = 2000
  ): number {
    const availableTokens = modelMaxTokens - reserveForContext;
    // Convertendo tokens para caracteres (aproximação)
    return availableTokens * 4;
  }

  /**
   * Normaliza texto removendo caracteres especiais e whitespace excessivo
   * 
   * @param text - Texto original
   * @returns Texto normalizado
   */
  static normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')           // Normalizar line endings
      .replace(/\t/g, '  ')              // Tabs para espaços
      .replace(/\n{3,}/g, '\n\n')        // Máximo 2 newlines
      .replace(/ {2,}/g, ' ')            // Remover espaços duplos
      .trim();
  }

  /**
   * Detecta idioma predominante do texto (simplificado)
   * 
   * @param text - Texto para análise
   * @returns Código do idioma detectado
   */
  static detectLanguage(text: string): 'pt' | 'en' | 'unknown' {
    const ptPatterns = [
      /\b(de|da|do|das|dos|em|no|na|para|com|por|sobre|entre|após)\b/gi,
      /\b(não|sim|são|está|estão|pode|deve|será|foi)\b/gi,
      /ção\b/gi,
      /ões\b/gi,
    ];

    const enPatterns = [
      /\b(the|and|or|of|in|to|for|with|on|at|by|from)\b/gi,
      /\b(is|are|was|were|will|can|should|must|have|has)\b/gi,
      /tion\b/gi,
      /ing\b/gi,
    ];

    let ptScore = 0;
    let enScore = 0;

    for (const pattern of ptPatterns) {
      const matches = text.match(pattern);
      ptScore += matches ? matches.length : 0;
    }

    for (const pattern of enPatterns) {
      const matches = text.match(pattern);
      enScore += matches ? matches.length : 0;
    }

    if (ptScore > enScore * 1.5) return 'pt';
    if (enScore > ptScore * 1.5) return 'en';
    return 'unknown';
  }
}
