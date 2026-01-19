/**
 * API: POST /api/strategic/goals/[id]/cascade
 * Desdobra meta para nível inferior
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { CascadeGoalUseCase } from '@/modules/strategic/application/commands/CascadeGoalUseCase';

const cascadeSchema = z.object({
  children: z.array(z.object({
    code: z.string().min(1, 'Código é obrigatório').max(20),
    description: z.string().min(1, 'Descrição é obrigatória'),
    targetValue: z.number(),
    weight: z.number().min(0).max(100),
    ownerUserId: z.string().uuid('ownerUserId deve ser UUID válido'),
    ownerBranchId: z.number(),
    dueDate: z.string().transform((s) => new Date(s)),
  })).min(1, 'É necessário informar pelo menos uma meta filha'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const body = await request.json();
    const validation = cascadeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(CascadeGoalUseCase);
    const result = await useCase.execute(
      {
        parentGoalId: id,
        children: validation.data.children,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/goals/[id]/cascade error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
