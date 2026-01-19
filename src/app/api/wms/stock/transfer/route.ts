import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { TransferStock } from '@/modules/wms/application/use-cases/TransferStock';
import { TransferStockSchema } from '@/modules/wms/application/dtos/TransferStockDTO';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import type { ExecutionContext } from '@/modules/wms/application/dtos/ExecutionContext';
import { Result } from '@/shared/domain';
import { getHttpStatusFromError } from '@/lib/api/error-status';

/**
 * POST /api/wms/stock/transfer - Transfer Stock
 * E7.8 WMS Semana 2
 */
export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);

    const body = await request.json();
    const validation = TransferStockSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        },
        { status: 400 }
      );
    }

    const context: ExecutionContext = {
      userId: tenantContext.userId,
      organizationId: tenantContext.organizationId,
      branchId: branchId,
      isAdmin: tenantContext.isAdmin
    };

    const useCase = container.resolve(TransferStock);
    const result = await useCase.execute(validation.data, context);

    if (!Result.isOk(result)) {
      const status = getHttpStatusFromError(result.error);
      
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.value
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

