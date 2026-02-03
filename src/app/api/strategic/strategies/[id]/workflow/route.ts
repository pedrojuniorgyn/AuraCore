/**
 * API Routes: /api/strategic/strategies/[id]/workflow
 * POST - Execute workflow actions (submit, approve, reject, requestChanges)
 * GET - Get workflow history
 *
 * @module app/api/strategic/strategies
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { ApprovalWorkflowService } from '@/modules/strategic/domain/services/ApprovalWorkflowService';
import { Strategy } from '@/modules/strategic/domain/entities/Strategy';
import { ApprovalHistory } from '@/modules/strategic/domain/entities/ApprovalHistory';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import type { IApprovalHistoryRepository } from '@/modules/strategic/domain/ports/output/IApprovalHistoryRepository';
import type { ApprovalPermissionService } from '@/modules/strategic/application/services/ApprovalPermissionService';
import '@/modules/strategic/infrastructure/di/StrategicModule';

const workflowActionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'requestChanges']),
  userId: z.number().int().positive(),
  reason: z.string().trim().optional(),
  comments: z.string().trim().optional(),
});

/**
 * POST /api/strategic/strategies/{id}/workflow
 * Execute workflow action
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);
    const { id: strategyId } = await context.params;

    if (!strategyId) {
      return NextResponse.json(
        { error: 'strategyId is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = workflowActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, userId, reason, comments } = parsed.data;

    // Get repositories and services
    const strategyRepo = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );
    const historyRepo = container.resolve<IApprovalHistoryRepository>(
      STRATEGIC_TOKENS.ApprovalHistoryRepository
    );
    const permissionService = container.resolve<ApprovalPermissionService>(
      STRATEGIC_TOKENS.ApprovalPermissionService
    );

    // Find strategy
    const strategy = await strategyRepo.findById(
      strategyId,
      tenantContext.organizationId,
      branchId
    );

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    // Execute action
    let result: Result<
      { strategy: Strategy; historyEntry: ApprovalHistory },
      string
    >;
    switch (action) {
      case 'submit':
        result = ApprovalWorkflowService.submitForApproval(
          strategy,
          userId,
          comments
        );
        break;

      case 'approve': {
        // Validar permissão de aprovação
        const hasPermission = await permissionService.canApprove(
          userId,
          tenantContext.organizationId,
          branchId
        );

        result = ApprovalWorkflowService.approve(
          strategy,
          userId,
          hasPermission,
          comments
        );
        break;
      }

      case 'reject': {
        if (!reason) {
          return NextResponse.json(
            { error: 'Reason is required for rejection' },
            { status: 400 }
          );
        }

        // Validar permissão de aprovação
        const hasPermission = await permissionService.canApprove(
          userId,
          tenantContext.organizationId,
          branchId
        );

        result = ApprovalWorkflowService.reject(
          strategy,
          userId,
          hasPermission,
          reason,
          comments
        );
        break;
      }

      case 'requestChanges': {
        if (!reason) {
          return NextResponse.json(
            { error: 'Reason is required for requesting changes' },
            { status: 400 }
          );
        }

        // Validar permissão de aprovação
        const hasPermission = await permissionService.canApprove(
          userId,
          tenantContext.organizationId,
          branchId
        );

        result = ApprovalWorkflowService.requestChanges(
          strategy,
          userId,
          hasPermission,
          reason,
          comments
        );
        break;
      }

      default:
        // Exhaustive check: se chegar aqui, Zod validation falhou
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Save strategy and history
    const { strategy: updatedStrategy, historyEntry } = result.value;

    const saveResult = await strategyRepo.save(updatedStrategy);
    if (!Result.isOk(saveResult)) {
      return NextResponse.json(
        { error: saveResult.error },
        { status: 500 }
      );
    }

    // Salvar histórico de aprovação (audit trail)
    // Nota: historyRepo.save() faz throw em caso de erro (não retorna Result)
    try {
      await historyRepo.save(historyEntry);
    } catch (historyError) {
      const errorMsg = historyError instanceof Error ? historyError.message : String(historyError);
      console.error('❌ Falha ao salvar histórico de aprovação:', errorMsg);
      // Estratégia já foi salva - retornar warning mas não falhar request
      return NextResponse.json({
        success: true,
        warning: 'Ação executada mas histórico não foi registrado',
        data: {
          strategyId: updatedStrategy.id,
          workflowStatus: updatedStrategy.workflowStatus.value,
          action,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        strategyId: updatedStrategy.id,
        workflowStatus: updatedStrategy.workflowStatus.value,
        action,
      },
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() and resolveBranchIdOrThrow() throw NextResponse
    if (error instanceof NextResponse) {
      return error; // Return original 401/403/400 response
    }
    console.error('Error executing workflow action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/strategic/strategies/{id}/workflow
 * Get workflow history
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);
    const { id: strategyId } = await context.params;

    if (!strategyId) {
      return NextResponse.json(
        { error: 'strategyId is required' },
        { status: 400 }
      );
    }

    const historyRepo = container.resolve<IApprovalHistoryRepository>(
      STRATEGIC_TOKENS.ApprovalHistoryRepository
    );

    const history = await historyRepo.findByStrategyId(
      strategyId,
      tenantContext.organizationId,
      branchId
    );

    const historyData = history.map((h) => ({
      id: h.id,
      action: h.action,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorUserId: h.actorUserId,
      comments: h.comments,
      createdAt: h.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() and resolveBranchIdOrThrow() throw NextResponse
    if (error instanceof NextResponse) {
      return error; // Return original 401/403/400 response
    }
    console.error('Error getting workflow history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
