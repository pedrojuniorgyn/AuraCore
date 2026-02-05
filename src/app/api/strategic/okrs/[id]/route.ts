/**
 * API Routes: /api/strategic/okrs/[id]
 * 
 * Task 04: Migrated from Mock Store to DDD Repository
 * Uses DrizzleOkrRepository via DI Container
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di';
import type { IOkrRepository } from '@/modules/strategic/okr/domain/ports/output/IOkrRepository';
import { OKR_TOKENS } from '@/modules/strategic/okr/infrastructure/di/tokens';
import { OKR } from '@/modules/strategic/okr/domain/entities/OKR';
import type { KeyResult as DomainKeyResult } from '@/modules/strategic/okr/domain/entities/KeyResult';
import type { KeyResult as LegacyKeyResult } from '@/lib/okrs/okr-types';
import { Result } from '@/shared/domain/types/Result';

// Ensure DI container is registered
registerStrategicModule();

/**
 * Converte DDD KeyResult ValueObject para Legacy DTO
 * Bug Fix (Task 04 - Bug 1): Adicionar propriedades ausentes (okrId, progress, valueHistory)
 * Bug Fix (Task 04 - Bug 3): Usar timestamps do OKR parent para consistência
 */
function toLegacyKeyResultDTO(
  kr: DomainKeyResult,
  okrId: string,
  okrCreatedAt: Date,
  okrUpdatedAt: Date
): LegacyKeyResult {
  return {
    id: kr.id ?? globalThis.crypto.randomUUID(),
    okrId,
    title: kr.title,
    description: kr.description,
    metricType: kr.metricType,
    startValue: kr.startValue,
    targetValue: kr.targetValue,
    currentValue: kr.currentValue,
    unit: kr.unit,
    progress: kr.progress,
    status: kr.status,
    linkedKpiId: kr.linkedKpiId,
    linkedKpiName: undefined,
    linkedActionPlanId: kr.linkedActionPlanId,
    linkedActionPlanName: undefined,
    weight: kr.weight,
    valueHistory: [],
    order: kr.order,
    createdAt: okrCreatedAt, // Bug Fix: Usar timestamp do OKR parent (consistente)
    updatedAt: okrUpdatedAt, // Bug Fix: Usar timestamp do OKR parent (consistente)
  };
}

// Zod schemas
const idParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

const updateOkrSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  level: z.enum(['corporate', 'department', 'team', 'individual']).optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    // Validate ID
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid ID', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    // Get tenant context (multi-tenancy)
    const tenantCtx = await getTenantContext();

    // Resolve Repository via DI
    const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);

    // Fetch OKR by ID
    const okr = await repository.findById(id, tenantCtx.organizationId, tenantCtx.branchId);

    if (!okr) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    // Convert Domain Entity to DTO
    return NextResponse.json({
      id: okr.id,
      title: okr.title,
      description: okr.description,
      level: okr.level,
      parentId: okr.parentId,
      periodType: okr.periodType,
      periodLabel: okr.periodLabel,
      startDate: okr.startDate,
      endDate: okr.endDate,
      ownerId: okr.ownerId,
      ownerName: okr.ownerName,
      ownerType: okr.ownerType,
      keyResults: okr.keyResults.map((kr) => toLegacyKeyResultDTO(kr, okr.id, okr.createdAt, okr.updatedAt)),
      progress: okr.progress,
      status: okr.status,
      organizationId: okr.organizationId,
      branchId: okr.branchId,
      createdBy: okr.createdBy,
      createdAt: okr.createdAt,
      updatedAt: okr.updatedAt,
    });
  } catch (error) {
    // Propagate auth errors (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('[GET /api/strategic/okrs/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OKR' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    // Validate ID
    const idValidation = idParamSchema.safeParse(resolvedParams);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid ID', details: idValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id } = idValidation.data;

    const body = await request.json();

    // Validate body
    const validation = updateOkrSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validated = validation.data;

    // Get tenant context (multi-tenancy)
    const tenantCtx = await getTenantContext();

    // Resolve Repository via DI
    const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);

    // Fetch existing OKR
    const okr = await repository.findById(id, tenantCtx.organizationId, tenantCtx.branchId);

    if (!okr) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    // Bug Fix (Task 04 - Bug 2): Use domain methods for status transitions
    // Do NOT use reconstitute() for status changes - it bypasses state machine validation
    
    // Handle status transitions using domain methods
    if (validated.status !== undefined && validated.status !== okr.status) {
      let transitionResult: Result<void, string> | undefined;

      // Validate and execute state transitions using domain methods
      switch (validated.status) {
        case 'active':
          if (okr.status !== 'draft') {
            return NextResponse.json(
              { error: `Cannot activate OKR with status ${okr.status}. Only draft OKRs can be activated.` },
              { status: 400 }
            );
          }
          transitionResult = okr.activate();
          break;

        case 'completed':
          if (okr.status !== 'active') {
            return NextResponse.json(
              { error: `Cannot complete OKR with status ${okr.status}. Only active OKRs can be completed.` },
              { status: 400 }
            );
          }
          transitionResult = okr.complete();
          break;

        case 'cancelled':
          transitionResult = okr.cancel();
          break;

        case 'draft':
          // No transition method for draft (only initial state)
          return NextResponse.json(
            { error: 'Cannot change status back to draft. Status transitions: draft→active→completed or any→cancelled.' },
            { status: 400 }
          );

        default:
          return NextResponse.json(
            { error: `Invalid status: ${validated.status}` },
            { status: 400 }
          );
      }

      // Check if transition was successful
      if (transitionResult && Result.isFail(transitionResult)) {
        return NextResponse.json(
          { error: transitionResult.error },
          { status: 400 }
        );
      }
    }

    // Bug Fix (Task 04 - Bug 4): Apply non-status updates using updateDetails()
    // Do NOT use reconstitute() - it creates new instance and loses domain events!
    // updateDetails() mutates in place and preserves domain events from status transitions
    if (validated.title !== undefined || 
        validated.description !== undefined || 
        validated.endDate !== undefined) {
      const updateResult = okr.updateDetails({
        title: validated.title,
        description: validated.description,
        endDate: validated.endDate ? new Date(validated.endDate) : undefined,
      });

      if (Result.isFail(updateResult)) {
        return NextResponse.json(
          { error: updateResult.error },
          { status: 400 }
        );
      }
    }

    // Save OKR (same instance with all domain events preserved)
    const saveResult = await repository.save(okr);

    if (Result.isFail(saveResult)) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 });
    }

    // Return updated OKR
    return NextResponse.json({
      id: okr.id,
      title: okr.title,
      description: okr.description,
      level: okr.level,
      parentId: okr.parentId,
      periodType: okr.periodType,
      periodLabel: okr.periodLabel,
      startDate: okr.startDate,
      endDate: okr.endDate,
      ownerId: okr.ownerId,
      ownerName: okr.ownerName,
      ownerType: okr.ownerType,
      keyResults: okr.keyResults.map((kr) => toLegacyKeyResultDTO(kr, okr.id, okr.createdAt, okr.updatedAt)),
      progress: okr.progress,
      status: okr.status,
      organizationId: okr.organizationId,
      branchId: okr.branchId,
      createdBy: okr.createdBy,
      createdAt: okr.createdAt,
      updatedAt: okr.updatedAt,
    });
  } catch (error) {
    // Propagate auth errors (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('[PATCH /api/strategic/okrs/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update OKR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    // Validate ID
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid ID', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    // Get tenant context (multi-tenancy)
    const tenantCtx = await getTenantContext();

    // Resolve Repository via DI
    const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);

    // Check if OKR exists before deleting
    const existingOkr = await repository.findById(id, tenantCtx.organizationId, tenantCtx.branchId);

    if (!existingOkr) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    // Delete OKR (soft delete) - returns void
    await repository.delete(id, tenantCtx.organizationId, tenantCtx.branchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagate auth errors (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('[DELETE /api/strategic/okrs/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete OKR' },
      { status: 500 }
    );
  }
}
