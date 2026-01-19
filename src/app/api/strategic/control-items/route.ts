/**
 * API Routes: /api/strategic/control-items
 * CRUD de Itens de Controle (GEROT)
 * 
 * @module app/api/strategic
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { ControlItem } from '@/modules/strategic/domain/entities/ControlItem';

const createControlItemSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  processArea: z.string().min(1).max(100),
  responsibleUserId: z.string().uuid(),
  measurementFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']),
  unit: z.string().min(1).max(20),
  targetValue: z.number(),
  upperLimit: z.number(),
  lowerLimit: z.number(),
  kpiId: z.string().uuid().optional(),
});

// GET /api/strategic/control-items
export async function GET(request: NextRequest) {
  try {
    await getTenantContext(); // Validates auth

    const { searchParams } = new URL(request.url);
    const processArea = searchParams.get('processArea') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    // TODO: Implementar DrizzleControlItemRepository
    // Por enquanto, retorna lista vazia
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      pageSize,
      filters: { processArea, status },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/control-items error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/control-items
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createControlItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Criar entity
    const controlItemResult = ControlItem.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      code: validation.data.code,
      name: validation.data.name,
      description: validation.data.description,
      processArea: validation.data.processArea,
      responsibleUserId: validation.data.responsibleUserId,
      measurementFrequency: validation.data.measurementFrequency,
      unit: validation.data.unit,
      targetValue: validation.data.targetValue,
      upperLimit: validation.data.upperLimit,
      lowerLimit: validation.data.lowerLimit,
      kpiId: validation.data.kpiId,
      createdBy: context.userId,
    });

    if (Result.isFail(controlItemResult)) {
      return NextResponse.json({ error: controlItemResult.error }, { status: 400 });
    }

    // TODO: Persistir via repository
    const entity = controlItemResult.value;

    return NextResponse.json({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      message: 'Item de controle criado',
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/control-items error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
