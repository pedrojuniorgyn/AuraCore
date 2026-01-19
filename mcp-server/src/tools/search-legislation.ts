/**
 * search_legislation MCP Tool
 * 
 * Busca informações em legislação fiscal brasileira indexada.
 * Suporta ICMS, PIS/COFINS, Reforma 2026, SPED, CTe, NFe, etc.
 * 
 * @module mcp-server/tools/search-legislation
 * @see Phase D8 - RAG for Fiscal Legislation
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tipos de legislação suportados
 */
const LEGISLATION_TYPES = [
  'ICMS',
  'PIS_COFINS',
  'IPI',
  'IRPJ_CSLL',
  'ISS',
  'REFORMA_2026',
  'SPED',
  'CTE',
  'NFE',
  'TRABALHISTA',
  'OUTROS',
] as const;

type LegislationType = typeof LEGISLATION_TYPES[number];

export interface SearchLegislationInput {
  /** Pergunta sobre legislação fiscal */
  query: string;
  
  /** Filtrar por tipos de legislação específicos (validados internamente) */
  legislation_types?: string[];
  
  /** Número máximo de resultados (1-20, default: 5) */
  top_k?: number;
  
  /** Score mínimo de relevância (0-1, default: 0.3) */
  min_score?: number;
  
  /** Incluir legislação revogada */
  include_revoked?: boolean;
}

export interface SearchLegislationOutput {
  success: boolean;
  
  /** Resposta formatada */
  answer?: string;
  
  /** Fontes consultadas */
  sources?: Array<{
    title: string;
    excerpt: string;
    relevance: number;
  }>;
  
  /** Confiança da resposta (0-100) */
  confidence?: number;
  
  /** Tipos de legislação identificados na query */
  detected_types?: string[];
  
  /** Complexidade da pergunta */
  query_complexity?: string;
  
  /** Número total de resultados */
  total_results?: number;
  
  /** Tempo de busca em ms */
  search_time_ms?: number;
  
  /** Aviso legal */
  disclaimer?: string;
  
  /** Erro se houver */
  error?: string;
}

// ============================================================================
// LEGISLATION KEYWORD DETECTION
// ============================================================================

const LEGISLATION_KEYWORDS: ReadonlyArray<readonly [readonly string[], LegislationType]> = [
  [['icms', 'alíquota interestadual', 'substituição tributária', 'st', 'difal', 'kandir'], 'ICMS'],
  [['pis', 'cofins', 'contribuição', 'cumulativo', 'não cumulativo'], 'PIS_COFINS'],
  [['ipi', 'industrialização'], 'IPI'],
  [['irpj', 'csll', 'lucro real', 'lucro presumido'], 'IRPJ_CSLL'],
  [['iss', 'serviço municipal'], 'ISS'],
  [['ibs', 'cbs', 'reforma', '2026', 'imposto seletivo'], 'REFORMA_2026'],
  [['sped', 'efd', 'escrituração digital'], 'SPED'],
  [['cte', 'conhecimento de transporte', 'mdfe'], 'CTE'],
  [['nfe', 'nota fiscal eletrônica', 'danfe'], 'NFE'],
  [['jornada', 'motorista', 'descanso', 'clt'], 'TRABALHISTA'],
];

