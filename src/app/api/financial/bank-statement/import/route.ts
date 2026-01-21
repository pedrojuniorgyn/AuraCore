/**
 * Bank Statement Import API Route
 * 
 * POST /api/financial/bank-statement/import - Import bank statement
 * 
 * @module app/api/financial/bank-statement/import/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IImportBankStatementUseCase } from '@/modules/financial/domain/ports/input/IImportBankStatementUseCase';
import { z } from 'zod';

/**
 * Request validation schema for import
 */
const importSchema = z.object({
  bankAccountId: z.string().min(1, 'ID da conta bancária é obrigatório'),
  format: z.enum(['OFX', 'QFX', 'CSV', 'TXT']).optional(),
  options: z.object({
    skipDuplicateDetection: z.boolean().optional(),
    skipCategorization: z.boolean().optional(),
    skipValidation: z.boolean().optional(),
    autoMatch: z.boolean().optional(),
    csvDelimiter: z.string().optional(),
    csvDateFormat: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/financial/bank-statement/import
 * 
 * Import a bank statement file (OFX, QFX, CSV)
 * Accepts multipart/form-data with file and options
 */
export async function POST(request: NextRequest) {
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
    let options: z.infer<typeof importSchema> | undefined;
    if (optionsJson) {
      try {
        const parsed = JSON.parse(optionsJson);
        const validated = importSchema.safeParse(parsed);
        if (validated.success) {
          options = validated.data;
        }
      } catch {
        // Ignore invalid JSON, use defaults
      }
    }

    // Get bankAccountId from options or form data
    const bankAccountId = options?.bankAccountId || formData.get('bankAccountId') as string;
    if (!bankAccountId) {
      return NextResponse.json(
        { error: 'ID da conta bancária é obrigatório' },
        { status: 400 }
      );
    }

    // 3. Read file content
    const content = await file.text();

    // 4. Execute use case
    const useCase = container.resolve<IImportBankStatementUseCase>(
      TOKENS.ImportBankStatementUseCase
    );

    const result = await useCase.execute({
      content,
      fileName: file.name,
      bankAccountId,
      organizationId: context.organizationId,
      branchId: context.branchId,
      format: options?.format,
      options: options?.options,
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 422 }
      );
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: {
        statement: {
          format: result.value.statement.format,
          fileName: result.value.statement.fileName,
          account: result.value.statement.account,
          period: result.value.statement.period,
          balance: result.value.statement.balance,
          summary: result.value.statement.summary,
        },
        importResult: result.value.importResult,
        processingTimeMs: result.value.processingTimeMs,
      },
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Bank statement import error:', error);
    
    return NextResponse.json(
      { error: `Erro ao importar extrato: ${message}` },
      { status: 500 }
    );
  }
}
