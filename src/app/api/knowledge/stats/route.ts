/**
 * Knowledge Stats API Endpoint
 *
 * Retorna estatísticas do Knowledge Module:
 * - Collections no ChromaDB
 * - Contagem de documentos
 * - Configuração de embedding
 *
 * @route GET /api/knowledge/stats
 * @module api/knowledge/stats
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// TYPES
// ============================================================================

interface CollectionStats {
  name: string;
  id: string;
  count: number;
  metadata?: Record<string, unknown>;
}

interface ChromaCollection {
  name: string;
  id: string;
  metadata?: Record<string, unknown>;
}

interface StatsResponse {
  timestamp: string;
  environment: string;
  vectorStore: {
    type: string;
    host: string;
    port: string;
    status: 'ok' | 'error';
    error?: string;
    collections: CollectionStats[];
    totalDocuments: number;
  };
  embedding: {
    primaryProvider: string;
    fallbackProvider: string;
    fallbackEnabled: boolean;
    models: {
      gemini: string;
      openai: string;
    };
  };
}

// ============================================================================
// HANDLER
// ============================================================================

export async function GET(): Promise<NextResponse<StatsResponse>> {
  const chromaHost = process.env.CHROMA_HOST ?? 'chromadb';
  const chromaPort = process.env.CHROMA_PORT ?? '8000';
  const chromaUrl = `http://${chromaHost}:${chromaPort}`;

  const stats: StatsResponse = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'unknown',
    vectorStore: {
      type: process.env.VECTOR_STORE_TYPE ?? 'chroma',
      host: chromaHost,
      port: chromaPort,
      status: 'ok',
      collections: [],
      totalDocuments: 0,
    },
    embedding: {
      primaryProvider: process.env.GOOGLE_AI_API_KEY ? 'gemini' : 'none',
      fallbackProvider: process.env.OPENAI_API_KEY ? 'openai' : 'none',
      fallbackEnabled: process.env.EMBEDDING_FALLBACK_ENABLED === 'true',
      models: {
        gemini: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
        openai: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
      },
    },
  };

  try {
    // 1. Listar collections
    const collectionsResponse = await fetch(`${chromaUrl}/api/v1/collections`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!collectionsResponse.ok) {
      stats.vectorStore.status = 'error';
      stats.vectorStore.error = `HTTP ${collectionsResponse.status}`;
      return NextResponse.json(stats, { status: 503 });
    }

    const collections = (await collectionsResponse.json()) as ChromaCollection[];

    // 2. Para cada collection, obter count
    let totalDocuments = 0;

    for (const collection of collections) {
      const collectionStats = await getCollectionStats(chromaUrl, collection);
      stats.vectorStore.collections.push(collectionStats);

      if (collectionStats.count > 0) {
        totalDocuments += collectionStats.count;
      }
    }

    stats.vectorStore.totalDocuments = totalDocuments;
  } catch (error: unknown) {
    // Handler não chama getTenantContext - apenas tratar erro normalmente
    stats.vectorStore.status = 'error';
    stats.vectorStore.error = error instanceof Error ? error.message : String(error);
    return NextResponse.json(stats, { status: 503 });
  }

  return NextResponse.json(stats);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Obtém estatísticas de uma collection específica
 */
async function getCollectionStats(
  chromaUrl: string,
  collection: ChromaCollection
): Promise<CollectionStats> {
  try {
    const countResponse = await fetch(`${chromaUrl}/api/v1/collections/${collection.id}/count`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    let count = 0;
    if (countResponse.ok) {
      count = (await countResponse.json()) as number;
    }

    return {
      name: collection.name,
      id: collection.id,
      count,
      metadata: collection.metadata,
    };
  } catch {
    // Se falhar, retornar -1 para indicar erro
    return {
      name: collection.name,
      id: collection.id,
      count: -1,
      metadata: collection.metadata,
    };
  }
}
