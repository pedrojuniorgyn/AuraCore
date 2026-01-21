/**
 * API Route: POST /api/fiscal/import/dacte
 *
 * Importa dados de um DACTe PDF.
 *
 * @module api/fiscal/import/dacte
 * @see E-Agent-Fase-D3
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { Result } from '@/shared/domain';
import { auth } from '@/lib/auth';
import { container } from '@/shared/infrastructure/di';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IImportDACTeUseCase } from '@/modules/fiscal/domain/ports/input';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = 'docker/docling/uploads';

// ============================================================================
// POST /api/fiscal/import/dacte
// ============================================================================

/**
 * Importa dados de um DACTe PDF.
 *
 * @param request - Requisição com arquivo PDF (multipart/form-data)
 * @returns Dados estruturados do DACTe ou erro
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('file', pdfFile);
 *
 * const response = await fetch('/api/fiscal/import/dacte', {
 *   method: 'POST',
 *   body: formData,
 * });
 *
 * const { dacte, extractionMetadata } = await response.json();
 * console.log('Chave:', dacte.chaveCTe);
 * console.log('Emitente:', dacte.emitente.razaoSocial);
 * console.log('Remetente:', dacte.remetente.razaoSocial);
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
    // 2. Receber arquivo
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não enviado. Envie um arquivo PDF no campo "file".' },
        { status: 400 }
      );
    }

    // 3. Validar arquivo
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

    // 4. Salvar arquivo temporário
    const uploadDir = join(process.cwd(), UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `dacte_${timestamp}_${sanitizedName}`;
    filePath = join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // 5. Processar DACTe
    const useCase = container.resolve<IImportDACTeUseCase>(
      TOKENS.ImportDACTeUseCase
    );

    const result = await useCase.execute({
      filePath: fileName, // Caminho relativo para o Docling
    });

    // 6. Limpar arquivo temporário (opcional - comentar para debug)
    try {
      await unlink(filePath);
    } catch {
      // Ignorar erro ao limpar
    }

    // 7. Retornar resultado
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
    console.error('[POST /api/fiscal/import/dacte] Erro:', message);

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
