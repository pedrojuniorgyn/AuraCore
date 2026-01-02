import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { ListStockItems } from '@/modules/wms/application/use-cases/queries/ListStockItems';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import type { ExecutionContext } from '@/modules/wms/application/dtos/ExecutionContext';
import { Result } from '@/shared/domain';
import { getHttpStatusFromError } from '@/lib/api/error-status';
import { parsePaginationParams } from '@/lib/api/pagination';
import { parseNumberParam } from '@/lib/api/number-params';
import { parseBooleanParam } from '@/lib/api/boolean-params';

/**
 * GET /api/wms/stock - List Stock Items
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
    const warehouseId = searchParams.get('warehouseId') || undefined;
    
    // Bug Fix: Validate minQuantity with parseNumberParam to reject NaN
    const minQuantity = parseNumberParam(searchParams.get('minQuantity'), 'minQuantity');
    const lotNumber = searchParams.get('lotNumber') || undefined;
    
    // Bug Fix: Validate boolean parameters to reject invalid values
    const hasStockResult = parseBooleanParam(searchParams.get('hasStock'), 'hasStock');
    if (!hasStockResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: hasStockResult.error
        },
        { status: 400 }
      );
    }
    
    const expiredResult = parseBooleanParam(searchParams.get('expired'), 'expired');
    if (!expiredResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: expiredResult.error
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
    const useCase = container.resolve(ListStockItems);
    const result = await useCase.execute(
      {
        page,
        limit,
        productId,
        locationId,
        warehouseId,
        minQuantity,
        hasStock: hasStockResult.value,
        lotNumber,
        expired: expiredResult.value
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

