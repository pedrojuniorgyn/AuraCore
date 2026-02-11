/**
 * API: PUT /api/strategic/control-items/[id]/value
 * Atualiza valor do Item de Controle e detecta anomalias
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
const updateValueSchema = z.object({
  value: z.number(),
  observedAt: z.string().transform((s) => new Date(s)).optional(),
  notes: z.string().optional(),
});

export const PUT = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    await getTenantContext(); // Validates auth
    const { id } = await context.params;

    const body = await request.json();
    const validation = updateValueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // TODO: Implementar lógica completa com repository
    // 1. Buscar ControlItem
    // 2. Chamar updateValue()
    // 3. Se anomalyDetected, criar Anomaly automaticamente
    // 4. Persistir

    // Simulação de resposta
    const anomalyDetected = validation.data.value < 0 || validation.data.value > 100;

    return NextResponse.json({
      controlItemId: id,
      value: validation.data.value,
      observedAt: validation.data.observedAt ?? new Date(),
      anomalyDetected,
      anomalyId: anomalyDetected ? globalThis.crypto.randomUUID() : null,
      message: anomalyDetected 
        ? 'Valor registrado - ANOMALIA DETECTADA' 
        : 'Valor registrado com sucesso',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('PUT /api/strategic/control-items/[id]/value error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
