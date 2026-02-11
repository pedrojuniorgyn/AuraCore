/**
 * @swagger
 * /api/strategic/dashboard/bsc:
 *   get:
 *     summary: Dashboard BSC Executivo
 *     description: Dashboard enterprise-grade integrando Views SQL, Time Intelligence e Variance Analysis
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: strategyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da estratégia (se omitido, busca estratégia ACTIVE)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [YTD, MTD, QTD]
 *           default: YTD
 *         description: Período de análise
 *       - in: query
 *         name: comparison
 *         schema:
 *           type: string
 *           enum: [YoY, MoM, QoQ, NONE]
 *           default: YoY
 *         description: Tipo de comparação temporal
 *     responses:
 *       200:
 *         description: Dashboard BSC completo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/BSCDashboard'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IGetBSCDashboardUseCase } from '@/modules/strategic/application/queries/GetBSCDashboardQuery';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
registerStrategicModule();

const querySchema = z.object({
  strategyId: z.string().uuid().optional(),
  period: z.enum(['YTD', 'MTD', 'QTD']).default('YTD'),
  comparison: z.enum(['YoY', 'MoM', 'QoQ', 'NONE']).default('YoY'),
});

export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse({
      strategyId: searchParams.get('strategyId') || undefined,
      period: searchParams.get('period') || 'YTD',
      comparison: searchParams.get('comparison') || 'YoY',
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const query = container.resolve<IGetBSCDashboardUseCase>(
      STRATEGIC_TOKENS.GetBSCDashboardUseCase
    );

    const result = await query.execute({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      ...parseResult.data,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error('[bsc-dashboard] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
