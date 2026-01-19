/**
 * ClaudeAnswerGenerator - Infrastructure Implementation
 *
 * Implementação de IAnswerGenerator usando Anthropic Claude API.
 *
 * @module fiscal/infrastructure/rag
 * @see IAnswerGenerator (domain port)
 * @see E-Agent-Fase-D4
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IAnswerGenerator,
  AnswerGenerationOptions,
} from '@/modules/fiscal/domain/ports/output/IAnswerGenerator';
import type {
  DocumentChunk,
  RAGResponse,
  Citation,
} from '@/modules/fiscal/domain/services/rag/types';

// ============================================================================
// TYPES
// ============================================================================

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ParsedCitation {
  source: string;
  excerpt: string;
  relevance: number;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Implementação de IAnswerGenerator usando Claude API.
 */
@injectable()
export class ClaudeAnswerGenerator implements IAnswerGenerator {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    this.model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  /**
   * Gera resposta com base no contexto.
   */
  async generate(
    query: string,
    context: DocumentChunk[],
    options?: AnswerGenerationOptions
  ): Promise<Result<RAGResponse, string>> {
    if (!this.apiKey) {
      return Result.fail('ANTHROPIC_API_KEY não configurada');
    }

    if (!query || query.trim().length === 0) {
      return Result.fail('Query vazia');
    }

    if (!context || context.length === 0) {
      return Result.fail('Contexto vazio');
    }

    const startTime = Date.now();

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query, context);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.3,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }] as ClaudeMessage[],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return Result.fail(`Claude API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as ClaudeResponse;
      const content = data.content?.[0]?.text ?? '';

      // Parse resposta estruturada
      const parsed = this.parseResponse(content, context);

      return Result.ok({
        ...parsed,
        processingTimeMs: Date.now() - startTime,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Claude generate error: ${message}`);
    }
  }

  /**
   * Verifica saúde do serviço.
   */
  async healthCheck(): Promise<Result<boolean, string>> {
    if (!this.apiKey) {
      return Result.fail('ANTHROPIC_API_KEY não configurada');
    }

    // Claude não tem endpoint de health check, apenas verificamos a key
    return Result.ok(true);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Constrói o system prompt para o Claude.
   */
  private buildSystemPrompt(): string {
    return `Você é um especialista em legislação fiscal brasileira. Sua função é responder perguntas sobre legislação com base EXCLUSIVAMENTE no contexto fornecido.

REGRAS IMPORTANTES:
1. NUNCA invente informações que não estão no contexto
2. Se a informação não estiver no contexto, diga claramente que não encontrou
3. Cite as fontes específicas (documento, artigo, parágrafo, etc.)
4. Use linguagem técnica mas acessível
5. Estruture a resposta de forma clara e organizada
6. Responda sempre em português brasileiro

FORMATO DA RESPOSTA:
Escreva sua resposta de forma natural e completa.

Ao final, inclua um bloco JSON com as citações no seguinte formato:
CITATIONS_JSON:
[{"source": "Nome do Documento, Art. X", "excerpt": "trecho relevante", "relevance": 0.9}]

A relevância deve ser um número entre 0 e 1, indicando quão relevante a citação é para a resposta.`;
  }

  /**
   * Constrói o prompt do usuário com contexto.
   */
  private buildUserPrompt(query: string, context: DocumentChunk[]): string {
    const contextParts: string[] = [];

    for (let i = 0; i < context.length; i++) {
      const chunk = context[i];
      const header = chunk.metadata.section
        ? `[DOC ${i + 1}: ${chunk.documentTitle}, ${chunk.metadata.section}]`
        : `[DOC ${i + 1}: ${chunk.documentTitle}]`;

      contextParts.push(`${header}\n${chunk.content}`);
    }

    const contextText = contextParts.join('\n\n---\n\n');

    return `CONTEXTO DA LEGISLAÇÃO:
${contextText}

---

PERGUNTA: ${query}

Por favor, responda a pergunta com base APENAS no contexto fornecido acima. Cite as fontes utilizadas.`;
  }

  /**
   * Faz parse da resposta do Claude para extrair answer e citations.
   */
  private parseResponse(content: string, context: DocumentChunk[]): Omit<RAGResponse, 'processingTimeMs'> {
    // Separar resposta do JSON de citações
    const citationsMarker = 'CITATIONS_JSON:';
    const markerIndex = content.lastIndexOf(citationsMarker);

    let answer: string;
    let citations: Citation[] = [];
    let confidence = 0.5;

    if (markerIndex === -1) {
      // Sem bloco de citações, usar resposta completa
      answer = content.trim();
    } else {
      // Extrair resposta e citações
      answer = content.substring(0, markerIndex).trim();
      const jsonPart = content.substring(markerIndex + citationsMarker.length).trim();

      try {
        // Encontrar o array JSON
        const jsonMatch = jsonPart.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ParsedCitation[];

          citations = parsed.map((c): Citation => {
            // Encontrar o chunk correspondente
            const matchingChunk = context.find(
              (chunk) =>
                chunk.documentTitle.includes(c.source.split(',')[0]) ||
                c.source.includes(chunk.documentTitle)
            );

            return {
              documentTitle: matchingChunk?.documentTitle ?? c.source.split(',')[0],
              source: c.source,
              excerpt: c.excerpt,
              pageNumber: matchingChunk?.metadata.pageNumber ?? 1,
              relevanceScore: c.relevance,
            };
          });

          // Calcular confiança média
          if (citations.length > 0) {
            confidence =
              citations.reduce((sum, c) => sum + c.relevanceScore, 0) / citations.length;
          }
        }
      } catch {
        // Ignorar erro de parse, manter citations vazio
      }
    }

    // Se não conseguiu extrair citações, criar automaticamente dos chunks
    if (citations.length === 0 && context.length > 0) {
      citations = context.slice(0, 3).map((chunk, i): Citation => ({
        documentTitle: chunk.documentTitle,
        source: chunk.metadata.section
          ? `${chunk.documentTitle}, ${chunk.metadata.section}`
          : chunk.documentTitle,
        excerpt: chunk.content.substring(0, 200) + '...',
        pageNumber: chunk.metadata.pageNumber,
        relevanceScore: 1 - i * 0.1, // Decai por posição
      }));
      confidence = 0.7;
    }

    return {
      answer,
      citations,
      confidence,
    };
  }
}
