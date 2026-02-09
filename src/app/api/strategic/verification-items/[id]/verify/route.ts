/**
 * API Routes: /api/strategic/verification-items/[id]/verify
 * Registra uma verificação no Item de Verificação
 *
 * @module app/api/strategic/verification-items/[id]/verify
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IVerificationItemRepository } from '@/modules/strategic/domain/ports/output/IVerificationItemRepository';

const verifySchema = z.object({
  value: z.string().min(1).max(100),
  notes: z.string().max(1000).optional(),
});

// POST /api/strategic/verification-items/[id]/verify
export const POST = withDI(async (request: NextRequest, context: RouteContext) => {
  const params = context.params;
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IVerificationItemRepository>(
      STRATEGIC_TOKENS.VerificationItemRepository
    );

    const item = await repository.findById(id, context.organizationId, context.branchId);

    if (!item) {
      return NextResponse.json({ error: 'Verification Item not found' }, { status: 404 });
    }

    if (item.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Não é possível verificar um item inativo' },
        { status: 400 }
      );
    }

    const result = item.recordVerification(validation.data.value, context.userId);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await repository.save(item);

    return NextResponse.json({
      id: item.id,
      currentValue: item.currentValue,
      standardValue: item.standardValue,
      isCompliant: result.value.isCompliant,
      lastVerifiedAt: item.lastVerifiedAt?.toISOString(),
      lastVerifiedBy: item.lastVerifiedBy,
      message: result.value.isCompliant
        ? '✅ Verificação registrada - Em conformidade'
        : '⚠️ Verificação registrada - Fora do padrão',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/verification-items/[id]/verify error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
