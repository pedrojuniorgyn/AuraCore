/**
 * API: GET/PUT/DELETE /api/strategic/templates/[id]
 * Operações em template específico
 * 
 * @module app/api/strategic/templates/[id]
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Buscar template do banco
    // const template = await templateRepository.findById(id);

    console.log('Getting template:', id);

    return NextResponse.json({
      template: null, // TODO: retornar template real
    });
  } catch (error) {
    console.error('GET /api/strategic/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await request.json();

    // TODO: Atualizar template no banco
    // await templateRepository.update(id, updates);

    console.log('Updating template:', id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/strategic/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Deletar template do banco
    // await templateRepository.delete(id);

    console.log('Deleting template:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/strategic/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
