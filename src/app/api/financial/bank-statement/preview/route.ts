/**
 * Bank Statement Preview API Route
 * 
 * POST /api/financial/bank-statement/preview - Preview bank statement import
 * 
 * Parses the file and returns preview WITHOUT saving to database
 * 
 * @module app/api/financial/bank-statement/preview/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IImportBankStatementUseCase } from '@/modules/financial/domain/ports/input/IImportBankStatementUseCase';
import { z } from 'zod';

import { logger } from '@/shared/infrastructure/logging';
/**
 * Request validation schema for preview
 */
const previewSchema = z.object({
  format: z.enum(['OFX', 'QFX', 'CSV', 'TXT']).optional(),
  bank: z.string().optional(),
});

/**
 * POST /api/financial/bank-statement/preview
 * 
 * Preview a bank statement file without saving
 * Accepts multipart/form-data with file
 */
export const POST = withDI(async (request: NextRequest) => {
  // 1. Authenticate
  const context = await getTenantContext();
  if (!context) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optionsJson = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      );
    }

    // Validate file extension
    const validExtensions = ['.ofx', '.qfx', '.csv', '.txt'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Formato de arquivo não suportado. Use OFX, QFX ou CSV.' },
        { status: 400 }
      );
    }

    // Parse options
    let options: z.infer<typeof previewSchema> | undefined;
    if (optionsJson) {
      try {
        const parsed = JSON.parse(optionsJson);
        const validated = previewSchema.safeParse(parsed);
        if (validated.success) {
          options = validated.data;
        }
      } catch {
        // Ignore invalid JSON, use defaults
      }
    }

    // 3. Read file content
    const content = await file.text();

    // 4. Execute preview
    const useCase = container.resolve<IImportBankStatementUseCase>(
      TOKENS.ImportBankStatementUseCase
    );

    const result = await useCase.preview({
      content,
      fileName: file.name,
      organizationId: context.organizationId,
      branchId: context.branchId,
      format: options?.format,
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 422 }
      );
    }

    // 5. Return preview response
    return NextResponse.json({
      success: true,
      preview: {
        detectedFormat: result.value.detectedFormat,
        account: result.value.account,
        period: result.value.period,
        summary: result.value.summary,
        sampleTransactions: result.value.sampleTransactions,
        warnings: result.value.warnings,
        potentialDuplicates: result.value.potentialDuplicates,
      },
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Bank statement preview error:', error);
    
    return NextResponse.json(
      { error: `Erro ao processar preview: ${message}` },
      { status: 500 }
    );
  }
});
