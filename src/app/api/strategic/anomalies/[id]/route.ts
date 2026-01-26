/**
 * API Routes: /api/strategic/anomalies/[id]
 * Operações em Anomalia específica
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';

const idSchema = z.string().trim().uuid();
const resolveSchema = z.object({
  resolution: z.string().trim().min(1),
});

// GET /api/strategic/anomalies/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid anomaly id' }, { status: 400 });
    }

    // TODO: Implementar busca via repository
    return NextResponse.json({
      id: idResult.data,
      message: 'Anomalia (mock)',
      organizationId: context.organizationId,
      branchId: context.branchId,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/anomalies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/strategic/anomalies/[id] - Resolver anomalia
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid anomaly id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const validation = resolveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // TODO: Implementar resolução via repository e entity
    return NextResponse.json({
      id: idResult.data,
      status: 'RESOLVED',
      resolution: validation.data.resolution,
      resolvedBy: context.userId,
      resolvedAt: new Date(),
      message: 'Anomalia resolvida',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PUT /api/strategic/anomalies/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
