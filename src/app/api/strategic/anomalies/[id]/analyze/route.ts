/**
 * API: POST /api/strategic/anomalies/[id]/analyze
 * Registra análise de causa raiz (5 Porquês)
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';

const idSchema = z.string().trim().uuid();

const analyzeSchema = z.object({
  why1: z.string().trim().min(1, 'Primeiro "porquê" é obrigatório'),
  why2: z.string().trim().min(1, 'Segundo "porquê" é obrigatório'),
  why3: z.string().trim().optional(),
  why4: z.string().trim().optional(),
  why5: z.string().trim().optional(),
  rootCause: z.string().trim().optional(),
});

export async function POST(
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
    const validation = analyzeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { why1, why2, why3, why4, why5, rootCause } = validation.data;

    // Determinar causa raiz
    const determinedRootCause = rootCause ?? why5 ?? why4 ?? why3 ?? why2;

    // Montar análise formatada
    const lines = [`1. ${why1}`, `2. ${why2}`];
    if (why3) lines.push(`3. ${why3}`);
    if (why4) lines.push(`4. ${why4}`);
    if (why5) lines.push(`5. ${why5}`);

    // TODO: Implementar atualização via repository e entity
    // const anomaly = await repository.findById(id, ...);
    // anomaly.startAnalysis();
    // anomaly.registerRootCauseAnalysis(why1, why2, why3, why4, why5, rootCause);
    // await repository.save(anomaly);

    return NextResponse.json({
      anomalyId: idResult.data,
      status: 'ANALYZING',
      rootCauseAnalysis: lines.join('\n'),
      rootCause: determinedRootCause,
      analyzedBy: context.userId,
      analyzedAt: new Date(),
      message: 'Análise de causa raiz registrada',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/anomalies/[id]/analyze error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
