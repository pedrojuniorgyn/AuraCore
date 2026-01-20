/**
 * Health Check Endpoint - Embedding Service
 *
 * Verifica conectividade com:
 * - ChromaDB (vector store)
 * - Gemini API (embedding service)
 * - OpenAI API (fallback)
 *
 * @route GET /api/health/embeddings
 * @module api/health/embeddings
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// TYPES
// ============================================================================

interface ServiceStatus {
  status: 'ok' | 'error' | 'skipped';
  error?: string;
  [key: string]: unknown;
}

interface HealthCheckResult {
  timestamp: string;
  environment: string;
  config: {
    googleApiKey: string;
    openaiApiKey: string;
    chromaHost: string;
    chromaPort: string;
    vectorStoreType: string;
    fallbackEnabled: string;
  };
  services: {
    chromadb?: ServiceStatus;
    geminiEmbedding?: ServiceStatus;
    openaiEmbedding?: ServiceStatus;
  };
  overall: 'healthy' | 'unhealthy' | 'degraded';
}

// ============================================================================
// HANDLER
// ============================================================================

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const results: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'unknown',
    config: {
      googleApiKey: process.env.GOOGLE_AI_API_KEY ? '✅ configured' : '❌ missing',
      openaiApiKey: process.env.OPENAI_API_KEY ? '✅ configured' : '❌ missing',
      chromaHost: process.env.CHROMA_HOST ?? 'not set',
      chromaPort: process.env.CHROMA_PORT ?? 'not set',
      vectorStoreType: process.env.VECTOR_STORE_TYPE ?? 'not set',
      fallbackEnabled: process.env.EMBEDDING_FALLBACK_ENABLED ?? 'not set',
    },
    services: {},
    overall: 'healthy',
  };

  // 1. Testar ChromaDB
  results.services.chromadb = await checkChromaDB();

  // 2. Testar Gemini Embedding
  results.services.geminiEmbedding = await checkGeminiEmbedding();

  // 3. Testar OpenAI Embedding (se configurado)
  results.services.openaiEmbedding = await checkOpenAIEmbedding();

  // 4. Calcular status geral
  const statuses = Object.values(results.services).map((s) => s?.status);
  const hasErrors = statuses.some((s) => s === 'error');
  const hasOk = statuses.some((s) => s === 'ok');

  if (hasErrors && !hasOk) {
    results.overall = 'unhealthy';
  } else if (hasErrors && hasOk) {
    results.overall = 'degraded';
  } else {
    results.overall = 'healthy';
  }

  return NextResponse.json(results, {
    status: results.overall === 'healthy' ? 200 : results.overall === 'degraded' ? 200 : 503,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica conectividade com ChromaDB
 */
async function checkChromaDB(): Promise<ServiceStatus> {
  const chromaHost = process.env.CHROMA_HOST ?? 'chromadb';
  const chromaPort = process.env.CHROMA_PORT ?? '8000';
  const chromaUrl = `http://${chromaHost}:${chromaPort}/api/v1/heartbeat`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(chromaUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      return {
        status: 'ok',
        heartbeat: data,
        url: chromaUrl,
      };
    }

    return {
      status: 'error',
      error: `HTTP ${response.status}`,
      url: chromaUrl,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      error: message,
      url: chromaUrl,
    };
  }
}

/**
 * Verifica conectividade com Gemini API
 */
async function checkGeminiEmbedding(): Promise<ServiceStatus> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return {
      status: 'skipped',
      error: 'GOOGLE_AI_API_KEY not configured',
    };
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const modelName = process.env.GEMINI_EMBEDDING_MODEL ?? 'embedding-004';
    const model = client.getGenerativeModel({ model: modelName });

    const response = await model.embedContent({
      content: { role: 'user', parts: [{ text: 'health check test' }] },
    });

    return {
      status: 'ok',
      model: modelName,
      dimension: response.embedding.values.length,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      error: message,
    };
  }
}

/**
 * Verifica conectividade com OpenAI API
 */
async function checkOpenAIEmbedding(): Promise<ServiceStatus> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      status: 'skipped',
      error: 'OPENAI_API_KEY not configured',
    };
  }

  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelName = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

    const response = await client.embeddings.create({
      model: modelName,
      input: 'health check test',
    });

    return {
      status: 'ok',
      model: modelName,
      dimension: response.data[0].embedding.length,
      tokensUsed: response.usage?.total_tokens,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      error: message,
    };
  }
}
