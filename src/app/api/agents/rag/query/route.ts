// src/app/api/agents/rag/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://localhost:8000';

export interface RAGQueryRequest {
  query: string;
  collection?: string;
  top_k?: number;
  filters?: Record<string, unknown>;
}

export interface RAGSource {
  id: string;
  title: string;
  content: string;
  source: string;
  article?: string;
  law?: string;
  score: number;
}

export interface RAGQueryResponse {
  answer: string;
  sources: RAGSource[];
  query: string;
  collection: string;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const body: RAGQueryRequest = await request.json();
    const { 
      query, 
      collection = 'legislacao_fiscal', 
      top_k = 5,
      filters = {}
    } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Encaminhar para backend Python
    const response = await fetch(`${AGENTS_API_URL}/api/agents/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        collection,
        top_k,
        filters,
        user_id: ctx.userId,
        organization_id: ctx.organizationId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('RAG query error:', error);
      return NextResponse.json(
        { error: 'Failed to query RAG' },
        { status: response.status }
      );
    }

    const data: RAGQueryResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // IMPORTANTE: getTenantContext() throws NextResponse on auth failures
    // Devemos propagar esses erros ao invés de mascarar como 500
    if (error instanceof Response) {
      return error;
    }
    
    // Log apenas erros reais (não auth)
    console.error('RAG route error:', error);
    
    // Retornar erro genérico apenas para erros não-Response
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
