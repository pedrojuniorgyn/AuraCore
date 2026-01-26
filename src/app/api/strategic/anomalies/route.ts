/**
 * API Routes: /api/strategic/anomalies
 * CRUD de Anomalias (GEROT)
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { Anomaly } from '@/modules/strategic/domain/entities/Anomaly';

const createAnomalySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  source: z.enum(['CONTROL_ITEM', 'KPI', 'MANUAL', 'AUDIT']),
  sourceEntityId: z.string().trim().uuid().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  processArea: z.string().trim().min(1).max(100),
  responsibleUserId: z.string().trim().uuid(),
});

// GET /api/strategic/anomalies
export async function GET(request: Request) {
  try {
    const context = await getTenantContext(); // Validates auth
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const severity = searchParams.get('severity') ?? undefined;
    const processArea = searchParams.get('processArea') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    // TODO: Implementar DrizzleAnomalyRepository
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      pageSize,
      filters: { status, severity, processArea },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/anomalies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/anomalies
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const validation = createAnomalySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Criar entity
    const anomalyResult = Anomaly.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      title: validation.data.title,
      description: validation.data.description,
      source: validation.data.source,
      sourceEntityId: validation.data.sourceEntityId,
      severity: validation.data.severity,
      processArea: validation.data.processArea,
      responsibleUserId: validation.data.responsibleUserId,
      detectedBy: context.userId,
    });

    if (Result.isFail(anomalyResult)) {
      return NextResponse.json({ error: anomalyResult.error }, { status: 400 });
    }

    // TODO: Persistir via repository
    const entity = anomalyResult.value;

    return NextResponse.json({
      id: entity.id,
      code: entity.code,
      title: entity.title,
      severity: entity.severity,
      status: entity.status,
      message: 'Anomalia registrada',
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/anomalies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
