/**
 * API Routes: /api/strategic/anomalies/[id]
 * Operações em Anomalia específica
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';

const resolveSchema = z.object({
  resolution: z.string().min(1),
});

// GET /api/strategic/anomalies/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    // TODO: Implementar busca via repository
    return NextResponse.json({
      id,
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const body = await request.json();
    const validation = resolveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // TODO: Implementar resolução via repository e entity
    return NextResponse.json({
      id,
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
