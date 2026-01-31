/**
 * API Routes: /api/strategic/standard-procedures/[id]/approve
 * Aprovar/Publicar procedimento (DRAFT → ACTIVE)
 *
 * @module app/api/strategic
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStandardProcedureRepository } from '@/modules/strategic/domain/ports/output/IStandardProcedureRepository';
import '@/modules/strategic/infrastructure/di/StrategicModule';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di/StrategicModule';

registerStrategicModule();

const uuidSchema = z.string().uuid();

// POST /api/strategic/standard-procedures/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    // Validar UUID
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const repository = container.resolve<IStandardProcedureRepository>(
      STRATEGIC_TOKENS.StandardProcedureRepository
    );

    const procedure = await repository.findById(
      id,
      context.organizationId,
      context.branchId
    );

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedimento não encontrado' },
        { status: 404 }
      );
    }

    // Publicar procedimento
    const publishResult = procedure.publish();

    if (Result.isFail(publishResult)) {
      return NextResponse.json({ error: publishResult.error }, { status: 400 });
    }

    // Persistir
    await repository.save(procedure);

    return NextResponse.json({
      id: procedure.id,
      code: procedure.code,
      title: procedure.title,
      status: procedure.status,
      version: procedure.version,
      lastReviewDate: procedure.lastReviewDate?.toISOString(),
      message: 'Procedimento publicado',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/standard-procedures/[id]/approve error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
