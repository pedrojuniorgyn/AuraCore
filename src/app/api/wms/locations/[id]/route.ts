import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { GetLocationById } from '@/modules/wms/application/use-cases/queries/GetLocationById';
import { UpdateLocation } from '@/modules/wms/application/use-cases/UpdateLocation';
import { DeleteLocation } from '@/modules/wms/application/use-cases/DeleteLocation';
import { UpdateLocationSchema } from '@/modules/wms/application/dtos/UpdateLocationDTO';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import type { ExecutionContext } from '@/modules/wms/application/dtos/ExecutionContext';
import { Result } from '@/shared/domain';
import { getHttpStatusFromError } from '@/lib/api/error-status';

/**
 * GET /api/wms/locations/[id] - Get Location by ID
 * E7.8 WMS Semana 3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Get tenant context (multi-tenancy)
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);

    // Build execution context
    const context: ExecutionContext = {
      userId: tenantContext.userId,
      organizationId: tenantContext.organizationId,
      branchId: branchId,
      isAdmin: tenantContext.isAdmin
    };

    // Execute use case
    const useCase = container.resolve(GetLocationById);
    const result = await useCase.execute({ id: resolvedParams.id }, context);

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
 * PUT /api/wms/locations/[id] - Update Location
 * E7.8 WMS Semana 3
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Get tenant context (multi-tenancy)
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);

    // Parse and validate input
    const body = await request.json();
    const validation = UpdateLocationSchema.safeParse({ ...body, id: resolvedParams.id });

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
    const useCase = container.resolve(UpdateLocation);
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
 * DELETE /api/wms/locations/[id] - Delete Location
 * E7.8 WMS Semana 3
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Get tenant context (multi-tenancy)
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);

    // Build execution context
    const context: ExecutionContext = {
      userId: tenantContext.userId,
      organizationId: tenantContext.organizationId,
      branchId: branchId,
      isAdmin: tenantContext.isAdmin
    };

    // Execute use case
    const useCase = container.resolve(DeleteLocation);
    const result = await useCase.execute({ id: resolvedParams.id }, context);

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

