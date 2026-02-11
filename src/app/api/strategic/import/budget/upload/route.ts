/**
 * API Routes: /api/strategic/import/budget/upload
 * POST - Upload CSV file for budget import
 *
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { BudgetImportService } from '@/modules/strategic/application/services/BudgetImportService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import '@/modules/strategic/infrastructure/di/StrategicModule';

import { logger } from '@/shared/infrastructure/logging';
/**
 * POST /api/strategic/import/budget/upload
 * Upload CSV file for budget import
 */
export const POST = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'kpi';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!['kpi', 'goal'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be "kpi" or "goal"' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const service = container.resolve<BudgetImportService>(
      STRATEGIC_TOKENS.BudgetImportService
    );

    const result =
      type === 'goal'
        ? await service.importGoalValues(
            context.organizationId,
            context.branchId,
            csvContent
          )
        : await service.importKPIValues(
            context.organizationId,
            context.branchId,
            csvContent
          );

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        type,
        imported: result.value.success,
        failed: result.value.failed,
        errors: result.value.errors,
      },
    });
  } catch (error) {
    logger.error('Error uploading budget file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
