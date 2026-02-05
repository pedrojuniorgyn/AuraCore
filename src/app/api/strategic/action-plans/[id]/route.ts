/**
 * API Routes: /api/strategic/action-plans/[id]
 * Operações em plano de ação específico
 * 
 * 🔐 ABAC: Todas as operações de escrita validam branchId
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { 
  getTenantContext, 
  validateABACResourceAccess,
  abacDeniedResponse 
} from '@/lib/auth/context';
import { AdvancePDCACycleUseCase } from '@/modules/strategic/application/commands/AdvancePDCACycleUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';
import { UpdateActionPlanInputSchema } from '@/modules/strategic/application/dtos/UpdateActionPlanDTO';

const idSchema = z.string().trim().uuid();

const advancePDCASchema = z.object({
  completionPercent: z.number().min(0).max(100).optional(),
  notes: z.string().trim().optional(),
});

// Schema específico para PATCH de 5W2H (subset do UpdateActionPlanInputSchema)
const update5W2HSchema = z.object({
  what: z.string().min(1).max(2000).optional(),
  why: z.string().min(1).max(2000).optional(),
  whereLocation: z.string().min(1).max(200).optional(),
  whenStart: z.coerce.date().optional(),
  whenEnd: z.coerce.date().optional(),
  who: z.string().min(1).max(100).optional(),
  how: z.string().min(1).max(5000).optional(),
  howMuchAmount: z.number().nonnegative().optional().nullable(),
  howMuchCurrency: z.string().length(3).optional(),
}).refine(
  (data) => {
    // Validar datas se ambas forem informadas
    if (data.whenStart && data.whenEnd) {
      return data.whenEnd >= data.whenStart;
    }
    return true;
  },
  {
    message: 'Data de término deve ser igual ou posterior à data de início',
    path: ['whenEnd'],
  }
);

const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
};

// GET /api/strategic/action-plans/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid action plan id' }, { status: 400 });
    }

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    const plan = await repository.findById(
      idValidation.data,
      context.organizationId,
      context.branchId
    );

    if (!plan) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: plan.id,
      code: plan.code,
      what: plan.what,
      why: plan.why,
      whereLocation: plan.whereLocation,
      whenStart: plan.whenStart.toISOString(),
      whenEnd: plan.whenEnd.toISOString(),
      who: plan.who,
      whoUserId: plan.whoUserId,
      how: plan.how,
      howMuchAmount: plan.howMuchAmount,
      howMuchCurrency: plan.howMuchCurrency,
      pdcaCycle: plan.pdcaCycle.value,
      completionPercent: plan.completionPercent,
      priority: plan.priority,
      status: plan.status,
      isOverdue: plan.isOverdue,
      goalId: plan.goalId,
      parentActionPlanId: plan.parentActionPlanId,
      repropositionNumber: plan.repropositionNumber,
      repropositionReason: plan.repropositionReason,
      evidenceUrls: plan.evidenceUrls,
      nextFollowUpDate: plan.nextFollowUpDate?.toISOString() ?? null,
      canRepropose: plan.canRepropose,
      createdBy: plan.createdBy,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/action-plans/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/strategic/action-plans/[id] - Atualizar campos 5W2H
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid action plan id' }, { status: 400 });
    }

    const body = await safeJson<unknown>(request);

    const validation = update5W2HSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    // Buscar entity existente
    const existingPlan = await repository.findById(
      idValidation.data,
      context.organizationId,
      context.branchId
    );

    if (!existingPlan) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }

    // ============================
    // 🔐 ABAC VALIDATION (E9.4)
    // ============================
    // Validar se usuário tem acesso à filial do action plan antes de editar
    const abacResult = validateABACResourceAccess(context, existingPlan.branchId);
    if (!abacResult.allowed) {
      return abacDeniedResponse(abacResult, context);
    }

    // Atualizar campos da entity usando reconstitute
    // IMPORTANTE: ActionPlan não tem método update genérico, apenas updateProgress/updateStatus
    // Para atualizar 5W2H, precisamos reconstitute com os campos mesclados
    const { ActionPlan } = await import('@/modules/strategic/domain/entities/ActionPlan');
    
    // Mesclar dados: novos valores do form com valores existentes da entity
    const updatedPlanResult = ActionPlan.reconstitute({
      id: existingPlan.id,
      code: existingPlan.code,
      organizationId: existingPlan.organizationId,
      branchId: existingPlan.branchId,
      goalId: existingPlan.goalId,
      // 5W2H - mesclar novos valores (validation.data pode ter campos undefined)
      what: validation.data.what ?? existingPlan.what,
      why: validation.data.why ?? existingPlan.why,
      whereLocation: validation.data.whereLocation ?? existingPlan.whereLocation,
      whenStart: validation.data.whenStart ?? existingPlan.whenStart,
      whenEnd: validation.data.whenEnd ?? existingPlan.whenEnd,
      who: validation.data.who ?? existingPlan.who,
      whoUserId: existingPlan.whoUserId,
      whoType: existingPlan.whoType,
      whoEmail: existingPlan.whoEmail,
      whoPartnerId: existingPlan.whoPartnerId,
      how: validation.data.how ?? existingPlan.how,
      howMuchAmount: validation.data.howMuchAmount !== undefined 
        ? validation.data.howMuchAmount 
        : existingPlan.howMuchAmount,
      howMuchCurrency: validation.data.howMuchCurrency ?? existingPlan.howMuchCurrency,
      // Manter campos de controle (Value Objects e enums mantidos como estão)
      pdcaCycle: existingPlan.pdcaCycle, // PDCACycle Value Object
      completionPercent: existingPlan.completionPercent,
      priority: existingPlan.priority,
      status: existingPlan.status,
      parentActionPlanId: existingPlan.parentActionPlanId,
      repropositionNumber: existingPlan.repropositionNumber,
      repropositionReason: existingPlan.repropositionReason,
      evidenceUrls: existingPlan.evidenceUrls,
      nextFollowUpDate: existingPlan.nextFollowUpDate,
      createdBy: existingPlan.createdBy,
      createdAt: existingPlan.createdAt,
      updatedAt: new Date(), // Atualizar timestamp
    });

    if (Result.isFail(updatedPlanResult)) {
      return NextResponse.json({ error: updatedPlanResult.error }, { status: 400 });
    }

    // Salvar no banco
    await repository.save(updatedPlanResult.value);

    // Retornar dados atualizados
    const updated = updatedPlanResult.value;
    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      what: updated.what,
      why: updated.why,
      whereLocation: updated.whereLocation,
      whenStart: updated.whenStart.toISOString(),
      whenEnd: updated.whenEnd.toISOString(),
      who: updated.who,
      whoUserId: updated.whoUserId,
      how: updated.how,
      howMuchAmount: updated.howMuchAmount,
      howMuchCurrency: updated.howMuchCurrency,
      pdcaCycle: updated.pdcaCycle.value,
      completionPercent: updated.completionPercent,
      priority: updated.priority,
      status: updated.status,
      isOverdue: updated.isOverdue,
      goalId: updated.goalId,
      parentActionPlanId: updated.parentActionPlanId,
      repropositionNumber: updated.repropositionNumber,
      repropositionReason: updated.repropositionReason,
      evidenceUrls: updated.evidenceUrls,
      nextFollowUpDate: updated.nextFollowUpDate?.toISOString() ?? null,
      canRepropose: updated.canRepropose,
      createdBy: updated.createdBy,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PATCH /api/strategic/action-plans/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/strategic/action-plans/[id]/advance - Avançar PDCA
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid action plan id' }, { status: 400 });
    }

    // ============================
    // 🔐 ABAC VALIDATION (E9.4)
    // ============================
    // Buscar action plan para validar acesso antes de avançar PDCA
    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );
    const existingPlan = await repository.findById(
      idValidation.data,
      context.organizationId,
      context.branchId
    );
    if (!existingPlan) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }
    const abacResult = validateABACResourceAccess(context, existingPlan.branchId);
    if (!abacResult.allowed) {
      return abacDeniedResponse(abacResult, context);
    }

    const body = await safeJson<unknown>(request);

    const validation = advancePDCASchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(AdvancePDCACycleUseCase);
    const result = await useCase.execute(
      {
        actionPlanId: idValidation.data,
        ...validation.data,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('PUT /api/strategic/action-plans/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/strategic/action-plans/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid action plan id' }, { status: 400 });
    }

    const repository = container.resolve<IActionPlanRepository>(
      STRATEGIC_TOKENS.ActionPlanRepository
    );

    // ============================
    // 🔐 ABAC VALIDATION (E9.4)
    // ============================
    // Buscar action plan para validar acesso antes de deletar
    const existingPlan = await repository.findById(
      idValidation.data,
      context.organizationId,
      context.branchId
    );
    if (!existingPlan) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }
    const abacResult = validateABACResourceAccess(context, existingPlan.branchId);
    if (!abacResult.allowed) {
      return abacDeniedResponse(abacResult, context);
    }

    await repository.delete(idValidation.data, context.organizationId, context.branchId);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/strategic/action-plans/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
