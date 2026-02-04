/**
 * API Routes: /api/strategic/okrs/[id]
 * 
 * ⚠️ BUG-002: Store centralizado para evitar fetch interno (erro SSL)
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOkrById } from '@/lib/okrs/mock-store';

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

  // Buscar OKR do store centralizado (sem fetch interno)
  const okr = getOkrById(id);

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

    // Atualizar OKR no store centralizado
    // ✅ SECURITY: Usar validation.data (validado) ao invés de body (bruto)
    const { updateOkr } = await import('@/lib/okrs/mock-store');
    const updatedOKR = updateOkr(id, validation.data);

    if (!updatedOKR) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

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

  // Deletar OKR do store centralizado
  const { deleteOkr } = await import('@/lib/okrs/mock-store');
  const success = deleteOkr(id);

  if (!success) {
    return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
