/**
 * API Route: POST /api/fiscal/legislation/index
 *
 * Indexa um documento de legislação no sistema RAG.
 *
 * @module api/fiscal/legislation/index
 * @see E-Agent-Fase-D4
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { Result } from '@/shared/domain';
import { auth } from '@/lib/auth';
import { container } from '@/shared/infrastructure/di';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IIndexLegislationUseCase } from '@/modules/fiscal/domain/ports/input';
import type { LegislationCategory } from '@/modules/fiscal/domain/services/rag/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const UPLOAD_DIR = 'docker/docling/uploads';

const VALID_CATEGORIES: LegislationCategory[] = [
  'ICMS',
  'PIS_COFINS',
  'IPI',
  'ISS',
  'IRPJ',
  'CTe',
  'NFe',
  'NFSe',
  'MDFe',
  'SPED',
  'REFORMA_TRIBUTARIA',
  'GERAL',
];

// ============================================================================
// POST /api/fiscal/legislation/index
// ============================================================================

/**
 * Indexa um documento de legislação.
 *
 * @param request - Requisição com arquivo PDF (multipart/form-data)
 * @returns Documento indexado ou erro
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('file', pdfFile);
 * formData.append('title', 'Lei Complementar 87/96');
 * formData.append('category', 'ICMS');
 *
 * const response = await fetch('/api/fiscal/legislation/index', {
 *   method: 'POST',
 *   body: formData,
 * });
 *
 * const { document, stats } = await response.json();
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

  let filePath: string | null = null;

  try {
    // 2. Receber dados do form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const categoryStr = formData.get('category') as string | null;

    // 3. Validar arquivo
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não enviado. Envie um arquivo PDF no campo "file".' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Arquivo deve ser um PDF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Arquivo está vazio.' },
        { status: 400 }
      );
    }

    // 4. Validar categoria (se fornecida)
    let category: LegislationCategory | undefined;
    if (categoryStr) {
      if (!VALID_CATEGORIES.includes(categoryStr as LegislationCategory)) {
        return NextResponse.json(
          { error: `Categoria inválida. Opções: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      category = categoryStr as LegislationCategory;
    }

    // 5. Salvar arquivo temporário
    const uploadDir = join(process.cwd(), UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `legislation_${timestamp}_${sanitizedName}`;
    filePath = join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // 6. Indexar documento
    const useCase = container.resolve<IIndexLegislationUseCase>(
      TOKENS.IndexLegislationUseCase
    );

    const result = await useCase.execute({
      filePath: fileName,
      title: title ?? undefined,
      category,
    });

    // 7. Limpar arquivo temporário
    try {
      await unlink(filePath);
    } catch {
      // Ignorar erro ao limpar
    }

    // 8. Retornar resultado
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
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error as NextResponse;
    }
    // Limpar arquivo em caso de erro
    if (filePath) {
      try {
        await unlink(filePath);
      } catch {
        // Ignorar
      }
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[POST /api/fiscal/legislation/index] Erro:', message);

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
