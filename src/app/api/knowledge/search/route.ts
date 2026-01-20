/**
 * Knowledge Search API Endpoint
 *
 * Busca semântica no Knowledge Module via ChromaDB.
 *
 * @route POST /api/knowledge/search
 * @route GET /api/knowledge/search?q=query
 * @module api/knowledge/search
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const SearchInputSchema = z.object({
  query: z.string().min(3, 'Query deve ter no mínimo 3 caracteres').max(500),
  legislation_types: z.array(z.string()).optional(),
  top_k: z.number().min(1).max(20).default(5),
  min_score: z.number().min(0).max(1).default(0.5),
});

type SearchInput = z.infer<typeof SearchInputSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    title?: string;
    type?: string;
    legislationType?: string;
    source?: string;
    chunkIndex?: number;
  };
}

interface SearchResponse {
  success: boolean;
  data?: {
    results: SearchResult[];
    query: string;
    totalResults: number;
    processingTimeMs: number;
  };
  error?: string;
  details?: unknown;
}

interface ChromaCollection {
  name: string;
  id: string;
}

interface ChromaQueryResult {
  ids: string[][];
  documents: (string | null)[][];
  metadatas: (Record<string, unknown> | null)[][];
  distances: number[][];
}

// ============================================================================
// HANDLER: POST
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as unknown;
    const input = SearchInputSchema.parse(body);

    // Verificar se ChromaDB está configurado
    const chromaHost = process.env.CHROMA_HOST;
    const chromaPort = process.env.CHROMA_PORT;

    if (!chromaHost || !chromaPort) {
      return NextResponse.json(
        {
          success: false,
          error: 'ChromaDB não configurado. Defina CHROMA_HOST e CHROMA_PORT.',
        },
        { status: 503 }
      );
    }

    // Verificar se tem API key para embeddings
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'GOOGLE_AI_API_KEY não configurada.',
        },
        { status: 503 }
      );
    }

    // 1. Gerar embedding da query
    const queryEmbedding = await generateQueryEmbedding(input.query, googleApiKey);
    if (!queryEmbedding) {
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao gerar embedding da query.',
        },
        { status: 500 }
      );
    }

    // 2. Buscar no ChromaDB
    const chromaUrl = `http://${chromaHost}:${chromaPort}`;
    const collectionName = process.env.CHROMA_COLLECTION ?? 'auracore_knowledge';

    // Verificar se a collection existe
    const collection = await getCollection(chromaUrl, collectionName);

    if (!collection) {
      // Collection não existe ainda - retornar vazio
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          query: input.query,
          totalResults: 0,
          processingTimeMs: Date.now() - startTime,
        },
      });
    }

    // 3. Fazer query na collection
    const queryResult = await queryCollection(chromaUrl, collection.id, queryEmbedding, input.top_k);

    if (!queryResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'Erro na busca ChromaDB.',
        },
        { status: 500 }
      );
    }

    // 4. Formatar resultados
    const results = formatResults(queryResult, input);

    return NextResponse.json({
      success: true,
      data: {
        results,
        query: input.query,
        totalResults: results.length,
        processingTimeMs: Date.now() - startTime,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validação falhou', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[Knowledge Search] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLER: GET (para teste rápido via browser)
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: 'Parâmetro "q" é obrigatório. Ex: /api/knowledge/search?q=icms',
      },
      { status: 400 }
    );
  }

  // Extrair legislation_types do query parameter (formato: ?legislation_types=ICMS,PIS_COFINS)
  const legislationTypesParam = searchParams.get('legislation_types');
  const legislationTypes = legislationTypesParam
    ? legislationTypesParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  // Criar request fake para reutilizar POST
  const fakeBody = JSON.stringify({
    query,
    top_k: parseInt(searchParams.get('top_k') ?? '5', 10),
    min_score: parseFloat(searchParams.get('min_score') ?? '0.5'),
    legislation_types: legislationTypes,
  });

  const fakeRequest = new NextRequest(request.url, {
    method: 'POST',
    body: fakeBody,
    headers: { 'Content-Type': 'application/json' },
  });

  return POST(fakeRequest);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Gera embedding da query usando Gemini
 */
async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[] | null> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(apiKey);
    const embeddingModel = client.getGenerativeModel({
      model: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
    });

    const embeddingResponse = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text: query }] },
    });

    return embeddingResponse.embedding.values;
  } catch (error: unknown) {
    console.error('[Knowledge Search] Embedding error:', error);
    return null;
  }
}

/**
 * Busca collection no ChromaDB
 */
async function getCollection(
  chromaUrl: string,
  collectionName: string
): Promise<ChromaCollection | null> {
  try {
    const response = await fetch(`${chromaUrl}/api/v1/collections`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[Knowledge Search] ChromaDB collections error:', response.status);
      return null;
    }

    const collections = (await response.json()) as ChromaCollection[];
    return collections.find((c) => c.name === collectionName) ?? null;
  } catch (error: unknown) {
    console.error('[Knowledge Search] ChromaDB connection error:', error);
    return null;
  }
}

/**
 * Executa query no ChromaDB
 */
async function queryCollection(
  chromaUrl: string,
  collectionId: string,
  queryEmbedding: number[],
  topK: number
): Promise<ChromaQueryResult | null> {
  try {
    const response = await fetch(`${chromaUrl}/api/v1/collections/${collectionId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embeddings: [queryEmbedding],
        n_results: topK,
        include: ['documents', 'metadatas', 'distances'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Knowledge Search] ChromaDB query error:', errorText);
      return null;
    }

    return (await response.json()) as ChromaQueryResult;
  } catch (error: unknown) {
    console.error('[Knowledge Search] ChromaDB query error:', error);
    return null;
  }
}

/**
 * Formata resultados do ChromaDB
 */
function formatResults(queryResult: ChromaQueryResult, input: SearchInput): SearchResult[] {
  const results: SearchResult[] = [];

  if (!queryResult.ids?.[0]) {
    return results;
  }

  for (let i = 0; i < queryResult.ids[0].length; i++) {
    const distance = queryResult.distances?.[0]?.[i] ?? 1;
    // ChromaDB retorna distância (menor = mais similar), converter para score
    const score = 1 / (1 + distance);

    if (score >= input.min_score) {
      const metadata = queryResult.metadatas?.[0]?.[i] ?? {};

      // Filtrar por legislation_types se especificado
      if (input.legislation_types && input.legislation_types.length > 0) {
        const docType = metadata.legislationType as string | undefined;
        // Se não tem tipo OU tipo não está na lista, excluir
        if (!docType || !input.legislation_types.includes(docType)) {
          continue;
        }
      }

      results.push({
        id: queryResult.ids[0][i],
        content: queryResult.documents?.[0]?.[i] ?? '',
        score,
        metadata: {
          title: metadata.title as string | undefined,
          type: metadata.type as string | undefined,
          legislationType: metadata.legislationType as string | undefined,
          source: metadata.source as string | undefined,
          chunkIndex: metadata.chunkIndex as number | undefined,
        },
      });
    }
  }

  return results;
}
