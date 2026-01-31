/**
 * @swagger
 * /api/strategic/analytics/time-intelligence:
 *   get:
 *     summary: Time Intelligence
 *     description: Análises temporais com comparações YTD, MTD, QTD, YoY, MoM, QoQ
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         required: true
 *         schema:
 *           type: string
 *           enum: [kpi, goals, action-plans]
 *         description: Tipo de métrica
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [YTD, MTD, QTD]
 *           default: MTD
 *         description: Período de análise
 *       - in: query
 *         name: comparison
 *         schema:
 *           type: string
 *           enum: [YoY, MoM, QoQ, NONE]
 *           default: MoM
 *         description: Tipo de comparação
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da entidade (obrigatório para metric=kpi)
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [DAY, WEEK, MONTH]
 *         description: Granularidade (para metric=goals)
 *     responses:
 *       200:
 *         description: Dados de time intelligence
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: object
 *                     previous:
 *                       type: object
 *                     variance:
 *                       type: object
 *                       properties:
 *                         absolute: { type: 'number' }
 *                         percentage: { type: 'number' }
 *                         trend: { type: 'string', enum: [UP, DOWN, STABLE] }
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Não autorizado
 */

import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { TimeIntelligenceQueries } from '@/shared/infrastructure/time/TimeIntelligenceQueries';

const querySchema = z.object({
  metric: z.enum(['kpi', 'goals', 'action-plans']),
  period: z.enum(['YTD', 'MTD', 'QTD']).default('MTD'),
  comparison: z.enum(['YoY', 'MoM', 'QoQ', 'NONE']).default('MoM'),
  entityId: z.string().uuid().optional(),
  granularity: z.enum(['DAY', 'WEEK', 'MONTH']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse({
      metric: searchParams.get('metric'),
      period: searchParams.get('period') || 'MTD',
      comparison: searchParams.get('comparison') || 'MoM',
      entityId: searchParams.get('entityId'),
      granularity: searchParams.get('granularity'),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { metric, period, comparison, entityId, granularity } = parseResult.data;

    let result;
    switch (metric) {
      case 'kpi':
        if (!entityId) {
          return NextResponse.json({ error: 'entityId required for KPI metric' }, { status: 400 });
        }
        result = await TimeIntelligenceQueries.getKPIWithComparison(
          ctx.organizationId,
          ctx.branchId,
          entityId,
          period,
          comparison
        );
        break;

      case 'goals':
        result = await TimeIntelligenceQueries.getGoalsProgressTimeline(
          ctx.organizationId,
          ctx.branchId,
          period,
          granularity || 'MONTH'
        );
        break;

      case 'action-plans':
        result = await TimeIntelligenceQueries.getActionPlanCompletionRate(
          ctx.organizationId,
          ctx.branchId,
          period,
          comparison
        );
        break;
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[time-intelligence] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
