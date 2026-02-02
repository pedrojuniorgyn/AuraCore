/**
 * API Route: /api/strategic/workflow/delegates/[id]
 * Gerenciamento de delegação específica
 * 
 * @module api/strategic/workflow/delegates/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/tenant/branch';
import { withDI } from '@/lib/di/with-di';
import type { ApprovalPermissionService } from '@/modules/strategic/application/services/ApprovalPermissionService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';

// ====================================
// DELETE /api/strategic/workflow/delegates/[id]
// Revoga delegação
// ====================================

export const DELETE = withDI(
  async (request: NextRequest, context: { params: { id: string } }) => {
    try {
      const authContext = getTenantContext(request);
      if (!authContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const branchId = resolveBranchIdOrThrow(request);
      const { id: delegateId } = context.params;

      // Resolver service
      const service = container.resolve<ApprovalPermissionService>(
        STRATEGIC_TOKENS.ApprovalPermissionService
      );

      // Revogar delegação
      const result = await service.revokeDelegate(
        delegateId,
        authContext.userId,
        authContext.organizationId,
        branchId
      );

      if (!result.isOk) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(
        { message: 'Delegação revogada com sucesso' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error revoking delegate:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
