/**
 * API Routes: /api/strategic/analytics/variance/import
 * Importação em lote de valores BUDGET via CSV
 *
 * @module app/api/strategic/analytics
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { BudgetImportService } from '@/modules/strategic/application/services/BudgetImportService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
// POST - Importar CSV
export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV obrigatório' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Arquivo deve ser .csv' }, { status: 400 });
    }

    // Ler conteúdo do arquivo
    const csvContent = await file.text();

    if (!csvContent.trim()) {
      return NextResponse.json({ error: 'Arquivo CSV vazio' }, { status: 400 });
    }

    const importService = container.resolve<BudgetImportService>(
      STRATEGIC_TOKENS.BudgetImportService
    );
    const result = await importService.importKPIValues(
      ctx.organizationId,
      ctx.branchId,
      csvContent
    );

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const status = result.value.failed === 0 ? 200 :
                   result.value.success === 0 ? 400 : 207; // 207 Multi-Status

    return NextResponse.json({
      data: {
        totalRows: result.value.success + result.value.failed,
        successCount: result.value.success,
        errorCount: result.value.failed,
        errors: result.value.errors,
      }
    }, { status });
  } catch (error) {
    logger.error('[variance/import] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});
