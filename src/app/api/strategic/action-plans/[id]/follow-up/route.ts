/**
 * API Routes: /api/strategic/action-plans/[id]/follow-up
 * Follow-up 3G (GEMBA/GEMBUTSU/GENJITSU)
 * 
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { ExecuteFollowUpUseCase } from '@/modules/strategic/application/commands/ExecuteFollowUpUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IActionPlanFollowUpRepository } from '@/modules/strategic/domain/ports/output/IActionPlanFollowUpRepository';

const idSchema = z.string().trim().uuid();

const followUpSchema = z.object({
  followUpDate: z.string().trim().transform((s) => new Date(s)),
  
  // 3G (OBRIGATÓRIOS)
  gembaLocal: z.string().trim().min(1, 'GEMBA (local) é obrigatório'),
  gembutsuObservation: z.string().trim().min(1, 'GEMBUTSU (observação) é obrigatório'),
  genjitsuData: z.string().trim().min(1, 'GENJITSU (dados) é obrigatório'),
  
  // Resultado
  executionStatus: z.enum(['EXECUTED_OK', 'EXECUTED_PARTIAL', 'NOT_EXECUTED', 'BLOCKED']),
  executionPercent: z.number().min(0).max(100),
  problemsObserved: z.string().trim().optional(),
  problemSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  
  // Reproposição
  requiresNewPlan: z.boolean().optional(),
  newPlanDescription: z.string().trim().optional(),
  newPlanAssignedTo: z.string().trim().uuid().optional(),
  
  // Evidências
  evidenceUrls: z.array(z.string().trim().url()).optional(),
});

// GET /api/strategic/action-plans/[id]/follow-up - Lista follow-ups
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext(); // Validates auth and gets tenant context
    const { id } = await params;

    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid action plan id' }, { status: 400 });
    }

    const repository = container.resolve<IActionPlanFollowUpRepository>(
      STRATEGIC_TOKENS.ActionPlanFollowUpRepository
    );

    // Multi-tenancy: passar organizationId e branchId
    const followUps = await repository.findByActionPlanId(
      idValidation.data,
      context.organizationId,
      context.branchId
    );

    return NextResponse.json({
      items: followUps.map((fu) => ({
        id: fu.id,
        followUpNumber: fu.followUpNumber,
        followUpDate: fu.followUpDate.toISOString(),
        gembaLocal: fu.gembaLocal,
        gembutsuObservation: fu.gembutsuObservation,
        genjitsuData: fu.genjitsuData,
        executionStatus: fu.executionStatus.value,
        executionPercent: fu.executionPercent,
        problemsObserved: fu.problemsObserved,
        problemSeverity: fu.problemSeverity,
        requiresNewPlan: fu.requiresNewPlan,
        childActionPlanId: fu.childActionPlanId,
        verifiedBy: fu.verifiedBy,
        verifiedAt: fu.verifiedAt.toISOString(),
        evidenceUrls: fu.evidenceUrls,
        requiresEscalation: fu.requiresEscalation,
      })),
      total: followUps.length,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/action-plans/[id]/follow-up error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/action-plans/[id]/follow-up - Registra follow-up 3G
export async function POST(
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = followUpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(ExecuteFollowUpUseCase);
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

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/action-plans/[id]/follow-up error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
