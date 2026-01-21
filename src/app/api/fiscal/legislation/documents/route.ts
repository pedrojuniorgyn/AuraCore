/**
 * API Route: GET /api/fiscal/legislation/documents
 *
 * Lista documentos de legislação indexados.
 *
 * @module api/fiscal/legislation/documents
 * @see E-Agent-Fase-D4
 */

import { NextResponse } from 'next/server';
import { Result } from '@/shared/domain';
import { auth } from '@/lib/auth';
import { container } from '@/shared/infrastructure/di';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';

// ============================================================================
// GET /api/fiscal/legislation/documents
// ============================================================================

/**
 * Lista documentos indexados.
 *
 * @returns Lista de documentos ou erro
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/fiscal/legislation/documents');
 * const { documents } = await response.json();
 * ```
 */
export async function GET(): Promise<NextResponse> {
  // 1. Autenticação
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }

  try {
    // 2. Obter LegislationRAG
    const legislationRAG = container.resolve<LegislationRAG>(
      TOKENS.LegislationRAG
    );

    // 3. Listar documentos
    const result = await legislationRAG.listDocuments();

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documents: result.value,
        total: result.value.length,
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error as NextResponse;
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[GET /api/fiscal/legislation/documents] Erro:', message);

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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
