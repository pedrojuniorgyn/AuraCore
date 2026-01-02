import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { CreateLocation } from '@/modules/wms/application/use-cases/CreateLocation';
import { ListLocations } from '@/modules/wms/application/use-cases/queries/ListLocations';
import { CreateLocationSchema } from '@/modules/wms/application/dtos/CreateLocationDTO';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import type { ExecutionContext } from '@/modules/wms/application/dtos/ExecutionContext';
import { Result } from '@/shared/domain';
import { getHttpStatusFromError } from '@/lib/api/error-status';
import { parsePaginationParams } from '@/lib/api/pagination';
import { parseBooleanParam } from '@/lib/api/boolean-params';

/**
 * GET /api/wms/locations - List Locations
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
    const type = searchParams.get('type') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    
    // Bug Fix: Validate boolean parameter to reject invalid values
    const isActiveResult = parseBooleanParam(searchParams.get('isActive'), 'isActive');
    if (!isActiveResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: isActiveResult.error
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
    const useCase = container.resolve(ListLocations);
    const result = await useCase.execute(
      { page, limit, type, warehouseId, isActive: isActiveResult.value },
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
 * POST /api/wms/locations - Create Location
 * E7.8 WMS Semana 2
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant context (multi-tenancy)
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);

    // Parse and validate input
    const body = await request.json();
    const validation = CreateLocationSchema.safeParse(body);

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

    // Build execution context
    const context: ExecutionContext = {
      userId: tenantContext.userId,
      organizationId: tenantContext.organizationId,
      branchId: branchId,
      isAdmin: tenantContext.isAdmin
    };

    // Execute use case
    const useCase = container.resolve(CreateLocation);
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