function identifyLegislationType(query: string): LegislationType[] {
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

function classifyComplexity(query: string): 'simple' | 'moderate' | 'complex' {
  const words = query.split(/\s+/).length;
  const types = identifyLegislationType(query);
  const hasComparison = /compar|diferença|versus|vs|entre/i.test(query);
  const hasSpecificRef = /lei\s*\d|art(igo)?\.?\s*\d|decreto\s*\d/i.test(query);

  if ((types.length > 1 && hasSpecificRef) || hasComparison) return 'complex';
  if (hasSpecificRef || words > 20) return 'moderate';
  return 'simple';
}

// ============================================================================
// MOCK DATA (Para desenvolvimento sem vector store real)
// ============================================================================

const MOCK_LEGISLATION_DATA: Array<{
  title: string;
  content: string;
  type: LegislationType;
}> = [
  {
    title: 'Lei Kandir - ICMS (LC 87/96)',
    content: 'A Lei Complementar nº 87/1996, conhecida como Lei Kandir, dispõe sobre o ICMS. ' +
             'O ICMS é um imposto estadual que incide sobre operações relativas à circulação de mercadorias ' +
             'e sobre prestações de serviços de transporte interestadual e intermunicipal e de comunicação. ' +
             'As alíquotas interestaduais são de 7% para operações para as regiões Norte, Nordeste e Centro-Oeste, ' +
             'e de 12% para as demais regiões.',
    type: 'ICMS',
  },
  {
    title: 'PIS/COFINS - Regime Não Cumulativo',
    content: 'O regime não cumulativo do PIS foi instituído pela Lei 10.637/2002 e o da COFINS pela Lei 10.833/2003. ' +
             'Neste regime, as alíquotas são de 1,65% para o PIS e 7,6% para a COFINS. ' +
             'É permitido o desconto de créditos sobre determinados custos e despesas.',
    type: 'PIS_COFINS',
  },
  {
    title: 'Reforma Tributária 2026 - EC 132/2023',
    content: 'A Emenda Constitucional 132/2023 institui a Reforma Tributária do consumo. ' +
             'Serão criados o IBS (Imposto sobre Bens e Serviços) e a CBS (Contribuição sobre Bens e Serviços), ' +
             'que substituirão o ICMS, ISS, PIS, COFINS e IPI. A transição ocorrerá de 2026 a 2033. ' +
             'O Imposto Seletivo (IS) incidirá sobre produtos prejudiciais à saúde e ao meio ambiente.',
    type: 'REFORMA_2026',
  },
  {
    title: 'Jornada do Motorista - Lei 13.103/2015',
    content: 'A Lei do Motorista estabelece regras para jornada de trabalho do motorista profissional. ' +
             'O tempo de direção contínuo é de 5h30min com intervalo mínimo de 30 minutos. ' +
             'O descanso diário é de 11 horas a cada 24 horas, podendo ser fracionado. ' +
             'É obrigatório o descanso semanal de 35 horas consecutivas.',
    type: 'TRABALHISTA',
  },
];

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler do tool search_legislation
 */
export async function searchLegislation(
  input: SearchLegislationInput
): Promise<SearchLegislationOutput> {
  const startTime = Date.now();

  try {
    // 1. Validar input
    const query = input.query?.trim() ?? '';
    if (query.length < 3) {
      return {
        success: false,
        error: 'Query deve ter pelo menos 3 caracteres',
      };
    }

    // 2. Detectar tipos de legislação
    // Validar e filtrar tipos fornecidos pelo usuário
    let detectedTypes: LegislationType[];
    if (input.legislation_types && input.legislation_types.length > 0) {
      detectedTypes = input.legislation_types.filter(
        (t): t is LegislationType => LEGISLATION_TYPES.includes(t as LegislationType)
      );
      if (detectedTypes.length === 0) {
        detectedTypes = identifyLegislationType(query);
      }
    } else {
      detectedTypes = identifyLegislationType(query);
    }
    const complexity = classifyComplexity(query);

    // 3. Buscar (usando mock data por enquanto)
    // Em produção, usaria o JsonVectorStore real
    const queryLower = query.toLowerCase();
    const results = MOCK_LEGISLATION_DATA
      .filter(doc => {
        // Filtrar por tipo
        if (detectedTypes.length > 0 && !detectedTypes.includes('OUTROS')) {
          if (!detectedTypes.includes(doc.type)) return false;
        }
        // Busca por texto
        return doc.content.toLowerCase().includes(queryLower) ||
               doc.title.toLowerCase().includes(queryLower);
      })
      .map(doc => ({
        title: doc.title,
        content: doc.content,
        score: calculateScore(queryLower, doc.content),
      }))
      .filter(r => r.score >= (input.min_score ?? 0.3))
      .sort((a, b) => b.score - a.score)
      .slice(0, input.top_k ?? 5);

    const searchTimeMs = Date.now() - startTime;

    // 4. Formatar resposta
    if (results.length === 0) {
      return {
        success: true,
        answer: 'Não foram encontrados documentos relevantes na base de legislação indexada. ' +
                'Tente reformular a pergunta ou verifique se o tipo de legislação está correto.',
        sources: [],
        confidence: 0,
        detected_types: detectedTypes,
        query_complexity: complexity,
        total_results: 0,
        search_time_ms: searchTimeMs,
        disclaimer: getDisclaimer(),
      };
    }

    // Construir resposta
    const answer = `**Consulta sobre: ${detectedTypes.join(', ')}**\n\n` +
                   `Encontrei ${results.length} resultado(s) relevante(s):\n\n` +
                   results.map((r, i) => 
                     `**[${i + 1}] ${r.title}**\n${r.content.substring(0, 300)}...`
                   ).join('\n\n');

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      success: true,
      answer,
      sources: results.map(r => ({
        title: r.title,
        excerpt: r.content.substring(0, 200) + '...',
        relevance: Math.round(r.score * 100),
      })),
      confidence: Math.round(avgScore * 100),
      detected_types: detectedTypes,
      query_complexity: complexity,
      total_results: results.length,
      search_time_ms: searchTimeMs,
      disclaimer: getDisclaimer(),
    };

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Erro na busca: ${errorMsg}`,
    };
  }
}

/**
 * Calcula score de similaridade simples
 */
function calculateScore(query: string, content: string): number {
  const queryWords = query.split(/\s+/).filter(w => w.length > 2);
  const contentLower = content.toLowerCase();
  let matches = 0;

  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      matches++;
    }
  }

  return queryWords.length > 0 ? matches / queryWords.length : 0;
}

/**
 * Retorna disclaimer padrão
 */
function getDisclaimer(): string {
  return 'ATENÇÃO: Esta é uma consulta automatizada à legislação. ' +
         'Para decisões importantes, consulte sempre um contador ou advogado tributarista. ' +
         'A legislação pode ter sido atualizada após a indexação.';
}

/**
 * Schema para registro no MCP Server
 */
export const SEARCH_LEGISLATION_SCHEMA = {
  name: 'search_legislation',
  description: 'Busca informações em legislação fiscal brasileira (ICMS, PIS/COFINS, Reforma 2026, SPED, CTe, NFe, CLT motorista, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Pergunta sobre legislação fiscal brasileira',
      },
      legislation_types: {
        type: 'array',
        description: 'Tipos de legislação para filtrar (opcional, auto-detectado se não informado)',
        items: {
          type: 'string',
          enum: LEGISLATION_TYPES,
        },
      },
      top_k: {
        type: 'number',
        description: 'Número máximo de resultados (1-20, default: 5)',
        minimum: 1,
        maximum: 20,
      },
      min_score: {
        type: 'number',
        description: 'Score mínimo de relevância (0-1, default: 0.3)',
        minimum: 0,
        maximum: 1,
      },
      include_revoked: {
        type: 'boolean',
        description: 'Incluir legislação revogada (default: false)',
      },
    },
    required: ['query'],
  },
};
