/**
 * API Routes: /api/departments/seed
 * POST - Seed default departments
 *
 * @module app/api/departments
 */
import 'reflect-metadata';
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { getTenantContext } from '@/lib/auth/context';
import type { IDepartmentRepository } from '@/shared/domain/ports/output/IDepartmentRepository';
import { Result } from '@/shared/domain';

/**
 * POST /api/departments/seed
 * Seed default departments for organization
 */
export async function POST() {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = container.resolve<IDepartmentRepository>(
      TOKENS.DepartmentRepository
    );

    const result = await repository.seedDefaults(
      tenantContext.organizationId,
      tenantContext.branchId,
      tenantContext.userId?.toString()
    );

    if (!Result.isOk(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Created ${result.value.length} default departments`,
      data: result.value.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
      })),
    });
  } catch (error) {
    console.error('Error seeding departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
