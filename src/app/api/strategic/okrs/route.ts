/**
 * API Routes: /api/strategic/okrs
 * 
 * Task 04: Migrated from Mock Store to DDD Repository
 * Uses DrizzleOkrRepository via DI Container
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { registerStrategicModule } from '@/modules/strategic/infrastructure/di';
import type { IOkrRepository } from '@/modules/strategic/okr/domain/ports/output/IOkrRepository';
import { OKR_TOKENS } from '@/modules/strategic/okr/infrastructure/di/tokens';
import { OKR } from '@/modules/strategic/okr/domain/entities/OKR';
import { Result } from '@/shared/domain/types/Result';

// Ensure DI container is registered
registerStrategicModule();

// Zod schema for creating OKR
const createOkrSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  level: z.enum(['corporate', 'department', 'team', 'individual']),
  parentId: z.string().uuid().optional(),
  periodType: z.enum(['quarter', 'semester', 'year', 'custom']),
  periodLabel: z.string().min(1).max(50),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  ownerId: z.string().min(1),
  ownerName: z.string().min(1),
  ownerType: z.enum(['user', 'team', 'department']),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.getAll('level');
    const status = searchParams.getAll('status');
    const ownerId = searchParams.get('ownerId');
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search');

    // Get tenant context (multi-tenancy)
    const tenantCtx = await getTenantContext();

    // Resolve Repository via DI
    const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);

    // Fetch all OKRs for this tenant
    const result = await repository.findMany({
      organizationId: tenantCtx.organizationId,
      branchId: tenantCtx.branchId,
    });

    let okrs = result.items;

    // Apply filters
    if (level.length > 0) {
      okrs = okrs.filter((o: OKR) => level.includes(o.level));
    }
    if (status.length > 0) {
      okrs = okrs.filter((o: OKR) => status.includes(o.status));
    }
    if (ownerId) {
      okrs = okrs.filter((o: OKR) => o.ownerId === ownerId);
    }
    if (parentId !== null) {
      if (parentId === 'null') {
        okrs = okrs.filter((o: OKR) => !o.parentId);
      } else {
        okrs = okrs.filter((o: OKR) => o.parentId === parentId);
      }
    }
    if (search) {
      const searchLower = search.toLowerCase();
      okrs = okrs.filter(
        (o: OKR) =>
          o.title.toLowerCase().includes(searchLower) ||
          o.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by level priority then title
    const levelOrder: Record<string, number> = { corporate: 0, department: 1, team: 2, individual: 3 };
    okrs.sort((a: OKR, b: OKR) => {
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return a.title.localeCompare(b.title);
    });

    // Convert Domain Entities to DTOs
    const okrDtos = okrs.map((okr: OKR) => ({
      id: okr.id,
      title: okr.title,
      description: okr.description,
      level: okr.level,
      parentId: okr.parentId,
      periodType: okr.periodType,
      periodLabel: okr.periodLabel,
      startDate: okr.startDate,
      endDate: okr.endDate,
      ownerId: okr.ownerId,
      ownerName: okr.ownerName,
      ownerType: okr.ownerType,
      keyResults: okr.keyResults.map((kr) => ({
        id: kr.id,
        title: kr.title,
        description: kr.description,
        metricType: kr.metricType,
        startValue: kr.startValue,
        targetValue: kr.targetValue,
        currentValue: kr.currentValue,
        unit: kr.unit,
        status: kr.status,
        weight: kr.weight,
        order: kr.order,
        linkedKpiId: kr.linkedKpiId,
        linkedActionPlanId: kr.linkedActionPlanId,
      })),
      progress: okr.progress,
      status: okr.status,
      organizationId: okr.organizationId,
      branchId: okr.branchId,
      createdBy: okr.createdBy,
      createdAt: okr.createdAt,
      updatedAt: okr.updatedAt,
    }));

    return NextResponse.json({ okrs: okrDtos });
  } catch (error) {
    // Propagate auth errors (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('[GET /api/strategic/okrs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OKRs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = createOkrSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validated = validation.data;

    // Get tenant context (multi-tenancy)
    const tenantCtx = await getTenantContext();

    // Create OKR Domain Entity
    const okrResult = OKR.create({
      title: validated.title,
      description: validated.description,
      level: validated.level,
      parentId: validated.parentId,
      periodType: validated.periodType,
      periodLabel: validated.periodLabel,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      ownerId: validated.ownerId,
      ownerName: validated.ownerName,
      ownerType: validated.ownerType,
      organizationId: tenantCtx.organizationId,
      branchId: tenantCtx.branchId,
      createdBy: tenantCtx.userId,
    });

    if (Result.isFail(okrResult)) {
      return NextResponse.json(
        { error: okrResult.error },
        { status: 400 }
      );
    }

    const okr = okrResult.value;

    // Save via Repository
    const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);
    const saveResult = await repository.save(okr);

    if (Result.isFail(saveResult)) {
      return NextResponse.json(
        { error: saveResult.error },
        { status: 500 }
      );
    }

    // Return created OKR
    return NextResponse.json(
      {
        id: okr.id,
        title: okr.title,
        description: okr.description,
        level: okr.level,
        parentId: okr.parentId,
        periodType: okr.periodType,
        periodLabel: okr.periodLabel,
        startDate: okr.startDate,
        endDate: okr.endDate,
        ownerId: okr.ownerId,
        ownerName: okr.ownerName,
        ownerType: okr.ownerType,
        keyResults: [],
        progress: okr.progress,
        status: okr.status,
        organizationId: okr.organizationId,
        branchId: okr.branchId,
        createdBy: okr.createdBy,
        createdAt: okr.createdAt,
        updatedAt: okr.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    // Propagate auth errors (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('[POST /api/strategic/okrs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create OKR' },
      { status: 500 }
    );
  }
}
