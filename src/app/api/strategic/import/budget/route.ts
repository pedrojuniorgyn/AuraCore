/**
 * API Routes: /api/strategic/import/budget
 * GET - Download CSV templates
 * POST - Import budget values from CSV
 *
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { BudgetImportService } from '@/modules/strategic/application/services/BudgetImportService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import '@/modules/strategic/infrastructure/di/StrategicModule';

const importSchema = z.object({
  type: z.enum(['kpi', 'goal'], { message: 'type must be "kpi" or "goal"' }),
  csv: z.string().trim().min(1, { message: 'csv content is required' }),
});

/**
 * GET /api/strategic/import/budget
 * Download CSV template for budget import
 */
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'kpi';

    const service = container.resolve<BudgetImportService>(
      STRATEGIC_TOKENS.BudgetImportService
    );

    const template =
      type === 'goal'
        ? service.generateGoalTemplate()
        : service.generateKPITemplate();

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-budget-template.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/strategic/import/budget
 * Import budget values from CSV
 */
export const POST = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = container.resolve<BudgetImportService>(
      STRATEGIC_TOKENS.BudgetImportService
    );

    const result =
      parsed.data.type === 'goal'
        ? await service.importGoalValues(
            context.organizationId,
            context.branchId,
            parsed.data.csv
          )
        : await service.importKPIValues(
            context.organizationId,
            context.branchId,
            parsed.data.csv
          );

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: result.value.success,
        failed: result.value.failed,
        errors: result.value.errors,
      },
    });
  } catch (error) {
    console.error('Error importing budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
