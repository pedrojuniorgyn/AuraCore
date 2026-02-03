/**
 * API Route: /api/strategic/workflow/delegates
 * Gerenciamento de delegações de aprovação
 * 
 * @module api/strategic/workflow/delegates
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from 'tsyringe';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { withDI } from '@/shared/infrastructure/di/with-di';
import type { ApprovalPermissionService } from '@/modules/strategic/application/services/ApprovalPermissionService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';

// ====================================
// GET /api/strategic/workflow/delegates
// Lista delegações do usuário
// ====================================

export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const branchId = resolveBranchIdOrThrow(request.headers, context);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'received' | 'given'

    // Resolver service
    const service = container.resolve<ApprovalPermissionService>(
      STRATEGIC_TOKENS.ApprovalPermissionService
    );

    const userId = parseInt(context.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    let delegates;
    if (type === 'given') {
      // Delegações criadas pelo usuário (ele delegou para outros)
      delegates = await service.listDelegationsBy(
        userId,
        context.organizationId,
        branchId
      );
    } else {
      // Delegações recebidas pelo usuário (outros delegaram para ele)
      delegates = await service.listDelegationsFor(
        userId,
        context.organizationId,
        branchId
      );
    }

    // Serializar para JSON
    const serialized = delegates.map((d) => ({
      id: d.id,
      delegatorUserId: d.delegatorUserId,
      delegateUserId: d.delegateUserId,
      startDate: d.startDate.toISOString(),
      endDate: d.endDate?.toISOString() || null,
      isActive: d.isActive,
      isActiveNow: d.isActiveNow(),
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    // API-ERR-001: getTenantContext() and resolveBranchIdOrThrow() throw NextResponse
    if (error instanceof NextResponse) {
      return error; // Return original 401/403/400 response
    }
    console.error('Error listing delegates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// ====================================
// POST /api/strategic/workflow/delegates
// Cria delegação de aprovação
// ====================================

const createDelegateSchema = z.object({
  delegateUserId: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    const branchId = resolveBranchIdOrThrow(request.headers, context);

    // Parse e validar body
    const body = await request.json();
    const validation = createDelegateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { delegateUserId, startDate, endDate } = validation.data;

    // Resolver service
    const service = container.resolve<ApprovalPermissionService>(
      STRATEGIC_TOKENS.ApprovalPermissionService
    );

    const userId = parseInt(context.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Criar delegação
    const result = await service.delegate(
      userId,                      // from (delegator)
      delegateUserId,              // to (delegate)
      new Date(startDate),
      endDate ? new Date(endDate) : null,
      context.organizationId,
      branchId,
      context.userId               // já é string
    );

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const delegate = result.value;

    return NextResponse.json(
      {
        id: delegate.id,
        delegatorUserId: delegate.delegatorUserId,
        delegateUserId: delegate.delegateUserId,
        startDate: delegate.startDate.toISOString(),
        endDate: delegate.endDate?.toISOString() || null,
        isActive: delegate.isActive,
        message: 'Delegação criada com sucesso',
      },
      { status: 201 }
    );
  } catch (error) {
    // API-ERR-001: getTenantContext() and resolveBranchIdOrThrow() throw NextResponse
    if (error instanceof NextResponse) {
      return error; // Return original 401/403/400 response
    }
    console.error('Error creating delegate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
