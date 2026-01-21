import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { ListMovements } from '@/modules/wms/application/use-cases/queries/ListMovements';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import type { ExecutionContext } from '@/modules/wms/application/dtos/ExecutionContext';
import { Result } from '@/shared/domain';
import { getHttpStatusFromError } from '@/lib/api/error-status';
import { parsePaginationParams } from '@/lib/api/pagination';
import { parseDateParam, validateDateRange } from '@/lib/api/date-params';

/**
 * GET /api/wms/movements - List Stock Movements
 * E7.8 WMS Semana 3
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context (multi-tenancy)
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Validate pagination parameters
    const paginationResult = parsePaginationParams(searchParams);
    if (!paginationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: paginationResult.error
        },
        { status: 400 }
      );
    }
    
    const { page, limit } = paginationResult.data;
    const productId = searchParams.get('productId') || undefined;
    const locationId = searchParams.get('locationId') || undefined;
    const type = searchParams.get('type') || undefined;
    
    // Bug Fix (Etapa 2.6): Validate date parameters
    const startDate = parseDateParam(searchParams.get('startDate'), 'startDate');
    const endDate = parseDateParam(searchParams.get('endDate'), 'endDate');
    
    // Validate date range
    if (!validateDateRange(startDate, endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate must be before or equal to endDate'
        },
        { status: 400 }
      );
    }

    // Build execution context
    const context: ExecutionContext = {
      userId: tenantContext.userId,
      organizationId: tenantContext.organizationId,
      branchId: branchId,
      isAdmin: tenantContext.isAdmin
    };

    // Execute use case
    const useCase = container.resolve(ListMovements);
    const result = await useCase.execute(
      {
        page,
        limit,
        productId,
        locationId,
        type,
        startDate,
        endDate
      },
      context
    );

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
      { status: 200 }
    );
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
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
