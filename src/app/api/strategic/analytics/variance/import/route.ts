/**
 * API Routes: /api/strategic/analytics/variance/import
 * Importação em lote de valores BUDGET via CSV
 *
 * @module app/api/strategic/analytics
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { BudgetImportService } from '@/modules/strategic/application/services/BudgetImportService';

// POST - Importar CSV
export async function POST(request: NextRequest) {
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

    const importService = new BudgetImportService();
    const result = await importService.importFromCSV(
      ctx.organizationId,
      ctx.branchId,
      csvContent,
      ctx.userId
    );

    const status = result.errorCount === 0 ? 200 :
                   result.successCount === 0 ? 400 : 207; // 207 Multi-Status

    return NextResponse.json({ data: result }, { status });
  } catch (error) {
    console.error('[variance/import] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
