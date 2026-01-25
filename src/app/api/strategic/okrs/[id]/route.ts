/**
 * API Routes: /api/strategic/okrs/[id]
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ S1.1 Batch 3 Phase 2: Schemas
const idParamSchema = z.object({
  id: z.string().min(1, 'ID do OKR é obrigatório'),
});

const updateOkrSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  level: z.enum(['corporate', 'department', 'team', 'individual']).optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
});

// Import shared store from main route (in real app, this would be a database)
// For this mock, we'll use a simple in-memory store
const okrsStore = new Map<string, Record<string, unknown>>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  
  // ✅ S1.1 Batch 3 Phase 2: Validate ID
  const validation = idParamSchema.safeParse(resolvedParams);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  
  const { id } = validation.data;

  // Fetch from main store or return mock data
  const response = await fetch(
    new URL('/api/strategic/okrs', request.url).toString()
  );
  const { okrs } = await response.json();
  const okr = okrs.find((o: Record<string, unknown>) => o.id === id);

  if (!okr) {
    return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
  }

  return NextResponse.json(okr);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  
  // ✅ S1.1 Batch 3 Phase 2: Validate ID
  const idValidation = idParamSchema.safeParse(resolvedParams);
  if (!idValidation.success) {
    return NextResponse.json(
      { error: 'ID inválido', details: idValidation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  
  const { id } = idValidation.data;

  try {
    const body = await request.json();
    
    // ✅ S1.1 Batch 3 Phase 2: Validate body
    const validation = updateOkrSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get existing OKR
    const response = await fetch(
      new URL('/api/strategic/okrs', request.url).toString()
    );
    const { okrs } = await response.json();
    const existingOKR = okrs.find((o: Record<string, unknown>) => o.id === id);

    if (!existingOKR) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    // Update OKR
    const updatedOKR = {
      ...existingOKR,
      ...body,
      updatedAt: new Date(),
    };

    // In real implementation, save to database
    okrsStore.set(id, updatedOKR);

    return NextResponse.json(updatedOKR);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating OKR:', error);
    return NextResponse.json({ error: 'Failed to update OKR' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  
  // ✅ S1.1 Batch 3 Phase 2: Validate ID
  const validation = idParamSchema.safeParse(resolvedParams);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  
  const { id } = validation.data;

  // In real implementation, delete from database
  okrsStore.delete(id);

  return NextResponse.json({ success: true });
}
