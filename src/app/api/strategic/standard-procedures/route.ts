/**
 * API Routes: /api/strategic/standard-procedures
 * CRUD de Procedimentos Operacionais Padrão (POP)
 *
 * @module app/api/strategic
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { StandardProcedure, type StandardProcedureStatus } from '@/modules/strategic/domain/entities/StandardProcedure';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStandardProcedureRepository } from '@/modules/strategic/domain/ports/output/IStandardProcedureRepository';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

registerStrategicModule();

const createStandardProcedureSchema = z.object({
  sourceActionPlanId: z.string().uuid().optional(),
  code: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  problemDescription: z.string().min(1),
  rootCause: z.string().optional(),
  solution: z.string().min(1),
  standardOperatingProcedure: z.string().optional(),
  department: z.string().max(100).optional(),
  processName: z.string().max(200).optional(),
  ownerUserId: z.string().uuid(),
  nextReviewDate: z.string().datetime().transform((s) => new Date(s)).optional(),
});

// GET /api/strategic/standard-procedures
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as StandardProcedureStatus | undefined;
    const department = searchParams.get('department') ?? undefined;
    const processName = searchParams.get('processName') ?? undefined;
    const ownerUserId = searchParams.get('ownerUserId') ?? undefined;
    const needsReview = searchParams.get('needsReview') === 'true' ? true : undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const repository = container.resolve<IStandardProcedureRepository>(
      STRATEGIC_TOKENS.StandardProcedureRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      status,
      department,
      processName,
      ownerUserId,
      needsReview,
      page,
      pageSize,
    });

    return NextResponse.json({
      items: result.items.map(procedure => ({
        id: procedure.id,
        code: procedure.code,
        title: procedure.title,
        problemDescription: procedure.problemDescription,
        rootCause: procedure.rootCause,
        solution: procedure.solution,
        standardOperatingProcedure: procedure.standardOperatingProcedure,
        department: procedure.department,
        processName: procedure.processName,
        ownerUserId: procedure.ownerUserId,
        version: procedure.version,
        lastReviewDate: procedure.lastReviewDate?.toISOString() ?? null,
        nextReviewDate: procedure.nextReviewDate?.toISOString() ?? null,
        status: procedure.status,
        needsReview: procedure.needsReview,
        attachments: procedure.attachments,
        sourceActionPlanId: procedure.sourceActionPlanId,
        createdAt: procedure.createdAt.toISOString(),
      })),
      total: result.total,
      page,
      pageSize,
      filters: { status, department, processName, ownerUserId, needsReview },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/standard-procedures error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/standard-procedures
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createStandardProcedureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Verificar se código já existe
    const repository = container.resolve<IStandardProcedureRepository>(
      STRATEGIC_TOKENS.StandardProcedureRepository
    );

    const existing = await repository.findByCode(
      validation.data.code,
      context.organizationId,
      context.branchId
    );

    if (existing) {
      return NextResponse.json(
        { error: `Procedimento com código ${validation.data.code} já existe` },
        { status: 409 }
      );
    }

    // Criar entity
    const procedureResult = StandardProcedure.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      sourceActionPlanId: validation.data.sourceActionPlanId,
      code: validation.data.code,
      title: validation.data.title,
      problemDescription: validation.data.problemDescription,
      rootCause: validation.data.rootCause,
      solution: validation.data.solution,
      standardOperatingProcedure: validation.data.standardOperatingProcedure,
      department: validation.data.department,
      processName: validation.data.processName,
      ownerUserId: validation.data.ownerUserId,
      nextReviewDate: validation.data.nextReviewDate,
      createdBy: context.userId,
    });

    if (Result.isFail(procedureResult)) {
      return NextResponse.json({ error: procedureResult.error }, { status: 400 });
    }

    const entity = procedureResult.value;

    // Persistir via repository
    await repository.save(entity);

    return NextResponse.json({
      id: entity.id,
      code: entity.code,
      title: entity.title,
      status: entity.status,
      version: entity.version,
      message: 'Procedimento criado',
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/standard-procedures error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
