/**
 * API Route: POST /api/contracts/freight/analyze
 *
 * Analisa contratos de frete/transporte.
 *
 * @module app/api/contracts/freight/analyze
 * @see E-Agent-Fase-D5
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IAnalyzeFreightContractUseCase } from '@/modules/contracts/domain/ports/input';

// ============================================================================
// CONFIG
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /api/contracts/freight/analyze
 *
 * Analisa um contrato de frete.
 *
 * @body FormData com:
 *   - file: PDF do contrato
 *   - skipRiskAnalysis?: boolean
 *   - includeRawText?: boolean
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Autenticação
  const context = await getTenantContext();
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let tempFilePath: string | undefined;

  try {
    // 2. Receber arquivo
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const skipRiskAnalysis = formData.get('skipRiskAnalysis') === 'true';
    const includeRawText = formData.get('includeRawText') === 'true';

    // 3. Validar arquivo
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Arquivo deve ser PDF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máximo 10MB)' },
        { status: 400 }
      );
    }

    // 4. Salvar arquivo temporário
    const uploadDir = join(process.cwd(), 'docker', 'docling', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const fileName = `contract_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    tempFilePath = join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(tempFilePath, Buffer.from(bytes));

    // 5. Analisar contrato
    const useCase = container.resolve<IAnalyzeFreightContractUseCase>(
      TOKENS.AnalyzeFreightContractUseCase
    );

    const result = await useCase.execute({
      filePath: `uploads/${fileName}`,
      fileName: file.name,
      options: { skipRiskAnalysis, includeRawText },
    });

    // 6. Limpar arquivo temporário
    try {
      await unlink(tempFilePath);
    } catch {
      // Ignorar erro de limpeza
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
      return error;
    }
    // Limpar arquivo em caso de erro
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignorar erro de limpeza
      }
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('POST /api/contracts/freight/analyze error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
