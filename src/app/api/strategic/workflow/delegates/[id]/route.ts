/**
 * API Route: /api/strategic/workflow/delegates/[id]
 * Gerenciamento de delegação específica
 * 
 * @module api/strategic/workflow/delegates/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import type { ApprovalPermissionService } from '@/modules/strategic/application/services/ApprovalPermissionService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';

// ====================================
// DELETE /api/strategic/workflow/delegates/[id]
// Revoga delegação
// ====================================

export const DELETE = withDI(
  async (request: NextRequest, context: { params: Promise<Record<string, string>> | Record<string, string> }) => {
    try {
      const authContext = await getTenantContext();

      const branchId = resolveBranchIdOrThrow(request.headers, authContext);
      const { id: delegateId } = await context.params;
      const userId = parseInt(authContext.userId, 10);
      
      // Validar userId (consistente com GET/POST handlers)
      if (isNaN(userId) || userId <= 0) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 }
        );
      }

      // Resolver service
      const service = container.resolve<ApprovalPermissionService>(
        STRATEGIC_TOKENS.ApprovalPermissionService
      );

      // Revogar delegação
      const result = await service.revokeDelegate(
        delegateId,
        userId,
        authContext.organizationId,
        branchId
      );

      if (!Result.isOk(result)) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(
        { message: 'Delegação revogada com sucesso' },
        { status: 200 }
      );
    } catch (error) {
      // API-ERR-001: getTenantContext() and resolveBranchIdOrThrow() throw NextResponse
      if (error instanceof NextResponse) {
        return error; // Return original 401/403/400 response
      }
      console.error('Error revoking delegate:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
