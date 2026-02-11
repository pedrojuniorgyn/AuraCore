/**
 * API Routes: /api/departments
 * GET - List departments
 * POST - Create department
 *
 * @module app/api/departments
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { getTenantContext } from '@/lib/auth/context';
import type { IDepartmentRepository } from '@/shared/domain/ports/output/IDepartmentRepository';
import { Department } from '@/shared/domain';
import { Result } from '@/shared/domain';
import { CacheService } from '@/services/cache.service';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
const createDepartmentSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  parentId: z.string().uuid().optional(),
  managerUserId: z.number().int().positive().optional(),
});

/**
 * GET /api/departments
 * List all departments
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('active');
    const parentId = searchParams.get('parentId');

    const repository = container.resolve<IDepartmentRepository>(
      TOKENS.DepartmentRepository
    );

    const departments = await repository.findAll({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      parentId: parentId === 'null' ? null : parentId || undefined,
    });

    return NextResponse.json({
      success: true,
      data: departments.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        description: d.description,
        parentId: d.parentId,
        managerUserId: d.managerUserId,
        isActive: d.isActive,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      count: departments.length,
    });
  } catch (error) {
    logger.error('Error listing departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/departments
 * Create a new department
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const repository = container.resolve<IDepartmentRepository>(
      TOKENS.DepartmentRepository
    );

    // Check if code already exists
    const existing = await repository.findByCode(
      parsed.data.code,
      tenantContext.organizationId,
      tenantContext.branchId
    );
    if (existing) {
      return NextResponse.json(
        { error: `Department with code ${parsed.data.code} already exists` },
        { status: 409 }
      );
    }

    const departmentResult = Department.create({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description,
      parentId: parsed.data.parentId,
      managerUserId: parsed.data.managerUserId,
      createdBy: tenantContext.userId?.toString(),
    });

    if (!Result.isOk(departmentResult)) {
      return NextResponse.json(
        { error: departmentResult.error },
        { status: 400 }
      );
    }

    const saveResult = await repository.save(departmentResult.value);
    if (!Result.isOk(saveResult)) {
      return NextResponse.json(
        { error: saveResult.error },
        { status: 500 }
      );
    }

    // Invalidar cache de departments após mutation
    await CacheService.invalidatePattern('tree:*', 'departments:');

    return NextResponse.json(
      {
        success: true,
        data: {
          id: departmentResult.value.id,
          code: departmentResult.value.code,
          name: departmentResult.value.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
