import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { ListStockItems } from '@/modules/wms/application/use-cases/queries/ListStockItems';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import type { ExecutionContext } from '@/modules/wms/application/dtos/ExecutionContext';
import { Result } from '@/shared/domain';
import { getHttpStatusFromError } from '@/lib/api/error-status';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const productId = searchParams.get('productId') || undefined;
    const locationId = searchParams.get('locationId') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const minQuantity = searchParams.get('minQuantity') ? parseFloat(searchParams.get('minQuantity')!) : undefined;
    const hasStockStr = searchParams.get('hasStock');
    const hasStock = hasStockStr ? hasStockStr === 'true' : undefined;
    const lotNumber = searchParams.get('lotNumber') || undefined;
    const expiredStr = searchParams.get('expired');
    const expired = expiredStr ? expiredStr === 'true' : undefined;

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
        hasStock,
        lotNumber,
        expired
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

