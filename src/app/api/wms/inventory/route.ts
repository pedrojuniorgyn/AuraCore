import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { StartInventoryCount } from '@/modules/wms/application/use-cases/StartInventoryCount';
import { ListInventoryCounts } from '@/modules/wms/application/use-cases/queries/ListInventoryCounts';
import { StartInventoryCountSchema } from '@/modules/wms/application/dtos/InventoryCountDTO';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import type { ExecutionContext } from '@/modules/wms/application/dtos/ExecutionContext';
import { Result } from '@/shared/domain';
import { getHttpStatusFromError } from '@/lib/api/error-status';
import { parsePaginationParams } from '@/lib/api/pagination';

/**
 * GET /api/wms/inventory - List Inventory Counts
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
    const status = searchParams.get('status') || undefined;
    const locationId = searchParams.get('locationId') || undefined;
    const productId = searchParams.get('productId') || undefined;

    // Build execution context
    const context: ExecutionContext = {
      userId: tenantContext.userId,
      organizationId: tenantContext.organizationId,
      branchId: branchId,
      isAdmin: tenantContext.isAdmin
    };

    // Execute use case
    const useCase = container.resolve(ListInventoryCounts);
    const result = await useCase.execute(
      { page, limit, status, locationId, productId },
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

/**
 * POST /api/wms/inventory - Start Inventory Count
 * E7.8 WMS Semana 2
 */
export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);

    const body = await request.json();
    const validation = StartInventoryCountSchema.safeParse(body);

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

    const useCase = container.resolve(StartInventoryCount);
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

