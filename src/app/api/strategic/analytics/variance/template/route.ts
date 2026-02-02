/**
 * API Routes: /api/strategic/analytics/variance/template
 * Download de template CSV para importação de orçamentos
 *
 * @module app/api/strategic/analytics
 */
import 'reflect-metadata';
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { db, getDbRows } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getTenantContext } from '@/lib/auth/context';
import { BudgetImportService } from '@/modules/strategic/application/services/BudgetImportService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import '@/modules/strategic/infrastructure/di/StrategicModule';

// GET - Download template CSV
export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar códigos de KPIs ativos
    const kpisResult = await db.execute(sql`
      SELECT code FROM strategic_kpi
      WHERE organization_id = ${ctx.organizationId}
        AND branch_id = ${ctx.branchId}
        AND deleted_at IS NULL
      ORDER BY code
    `);

    const kpiCodes = getDbRows(kpisResult).map(row => row.code);

    if (kpiCodes.length === 0) {
      return NextResponse.json({
        error: 'Nenhum KPI cadastrado. Cadastre KPIs antes de importar orçamentos.'
      }, { status: 400 });
    }

    const importService = container.resolve<BudgetImportService>(
      STRATEGIC_TOKENS.BudgetImportService
    );
    const csvContent = importService.generateKPITemplate(kpiCodes);

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="budget_template_${new Date().getFullYear()}.csv"`,
      },
    });
  } catch (error) {
    console.error('[variance/template] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
