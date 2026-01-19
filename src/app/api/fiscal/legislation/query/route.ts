/**
 * API Route: POST /api/fiscal/legislation/query
 *
 * Consulta a base de legislação usando RAG.
 *
 * @module api/fiscal/legislation/query
 * @see E-Agent-Fase-D4
 */

import { NextRequest, NextResponse } from 'next/server';
import { Result } from '@/shared/domain';
import { auth } from '@/lib/auth';
import { container } from '@/shared/infrastructure/di';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IQueryLegislationUseCase } from '@/modules/fiscal/domain/ports/input';
import type { LegislationCategory } from '@/modules/fiscal/domain/services/rag/types';

// ============================================================================
// TYPES
// ============================================================================

interface QueryRequestBody {
  question: string;
  category?: LegislationCategory;
  topK?: number;
}

// ============================================================================
// POST /api/fiscal/legislation/query
// ============================================================================

/**
 * Consulta a base de legislação.
 *
 * @param request - Requisição com pergunta (JSON)
 * @returns Resposta com citações ou erro
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/fiscal/legislation/query', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     question: 'Qual a alíquota de ICMS para transporte interestadual de SP para RJ?',
 *     category: 'ICMS',
 *   }),
 * });
 *
 * const { answer, citations, confidence } = await response.json();
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Autenticação
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }

  try {
    // 2. Parse do body
    const body = (await request.json()) as QueryRequestBody;

    // 3. Validar input
    if (!body.question) {
      return NextResponse.json(
        { error: 'Pergunta é obrigatória' },
        { status: 400 }
      );
    }

    const trimmedQuestion = body.question.trim();
    if (trimmedQuestion.length < 5) {
      return NextResponse.json(
        { error: 'Pergunta muito curta (mínimo 5 caracteres)' },
        { status: 400 }
      );
    }

    if (trimmedQuestion.length > 2000) {
      return NextResponse.json(
        { error: 'Pergunta muito longa (máximo 2000 caracteres)' },
        { status: 400 }
      );
    }

    // 4. Executar consulta
    const useCase = container.resolve<IQueryLegislationUseCase>(
      TOKENS.QueryLegislationUseCase
    );

    const result = await useCase.execute({
      question: trimmedQuestion,
      category: body.category,
      topK: body.topK,
    });

    // 5. Retornar resultado
    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[POST /api/fiscal/legislation/query] Erro:', message);

    return NextResponse.json(
      { error: `Erro interno: ${message}` },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS (CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
