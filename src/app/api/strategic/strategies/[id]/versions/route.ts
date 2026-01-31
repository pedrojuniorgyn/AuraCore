/**
 * Strategy Versions API Route
 *
 * Endpoints para gerenciar versões de estratégia (BUDGET, FORECAST, SCENARIO).
 * Permite planejamento multi-cenário sem alterar a versão ACTUAL.
 *
 * @example GET /api/strategic/strategies/{id}/versions - Listar versões
 * @example POST /api/strategic/strategies/{id}/versions - Criar versão
 *   Body: { "versionType": "BUDGET", "versionName": "Orçamento 2026" }
 */

import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import { CreateStrategyVersionUseCase } from '@/modules/strategic/application/commands/CreateStrategyVersionUseCase';

registerStrategicModule();

const postSchema = z.object({
  versionType: z.enum(['BUDGET', 'FORECAST', 'SCENARIO']),
  versionName: z.string().trim().min(1, { message: 'Nome da versão é obrigatório' }).max(100),
});

// GET - Listar versões de uma estratégia
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const strategyRepo = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    const versions = await strategyRepo.findAllVersions(
      params.id,
      ctx.organizationId,
      ctx.branchId
    );

    return NextResponse.json({
      data: versions.map(v => ({
        id: v.id,
        versionType: v.versionType,
        versionName: v.versionName,
        status: v.status,
        isLocked: v.isLocked,
        lockedAt: v.lockedAt,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    console.error('[strategy-versions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Criar nova versão
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const useCase = container.resolve(CreateStrategyVersionUseCase);
    const result = await useCase.execute({
      sourceStrategyId: params.id,
      versionType: parseResult.data.versionType,
      versionName: parseResult.data.versionName,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      createdBy: ctx.userId,
    });

    if (result.isFailure) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: { id: result.value } }, { status: 201 });
  } catch (error) {
    console.error('[strategy-versions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
