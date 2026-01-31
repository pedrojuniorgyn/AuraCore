/**
 * API Routes: /api/strategic/alerts
 * Sistema de alertas automáticos para KPI/Anomaly/Variance/Action Plans
 *
 * @module app/api/strategic
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { AlertService } from '@/modules/strategic/application/services/AlertService';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

registerStrategicModule();

const postSchema = z.object({
  action: z.enum(['check', 'acknowledge', 'resolve']),
  alertId: z.string().uuid().optional(),
});

// GET /api/strategic/alerts - Listar alertas pendentes
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alertService = new AlertService();
    const alerts = await alertService.getPendingAlerts(ctx.organizationId, ctx.branchId);

    return NextResponse.json({ data: alerts });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[alerts] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/strategic/alerts - Executar verificação ou atualizar status
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parseResult = postSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { action, alertId } = parseResult.data;
    const alertService = new AlertService();

    switch (action) {
      case 'check': {
        const results = await alertService.checkAllAlerts(ctx.organizationId, ctx.branchId);

        // Salvar alertas gerados
        for (const result of results) {
          await alertService.saveAlerts(ctx.organizationId, ctx.branchId, result.alerts);
        }

        const totalAlerts = results.reduce((sum, r) => sum + r.count, 0);
        return NextResponse.json({
          data: {
            totalAlerts,
            byType: results.map(r => ({ type: r.alertType, count: r.count }))
          }
        });
      }

      case 'acknowledge': {
        if (!alertId) {
          return NextResponse.json({ error: 'alertId required' }, { status: 400 });
        }
        await alertService.acknowledgeAlert(alertId, ctx.userId);
        return NextResponse.json({ success: true });
      }

      case 'resolve': {
        if (!alertId) {
          return NextResponse.json({ error: 'alertId required' }, { status: 400 });
        }
        await alertService.resolveAlert(alertId, ctx.userId);
        return NextResponse.json({ success: true });
      }
    }
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[alerts] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
