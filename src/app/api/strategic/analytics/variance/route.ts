/**
 * @swagger
 * /api/strategic/analytics/variance:
 *   get:
 *     summary: Análise de Variância
 *     description: Análise ACTUAL vs BUDGET vs FORECAST com status automático
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2100
 *         description: Ano de análise
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Mês (opcional)
 *       - in: query
 *         name: kpiId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por KPI específico
 *       - in: query
 *         name: summary
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Retornar apenas resumo
 *     responses:
 *       200:
 *         description: Análise de variância
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/VarianceAnalysis'
 *                     - type: object
 *                       properties:
 *                         totalKPIs: { type: 'integer' }
 *                         favorable: { type: 'integer' }
 *                         acceptable: { type: 'integer' }
 *                         unfavorable: { type: 'integer' }
 *                         avgVariancePct: { type: 'number' }
 *       401:
 *         description: Não autorizado
 *   post:
 *     summary: Salvar Valor de Versão
 *     description: Salva valor ACTUAL, BUDGET ou FORECAST para um KPI
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kpiId
 *               - versionType
 *               - year
 *               - month
 *               - value
 *             properties:
 *               kpiId:
 *                 type: string
 *                 format: uuid
 *               versionType:
 *                 type: string
 *                 enum: [ACTUAL, BUDGET, FORECAST]
 *               year:
 *                 type: integer
 *                 minimum: 2020
 *                 maximum: 2100
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               value:
 *                 type: number
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Valor salvo com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */

import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { VarianceAnalysisService } from '@/modules/strategic/application/services/VarianceAnalysisService';

const getSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  kpiId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  summary: z.enum(['true', 'false']).optional(),
});

const postSchema = z.object({
  kpiId: z.string().uuid(),
  versionType: z.enum(['ACTUAL', 'BUDGET', 'FORECAST']),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  value: z.number(),
  notes: z.string().trim().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = getSchema.safeParse({
      year: searchParams.get('year') || new Date().getFullYear(),
      month: searchParams.get('month'),
      kpiId: searchParams.get('kpiId'),
      goalId: searchParams.get('goalId'),
      summary: searchParams.get('summary'),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { year, month, kpiId, goalId, summary } = parseResult.data;
    const service = new VarianceAnalysisService();

    if (summary === 'true') {
      const result = await service.getVarianceSummary(ctx.organizationId, ctx.branchId, year, month);
      return NextResponse.json({ data: result });
    }

    const result = await service.getKPIVariance(ctx.organizationId, ctx.branchId, {
      year,
      month,
      kpiId,
      goalId,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[variance] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
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

    const service = new VarianceAnalysisService();
    await service.saveVersionValue(ctx.organizationId, ctx.branchId, {
      ...parseResult.data,
      createdBy: ctx.userId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[variance] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
