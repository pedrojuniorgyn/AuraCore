/**
 * LegislationSearchService - Domain Service
 * 
 * Serviço stateless para busca e formatação de respostas
 * sobre legislação fiscal brasileira.
 * 
 * @module knowledge/domain/services
 * @see DOMAIN-SVC-001 to DOMAIN-SVC-010
 */

import { Result } from '@/shared/domain';
import type {
  SearchResult,
  LegislationType,
  LegislationAnswer,
} from '../types';

/**
 * Mapeamento de palavras-chave para tipos de legislação
 */
const LEGISLATION_KEYWORDS: ReadonlyArray<readonly [readonly string[], LegislationType]> = [
  [['icms', 'alíquota interestadual', 'substituição tributária', 'st', 'difal', 'kandir', 'confaz'], 'ICMS'],
  [['pis', 'cofins', 'contribuição', 'cumulativo', 'não cumulativo', '10.637', '10.833'], 'PIS_COFINS'],
  [['ipi', 'industrialização', 'ripi'], 'IPI'],
  [['irpj', 'csll', 'lucro real', 'lucro presumido', 'lalur'], 'IRPJ_CSLL'],
  [['iss', 'serviço municipal', 'lc 116'], 'ISS'],
  [['ibs', 'cbs', 'reforma tributária', 'reforma 2026', 'imposto seletivo', 'ec 132'], 'REFORMA_2026'],
  [['sped', 'efd', 'escrituração digital', 'bloco'], 'SPED'],
  [['cte', 'conhecimento de transporte', 'mdfe', 'manifesto'], 'CTE'],
  [['nfe', 'nota fiscal eletrônica', 'danfe', 'modelo 55'], 'NFE'],
  [['jornada', 'motorista', 'descanso', 'clt', 'hora extra', 'férias'], 'TRABALHISTA'],
] as const;

/**
 * Domain Service para busca em legislação fiscal
 * 100% stateless, métodos estáticos (DOMAIN-SVC-001)
 */
export class LegislationSearchService {
  // Constructor privado (DOMAIN-SVC-002)
  private constructor() {}

  /**
   * Formata resultados de busca para resposta estruturada
   * 
   * @param results - Resultados da busca vetorial
   * @param query - Query original do usuário
   * @returns Resposta formatada ou erro
   */
  static formatSearchResults(
    results: SearchResult[],
    query: string
  ): Result<LegislationAnswer, string> {
    if (results.length === 0) {
      return Result.ok({
        answer: 'Não foram encontrados documentos relevantes para esta consulta na base de legislação indexada.',
        sources: [],
        confidence: 0,
        disclaimer: this.getDisclaimer(),
      });
    }

    // Ordenar por score
    const sortedResults = [...results].sort((a, b) => b.score - a.score);
    
    // Pegar os melhores resultados
    const topResults = sortedResults.slice(0, 5);
    
    // Calcular confiança média
    const avgScore = topResults.reduce((sum, r) => sum + r.score, 0) / topResults.length;

    // Formatar fontes
    const sources = topResults.map(r => ({
      title: r.document.title,
      excerpt: this.truncateText(r.chunk.content, 300),
      relevance: Math.round(r.score * 100),
    }));

    // Gerar resposta baseada nos resultados
    // Em produção, isso seria feito por um LLM
    const answer = this.generateAnswer(query, topResults);

    return Result.ok({
      answer,
      sources,
      confidence: avgScore,
      disclaimer: this.getDisclaimer(),
    });
  }

  /**
   * Identifica tipos de legislação baseado na query
   * 
   * @param query - Pergunta do usuário
   * @returns Lista de tipos de legislação identificados
   */
  static identifyLegislationType(query: string): LegislationType[] {
    const queryLower = query.toLowerCase();
    const types: LegislationType[] = [];

    for (const [keywords, type] of LEGISLATION_KEYWORDS) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        if (!types.includes(type)) {
          types.push(type);
        }
      }
    }

    return types.length > 0 ? types : ['OUTROS'];
  }

  /**
   * Extrai entidades da query (números de leis, artigos, etc.)
   * 
   * @param query - Pergunta do usuário
   * @returns Entidades extraídas
   */
  static extractEntities(query: string): {
    laws: string[];
    articles: string[];
    dates: string[];
  } {
    const laws: string[] = [];
    const articles: string[] = [];
    const dates: string[] = [];

    // Padrões de leis brasileiras
    const lawPatterns = [
      /lei\s*(?:complementar\s*)?(?:n[º°]?\s*)?([\d.\/]+)/gi,
      /lc\s*(?:n[º°]?\s*)?([\d.\/]+)/gi,
      /decreto\s*(?:n[º°]?\s*)?([\d.\/]+)/gi,
      /in\s*(?:rfb\s*)?(?:n[º°]?\s*)?([\d.\/]+)/gi,
      /ec\s*(?:n[º°]?\s*)?([\d.\/]+)/gi,
    ];

    for (const pattern of lawPatterns) {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        if (match[1]) {
          laws.push(match[1]);
        }
      }
    }

    // Artigos
    const articlePattern = /art(?:igo)?\.?\s*(\d+)/gi;
    let articleMatch;
    while ((articleMatch = articlePattern.exec(query)) !== null) {
      if (articleMatch[1]) {
        articles.push(articleMatch[1]);
      }
    }

    // Datas
    const datePattern = /(\d{2}\/\d{2}\/\d{4}|\d{4})/g;
    let dateMatch;
    while ((dateMatch = datePattern.exec(query)) !== null) {
      if (dateMatch[1]) {
        dates.push(dateMatch[1]);
      }
    }

    return { laws, articles, dates };
  }

  /**
   * Classifica a complexidade da pergunta
   * 
   * @param query - Pergunta do usuário
   * @returns Nível de complexidade
   */
  static classifyQueryComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const words = query.split(/\s+/).length;
    const types = this.identifyLegislationType(query);
    const entities = this.extractEntities(query);
    
    // Heurísticas para complexidade
    const hasMultipleTypes = types.length > 1;
    const hasSpecificReferences = entities.laws.length > 0 || entities.articles.length > 0;
    const isLongQuery = words > 20;
    const hasComparison = /compar|diferença|versus|vs|entre/i.test(query);

    if ((hasMultipleTypes && hasSpecificReferences) || hasComparison) {
      return 'complex';
    }

    if (hasSpecificReferences || isLongQuery) {
      return 'moderate';
    }

    return 'simple';
  }

  /**
   * Gera resposta baseada nos resultados (placeholder para LLM)
   */
  private static generateAnswer(query: string, results: SearchResult[]): string {
    const topContent = results
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] ${r.chunk.content.substring(0, 400)}...`)
      .join('\n\n');

    const types = this.identifyLegislationType(query);
    const typesStr = types.join(', ');

    return `**Consulta sobre: ${typesStr}**\n\n` +
           `Baseado na legislação consultada, encontrei os seguintes trechos relevantes:\n\n` +
           `${topContent}\n\n` +
           `_Para uma análise mais detalhada, consulte as fontes completas listadas abaixo._`;
  }

  /**
   * Trunca texto mantendo palavras inteiras
   */
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return (lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated) + '...';
  }

  /**
   * Retorna disclaimer padrão
   */
  private static getDisclaimer(): string {
    return 'ATENÇÃO: Esta é uma consulta automatizada à legislação. ' +
           'Para decisões importantes, consulte sempre um contador ou advogado tributarista. ' +
           'A legislação pode ter sido atualizada após a data de indexação deste documento.';
  }
}
