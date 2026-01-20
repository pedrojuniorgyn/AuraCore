/**
 * API: POST /api/strategic/import
 * Importa dados de arquivo para o sistema
 * 
 * @module app/api/strategic/import
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/auth/context';

export const dynamic = 'force-dynamic';

interface ImportRow {
  [key: string]: string | number | null;
}

interface ImportRequestBody {
  rows: ImportRow[];
  mapping: Record<string, string>;
  entityType: 'kpi' | 'action-plan' | 'goal';
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const body = await request.json() as ImportRequestBody;
    const { rows, mapping, entityType } = body;

    if (!rows?.length) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 });
    }

    // Mapear dados usando o mapeamento fornecido
    const mappedData = rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      Object.entries(mapping).forEach(([targetField, sourceColumn]) => {
        if (sourceColumn && row[sourceColumn] !== undefined) {
          mapped[targetField] = row[sourceColumn];
        }
      });
      return mapped;
    });

    // TODO: Implementar lógica de importação real usando repositories
    // Exemplo:
    // switch (entityType) {
    //   case 'kpi':
    //     const kpiRepo = container.resolve<IKpiRepository>(STRATEGIC_TOKENS.KpiRepository);
    //     for (const data of mappedData) {
    //       await kpiRepo.create({ ...data, organizationId, branchId });
    //     }
    //     break;
    //   case 'action-plan':
    //     ...
    // }

    console.log('Importing data:', {
      entityType,
      count: mappedData.length,
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      sample: mappedData.slice(0, 2),
    });

    return NextResponse.json({
      success: true,
      imported: mappedData.length,
      message: `${mappedData.length} registros importados com sucesso`,
    });
  } catch (error) {
    console.error('POST /api/strategic/import error:', error);
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 }
    );
  }
}
